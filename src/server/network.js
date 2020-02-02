const discovery = require('dns-discovery');
const fetch = require('isomorphic-fetch');

const Log = require('./log');

const DISCOVERY_NAME = 'beep-beep';

class Network {
  constructor(database) {
    this.database = database;
    this.discovery = discovery();

    this.peers = {};
    this.lockedPeers = {};
    this.lockedKeys = {};
    this.counter = 0;
  }

  start(port) {
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

    this.discovery.announce(DISCOVERY_NAME, port);
  }

  updateAll() {
    return Object.keys(this.peers)
      .reduce((acc, id) => {
        return acc.then(this.replicateAll(this.peers[id]));
      }, Promise.resolve())
      .then(() => {
        this.lockedKeys = {};
      });
  }

  replicate(id, key, from, to) {
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

  replicateAll({ id, host, port, isLocked }) {
    if (id in this.lockedPeers) {
      return;
    }

    this.lockedPeers[id] = true;

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
            return this.replicate(id, key, from, to);
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
}

module.exports = Network;
