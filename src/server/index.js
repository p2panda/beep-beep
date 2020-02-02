const path = require('path');

const bodyParser = require('body-parser');
const express = require('express');

const API = require('./api');
const Node = require('./node');

const node = new Node();
const api = new API(node);

const app = express();
app.use(bodyParser.json());

app.use('/', express.static(path.join(__dirname, '..', 'client')));
app.use('/api', api);

const server = app.listen(0, () => {
  const { port } = server.address();

  node.start(port);

  console.log(`Server started on port http://localhost:${port}`);
});
