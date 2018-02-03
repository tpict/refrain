require('dotenv').config();

const bodyParser = require('body-parser');
const express = require('express');
const mongoose = require('mongoose');

const logger = require('./logger');

const app = function () {
  let app = express();
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));

  require('./slack_auth')(app);
  require('./spotify_auth')(app);
  require('./slash_commands/index')(app);
  require('./interactive/index')(app);

  const uristring = process.env.MONGODB_URI;
  mongoose.connect(uristring, function (err) {
    if (err) {
      logger.info('Error connecting to ' + uristring + ': ' + err);
      process.exit(1);
    } else {
      logger.info('Successfully connected to ' + uristring);
    }
  });

  return app;
}();

if (!module.parent) {
  app.listen(4390, () => logger.info('Refrain listening on port 4390!'));
}

module.exports = app;
