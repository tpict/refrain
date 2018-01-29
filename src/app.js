require('dotenv').config();

const bodyParser = require('body-parser');
const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

require('./slack_auth')(app);
require('./spotify_auth')(app);
require('./slash_commands/index')(app);
require('./interactive/index')(app);

const uristring = process.env.MONGODB_URI;
mongoose.connect(uristring, function (err, res) {
  if (err) {
    console.log('Error connecting to ' + uristring + ': ' + err);
  } else {
    console.log('Successfully connected to ' + uristring);
  }
});

app.listen(4390, () => console.log('Refrain listening on port 4390!'));

module.exports = app;
