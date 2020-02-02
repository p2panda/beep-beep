const express = require('express');

class API {
  constructor(node) {
    const router = express.Router();

    router.get('/logs', (req, res) => {
      const data = node.logs.getAll();
      res.json(data);
    });

    router.get('/logs/:key', (req, res) => {
      const key = req.params.key;

      try {
        const data = node.logs.get(key);
        res.json(data);
      } catch {
        res.status(404).end();
      }
    });

    router.get('/logs/:key/:seqNum', (req, res) => {
      const { key, seqNum } = req.params;

      try {
        const data = node.logs.getMessage(key, seqNum);
        res.json(data);
      } catch {
        res.status(404).end();
      }
    });

    router.post('/logs/:key', (req, res) => {
      const key = req.params.key;
      const message = req.body;
      node.logs.append(key, message);
      res.status(201).json(message);
    });

    router.get('/query/:type', (req, res) => {
      const type = req.params.type;
      res.json(node.query.findAll(type));
    });

    router.get('/query/:type/:id', (req, res) => {
      const { type, id } = req.params;

      try {
        res.json(node.query.find(type, id));
      } catch {
        res.status(404).end();
      }
    });

    return router;
  }
}

module.exports = API;
