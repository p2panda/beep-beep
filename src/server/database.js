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
