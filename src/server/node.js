const Database = require('./database');
const Log = require('./log');
const Network = require('./network');
const View = require('./view');

const UPDATE_INTERVAL = 500;

class NodeLogs {
  constructor(node) {
    this.database = node.database;
  }

  exists(key) {
    return this.database.exists(key);
  }

  getAll() {
    return this.database.keys().map(key => {
      const log = this.database.get(key);

      return {
        key,
        size: log.size()
      };
    });
  }

  get(key) {
    return this.database.get(key);
  }

  getMessage(key, seqNum) {
    const log = this.database.get(key);
    return log.get(seqNum);
  }

  append(key, message) {
    const { id, type, text } = message;

    if (!this.database.exists(key)) {
      this.database.set(key, new Log(key));
    }

    const log = this.database.get(key);
    log.append(id, type, text);

    console.log('append', key, message, log.size());
  }
}

class NodeQuery {
  constructor(node) {
    this.view = node.view;
  }

  find(type, id) {
    return this.view.find(type, id);
  }

  findAll(type) {
    return this.view.findAll(type);
  }
}

class Node {
  constructor() {
    this.database = new Database();
    this.network = new Network(this.database);
    this.view = new View(this.database);

    this.logs = new NodeLogs(this);
    this.query = new NodeQuery(this);
  }

  start(port) {
    this.network.start(port);

    setInterval(() => {
      this.network.updateAll();
      this.view.updateAll();
    }, UPDATE_INTERVAL);
  }
}

module.exports = Node;
