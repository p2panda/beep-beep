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
    // Clear chat view
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

  // Start frequent update process to sync with
  // home instance
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
