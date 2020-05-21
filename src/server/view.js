// The database view methods are a very naively implemented way to give
// "materialized views" on all the append-only-logs the Node knows of.
//
// Its some sort of cached layer between the API and the database, to faster
// query information from the logs as it takes time to go through all of them.
//
// As logs grow sequentially the view only has to look at the latest messages
// it has not checked before.
//
// Also one could think of an log where data can be deleted (see bamboo), but
// the view still holds the needed knowledge / local state.
//
// Ideally the view data would not live in memory as it does now, but would
// also be stored in a database.
//
// Interesting projects:
// * https://github.com/graphprotocol/graph-node
// * https://github.com/sunrise-choir/ssb-patchql

class View {
  constructor(database) {
    this.database = database;

    this.lastSeqNums = {};
    this.views = {};
  }

  updateAll() {
    // Go through all known logs from the database and update our views on them
    this.database.keys().forEach(key => {
      this.update(key);
    });
  }

  update(key) {
    // Get the log from the database
    const log = this.database.get(key);

    // Set the last checked sequence number if we haven't done this yet for
    // this log
    if (!(key in this.lastSeqNums)) {
      this.lastSeqNums[key] = -1;
    }

    // Check if there are any updates we haven't processed yet (did the log
    // grow since last?)
    const lastSeqNum = this.lastSeqNums[key];
    const dirty = log.size() - 1 > lastSeqNum;

    if (!dirty) {
      // Nothing to do for us .. :-)
      return;
    }

    // Go through all the so far unseen log messages and update the state of
    // the views
    log
      .getAll()
      .slice(Math.max(0, lastSeqNum), log.size())
      .forEach(({ message, timestamp }) => {
        // Every message in the log contains a resource type and a resource id
        const { id, type, text, seqNum } = message;

        // Create a namespace for the particular resource this message adresses
        if (!(type in this.views)) {
          this.views[type] = {};
        }

        if (!(id in this.views[type])) {
          this.views[type][id] = {};
        }

        // .. and store its current value there
        this.views[type][id] = {
          key,
          message,
          timestamp
        };

        // Update the sequence number for future checks
        this.lastSeqNums[key] = seqNum;
      });
  }

  // These following methods are our queries we can use to get data from our
  // current view. One could imagine more complex queries here, like ordering,
  // limiting or filtering (ala SQL or GraphQL).
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
