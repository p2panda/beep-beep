// To proof this basic system we only use a very naive
// replication method and a local-network discovery
// strategy via mDNS.
//
// All of this does not take any security into
// consideration, like verifying signatures, limiting
// requests and protecting against DDoS attacks,
// transport encryption, invalid data schemas and so on.
//
// SSB has something called "invite codes" for giving
// clients permission to host their data on a node. There
// could be node implementations which only replicate
// their data with explicitly named nodes which this
// instance followed (as in the fediverse), or limit
// the number of clients to only a few, or do something
// similar as SSB with their "invite codes".
//
// Nodes should also be able to be interested in
// different topics, handle different sorts of data
// schemas depending on their purposes.
//
// Interesting projects:
// * https://github.com/AljoschaMeyer/bamboo-point2point
// * https://datprotocol.github.io/how-dat-works/#exchanging-data
// * https://ssbc.github.io/scuttlebutt-protocol-guide
// * https://www.w3.org/TR/activitypub/#server-to-server-interactions
// * https://github.com/arj03/ssb-browser-core
// * https://docs.rs/libp2p-kad/0.15.0/libp2p_kad/index.html

const discovery = require('dns-discovery');
const fetch = require('isomorphic-fetch');

const Log = require('./log');

const DISCOVERY_NAME = 'beep-beep';

class Network {
  constructor(database) {
    this.database = database;
    this.discovery = discovery();

    this.peers = {};
    this.counter = 0;

    this.lockedPeers = {};
    this.lockedKeys = {};
  }

  findPeers(port) {
    // Find other peers interested in the same thing as
    // us on your local network
    this.discovery.on('peer', (name, peer) => {
      if (name !== DISCOVERY_NAME) {
        return;
      }

      const { port, host } = peer;

      const exists = Object.keys(this.peers).find(id => {
        return this.peers[id].port === port && this.peers[id].host === host;
      });

      if (exists) {
        return;
      }

      this.counter += 1;

      const id = this.counter;

      this.peers[id] = {
        host,
        id,
        port
      };

      console.log(`Found peer #${id} (host=${host}, port=${port})`);
    });

    // Announce that we exist!
    this.discovery.announce(DISCOVERY_NAME, port);
  }

  replicateWithAllPeers() {
    // Go through all peers and see if we can get any
    // new data from them we don't have yet
    return Object.keys(this.peers)
      .reduce((acc, id) => {
        return acc.then(this.replicateWithPeer(this.peers[id]));
      }, Promise.resolve())
      .then(() => {
        this.lockedKeys = {};
      });
  }

  // This replication strategy is realtively simple: Get
  // all logs from all known peers and copy everything we
  // don't have yet into our database. We can do this a
  // little bit more efficiently by only copying the
  // messages we don't have yet.
  //
  // Surely this is not the best way to do this but it
  // serves the purpose for now.
  replicateWithPeer({ id, host, port, isLocked }) {
    if (id in this.lockedPeers) {
      return;
    }

    this.lockedPeers[id] = true;

    // We use the same HTTP API as the clients for server
    // to server communication
    fetch(`http://${host}:${port}/api/logs`)
      .then(response => {
        return response.json();
      })
      .then(logs => {
        return logs.reduce((acc, remoteLog) => {
          if (remoteLog.key in this.lockedKeys) {
            return acc;
          }

          if (!this.database.exists(remoteLog.key)) {
            this.database.set(remoteLog.key, new Log(remoteLog.key));

            acc.push({
              key: remoteLog.key,
              from: 0,
              to: remoteLog.size
            });

            console.log(
              `New log %${remoteLog.key} (localSize=0, remoteSize=${remoteLog.size})`
            );

            return acc;
          }

          const localLog = this.database.get(remoteLog.key);

          if (localLog.size() < remoteLog.size) {
            acc.push({
              key: remoteLog.key,
              from: localLog.size(),
              to: remoteLog.size
            });

            console.log(
              `Updated log %${
                remoteLog.key
              } (localSize=${localLog.size()}, remoteSize=${remoteLog.size})`
            );
          }

          return acc;
        }, []);
      })
      .then(requests => {
        return Promise.all(
          requests.map(request => {
            if (request.key in this.lockedKeys) {
              console.log('locked', request.key);
              return Promise.resolve();
            }

            this.lockedKeys[request.key] = true;

            const { key, from, to } = request;
            return this.replicateLog(id, key, from, to);
          })
        );
      })
      .catch(error => {
        console.log(`Disconnect peer #${id}`);
        delete this.peers[id];
      })
      .finally(() => {
        delete this.lockedPeers[id];
      });
  }

  replicateLog(id, key, from, to) {
    const { host, port } = this.peers[id];
    const log = this.database.get(key);

    const makeRequest = seqNum => {
      if (!(id in this.peers)) {
        return Promise.resolve();
      }

      return fetch(`http://${host}:${port}/api/logs/${key}/${seqNum}`)
        .then(response => {
          return response.json();
        })
        .then(({ timestamp, message }) => {
          const { id, type, text } = message;
          log.append(id, type, text, seqNum, timestamp);
        })
        .catch(error => {
          console.error(`Could not fetch message ${seqNum} from %${key}`);
          return Promise.resolve();
        });
    };

    const tasks = [];

    for (let i = from; i < to; i += 1) {
      tasks.push(i);
    }

    return tasks
      .reduce((acc, seqNum) => {
        return acc.then(makeRequest(seqNum));
      }, Promise.resolve())
      .then(() => {
        console.log(`Replicated ${tasks.length} messages from %${key}`);
      })
      .catch(() => {
        return Promise.resolve();
      });
  }
}

module.exports = Network;
