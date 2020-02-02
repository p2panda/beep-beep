// Welcome! beep-beep is a very basic proof-of-concept
// networking system for p2p applications.
//
// What I wanted to try is ..
//
// * Servers are the actual nodes of this network,
//   they handle discovery of other nodes and
//   replicate / synchronize data with them.
//   Clients are "consumers" of server data with
//   a simple API (maybe GraphQL?).
// * The systems allows both federated or
//   "fully" decentralized setups or hybrids of both
//   worlds. It is up to the users to decide how they
//   want to participate in the network. They can
//   choose a client which uses a "home server" to
//   get their data from or a full-stack setup
//   where the server lives on the same machine as
//   the client.
// * Identities are symmetric keypairs stored inside
//   the clients. The keys are used to sign messages
//   in the clients which are then sent to and stored
//   in an append-only-log data structure in the
//   servers database. Through verification methods we
//   can make sure sent messages belong to one log.
// * This setup allows clients in the browser without
//   any need to install a server or heavy cryptographic
//   hashing inside the client.
// * There is a protocol for server-server and
//   server-client communication. Similar to ActivityPub.
//
// Let's start!

const path = require('path');

const bodyParser = require('body-parser');
const express = require('express');

const API = require('./api');
const Node = require('./node');

// Create a server Node, which is the actual
// participant in the p2p network:
const node = new Node();

// Start a simple HTTP server which hosts the
// static-page client (this is not a requirement,
// you could host the client anywhere) and create
// the API routes which give us a simple interface
// to post new messages or query the database for data
// we want to display to the user.
const app = express();
app.use(bodyParser.json());

app.use('/', express.static(path.join(__dirname, '..', 'client')));
app.use('/api', new API(node));

// The port is 0 as we just take any free port on your
// machine. This allows you to easily start multiple
// nodes for testing.
const server = app.listen(0, () => {
  // Get the choosen port ..
  const { port } = server.address();

  // .. and start to announce it in the network
  node.start(port);

  console.log(`Server started on port http://localhost:${port}`);
});
