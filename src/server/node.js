const Database = require('./database');
const Log = require('./log');
const Network = require('./network');
const View = require('./view');

const UPDATE_INTERVAL = 500;

class Node {
  constructor() {
    // The Node holds everything we need: a database
    // to store logs, a database view to query data from these logs and a networking methods to find other
    // peers and to get their logs.
    this.database = new Database();
    this.network = new Network(this.database);
    this.view = new View(this.database);
  }

  start(port) {
    // Start the process of finding other peers ..
    this.network.findPeers(port);

    // .. and frequently check if we can download data
    // from them + update our views on the current
    // database state
    setInterval(() => {
      this.network.replicateWithAllPeers();
      this.view.updateAll();
    }, UPDATE_INTERVAL);
  }

  // The node exposes some convenience methods to query
  // the database ..
  find(type, id) {
    return this.view.find(type, id);
  }

  findAll(type) {
    return this.view.findAll(type);
  }

  logExists(key) {
    return this.database.exists(key);
  }

  // .. and more methods to interact with the logs directly
  getAllLogs() {
    return this.database.keys().map(key => {
      const log = this.database.get(key);

      return {
        key,
        size: log.size()
      };
    });
  }

  getLog(key) {
    return this.database.get(key);
  }

  getLogMessage(key, seqNum) {
    const log = this.database.get(key);
    return log.get(seqNum);
  }

  appendToLog(key, message) {
    const { id, type, text } = message;

    if (!this.database.exists(key)) {
      this.database.set(key, new Log(key));
    }

    const log = this.database.get(key);
    log.append(id, type, text);

    console.log(`Append to log %${key}`, message);
  }
}

module.exports = Node;
