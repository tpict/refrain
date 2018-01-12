const storage = require('node-persist');

const utils = require('./utils');
const store = require('./store');

// Slash commands for Slack.
module.exports = (webClient, spotifyApi) => ({
  on: true,

  // Commands which require the jukebox to be switched on.
  requireOn: [
    'playplaylist',
    'playme',
    'findme',
    'pauseme',
    'shuffle',
    'whomst',
    'eradicate',
    'next'
  ],

});
