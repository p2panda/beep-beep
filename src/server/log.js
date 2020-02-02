class Log {
  constructor(key) {
    this.key = key;
    this.messages = [];
  }

  append(id, type, text, seqNum, timestamp = Date.now()) {
    const message = {
      id,
      seqNum: seqNum ? seqNum : this.size(),
      text,
      type
    };

    this.messages.push({
      message,
      timestamp
    });
  }

  getAll() {
    return this.messages;
  }

  get(seqNum) {
    if (seqNum > this.size()) {
      throw new Error('Message with SeqNum not found');
    }

    return this.messages[seqNum];
  }

  size() {
    return this.messages.length;
  }
}

module.exports = Log;
