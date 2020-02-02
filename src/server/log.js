// This should be an append-only-log but right now it
// is a very lazy implementation without any verification
// of whatsoever.
//
// Interesting projects:
// * https://github.com/AljoschaMeyer/bamboo
// * https://github.com/pietgeursen/bamboo-rs

class Log {
  constructor(key) {
    this.key = key;
    this.messages = [];
  }

  append(id, type, text, seqNum, timestamp = Date.now()) {
    // We don't really do any validations or checks
    // against any message schema here and the current
    // format is realtively poor, but it serves its
    // purpose for this demonstration:
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
