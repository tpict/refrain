require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const storage = require('node-persist');

storage.initSync();

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

require('./slack_auth')(app);
require('./spotify_auth')(app);
require('./slash_commands/index')(app);
require('./interactive/index')(app);

app.listen(4390, () => console.log('Pebble DJ listening on port 4390!'));

module.exports = app;
