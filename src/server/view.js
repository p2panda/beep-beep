class View {
  constructor(database) {
    this.database = database;
    this.lastSeqNums = {};
    this.views = {};
  }

  update(key) {
    const log = this.database.get(key);

    if (!(key in this.lastSeqNums)) {
      this.lastSeqNums[key] = -1;
    }

    const lastSeqNum = this.lastSeqNums[key];
    const dirty = log.size() - 1 > lastSeqNum;

    if (!dirty) {
      return;
    }

    log
      .getAll()
      .slice(Math.max(0, lastSeqNum), log.size())
      .forEach(({ message, timestamp }) => {
        const { id, type, text, seqNum } = message;

        if (!(type in this.views)) {
          this.views[type] = {};
        }

        if (!(id in this.views[type])) {
          this.views[type][id] = {};
        }

        this.views[type][id] = {
          key,
          message,
          timestamp
        };

        this.lastSeqNums[key] = seqNum;
      });
  }

  updateAll() {
    this.database.keys().forEach(key => {
      this.update(key);
    });
  }

  findAll(type) {
    if (!(type in this.views)) {
      return [];
    }

    return Object.keys(this.views[type]).map(id => {
      return this.views[type][id];
    });
  }

  find(type, id) {
    if (!(type in this.views) || !(id in this.views[type])) {
      throw new Error('Resource not found');
    }

    return this.views[type][id];
  }
}

module.exports = View;
