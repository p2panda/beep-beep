// This database is a simple in-memory key/value storage
// keeping all logs in place. It could basically be
// anything ..? PostgreSQL?

class Database {
  constructor() {
    this.logs = {};
  }

  exists(key) {
    return key in this.logs;
  }

  set(key, log) {
    this.logs[key] = log;
  }

  get(key) {
    if (!this.exists(key)) {
      throw new Error('Entry with key not found');
    }

    return this.logs[key];
  }

  keys() {
    return Object.keys(this.logs);
  }
}

module.exports = Database;
