const store = require('../store');
const utils = require('../utils');

module.exports = function whichuser(req, res) {
  const activeUser = store.getActiveUserName();
  const message = activeUser
    ? `The active user is <@${activeUser}>`
    : 'No authenticated users yet. Use `/spotifyauth` to get started.';
  utils.respond(req, res, message);
};
