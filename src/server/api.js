// This is the interface to communicate with other servers and clients. It
// could be interesting to look into Activity Pub here?
//
// What I generally like is a very common way of accessing a servers data (REST
// style) without complicated protocols.
//
// Interesting Projects:
// * https://www.w3.org/TR/activitypub/
// * https://github.com/pietgeursen/bamboo-rest-api
// * https://github.com/pietgeursen/bamboo-rs
const express = require('express');

class API {
  constructor(node) {
    const router = express.Router();

    // Basic routes to get all logs or a particular one
    // or a particular message from it:
    router.get('/logs', (req, res) => {
      const data = node.getAllLogs();
      res.json(data);
    });

    router.get('/logs/:key', (req, res) => {
      const key = req.params.key;

      try {
        const data = node.getLog(key);
        res.json(data);
      } catch {
        res.status(404).end();
      }
    });

    router.get('/logs/:key/:seqNum', (req, res) => {
      const { key, seqNum } = req.params;

      try {
        const data = node.getLogMessage(key, seqNum);
        res.json(data);
      } catch {
        res.status(404).end();
      }
    });

    // Clients can use this route to append new messages to their logs. We
    // don't do any checks here right now but one could imagine verification
    // methods to really check if this message was properly signed and can be
    // added to the regarding log.
    //
    // One would need to think about a good way to prevent accidential branches
    // of ones log (this could happen if you change the endpoint of your
    // client, suddenly the network would contain two different logs with the
    // same key ..). This can already happen in SSB and every other similar
    // system and maybe there are ways to have a good protocol for choosing
    // your home-server? The only place where your log can live and be changed?
    //
    // Also one could think of a nice way to migrate a log to another node /
    // home-server. The Fediverse has some interesting approaches here as well.
    router.post('/logs/:key', (req, res) => {
      const key = req.params.key;
      const message = req.body;
      node.appendToLog(key, message);
      res.status(201).json(message);
    });

    // These endpoints give rather simple data queries from our database view
    // but we could also think about a nice GraphQL endpoint here.
    router.get('/query/:type', (req, res) => {
      const type = req.params.type;
      res.json(node.findAll(type));
    });

    router.get('/query/:type/:id', (req, res) => {
      const { type, id } = req.params;

      try {
        res.json(node.find(type, id));
      } catch {
        res.status(404).end();
      }
    });

    return router;
  }
}

module.exports = API;
