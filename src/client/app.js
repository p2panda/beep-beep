// This is a very basic client example for this sort of system. The cool thing
// is: The keypair lives in the local storage of the browser. You could also
// think about more secure storage solutions in other client implementations.
//
// One could also easily "burn" accounts and create new ones for privacy
// reasons.
//
// With this architecture clients are relatively light as they don't require to
// take care of all the other parts of the protocol (replication, discovery,
// logs).
//
// Clients sign messages locally on their devices / in the browser with the
// stored keypair and send this to the server where the message gets verified
// and stored.
//
// We could also implement an E2EE message system where messages can't be read
// by neither node owners or other clients (see SSB private box 2
// implementation) by unpacking them in the client itself. This can be
// interesting for private message types like private events or private group
// chats.
//
// Interesting projects:
// * https://github.com/CirclesUBI/circles-baby-phoenix
// * https://github.com/ssbc/box2-spec

const ENTER_KEYNAME = 'Enter';

const ANONYMOUS_USER = '<anon>';
const REFRESH_RATE = 100;
const STORAGE_KEY = 'beep-beep-fake-id';

const TYPE_MESSAGES = 'messages';
const TYPE_USERNAMES = 'usernames';

const elements = [
  'chat',
  'key',
  'message',
  'messageSubmit',
  'username',
  'usernameSubmit'
].reduce((acc, id) => {
  acc[id] = document.getElementById(id);
  return acc;
}, {});

const state = {
  key: initializeKey(),
  users: {}
};

// Aha! In this example there is not even any real crypto happening! I was too
// lazy to add the actual generation of a asymmetric keypair but well, this
// also serves its purpose. Imagine this would be ed25519 here which allows us
// to generate an individual keypair and an hashed public address on every
// client without the need of a server.
function generateFakeHash(len = 64) {
  const buffer = new Uint8Array((len || 40) / 2);
  window.crypto.getRandomValues(buffer);

  return (
    '0x' +
    Array.from(buffer, decimal => {
      return ('0' + decimal.toString(16)).substr(-2);
    }).join('')
  );
}

// We store this fake "key" in the local storage of the browser. If you come
// back it will still know "who you are"
function initializeKey() {
  if (!window.localStorage.getItem(STORAGE_KEY)) {
    const key = generateFakeHash();
    window.localStorage.setItem(STORAGE_KEY, key);
  }

  return window.localStorage.getItem(STORAGE_KEY);
}

function request(path, options = {}) {
  const url = `/api/${path.join('/')}`;

  return window.fetch(url, options).then(response => {
    if (response.status >= 400) {
      throw new Error('Request error');
    }

    return response.json();
  });
}

function findAll(type) {
  return request(['query', type]);
}

function find(type, id) {
  return request(['query', type, id]);
}

function post(type, id, text) {
  const message = {
    id,
    text,
    type
  };

  return request(['logs', state.key], {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(message)
  });
}

function updateUsernames() {
  return findAll(TYPE_USERNAMES).then(data => {
    data.forEach(item => {
      state.users[item.key] = item.message.text;
    });
  });
}

function updateMessages() {
  return findAll(TYPE_MESSAGES).then(data => {
    // Clear chat view. Not elegant:
    elements.chat.innerHTML = '';

    // Add all messages to chat
    data
      .map(({ key, timestamp, message }) => {
        const elem = document.createElement('li');
        const username = key in state.users ? state.users[key] : ANONYMOUS_USER;

        elem.innerText = `@${username}: ${message.text}`;

        elements.chat.appendChild(elem);
      })
      .sort((itemA, itemB) => {
        return itemA.timestamp - itemB.timestamp;
      });
  });
}

function update() {
  return updateUsernames()
    .then(() => {
      return updateMessages();
    })
    .then(() => {
      // Scroll to bottom of chat
      elements.chat.scrollTop = elements.chat.scrollHeight;
    });
}

function setDisabled(ids, status) {
  ids.forEach(id => {
    elements[id].disabled = status;
  });
}

function sendMessage() {
  if (!elements.message.value) {
    return;
  }

  setDisabled(['message', 'messageSubmit'], true);

  const messageId = generateFakeHash();
  const messageText = elements.message.value;

  post(TYPE_MESSAGES, messageId, messageText).then(() => {
    elements.message.value = '';
    setDisabled(['message', 'messageSubmit'], false);
  });
}

function updateUsername() {
  if (!elements.username.value) {
    return;
  }

  setDisabled(['username', 'usernameSubmit'], true);

  // For our username we keep the same id and just use
  // our public key
  const messageId = state.key;
  const messageText = elements.username.value;

  post(TYPE_USERNAMES, messageId, messageText).then(() => {
    setDisabled(['username', 'usernameSubmit'], false);
  });
}

function initialize() {
  // Get our current username
  find('usernames', state.key)
    .then(data => {
      elements.username.value = data.message.text;
    })
    .catch(() => {
      // Ignore, we haven't set an username yet
    });

  // Show public key to user
  elements.key.value = state.key;

  // Start frequent update process to sync with home instance
  window.setInterval(() => {
    update();
  }, REFRESH_RATE);
}

elements.usernameSubmit.addEventListener('click', () => {
  updateUsername();
});

elements.username.addEventListener('keydown', event => {
  if (event.key === ENTER_KEYNAME) {
    updateUsername();
  }
});

elements.messageSubmit.addEventListener('click', () => {
  sendMessage();
});

elements.message.addEventListener('keydown', event => {
  if (event.key === ENTER_KEYNAME) {
    sendMessage();
  }
});

window.addEventListener('load', () => {
  initialize();
});
