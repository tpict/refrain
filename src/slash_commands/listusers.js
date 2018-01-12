const store = require('../store');
const utils = require('../utils');

module.exports = function listusers(req, res) {
  const userNames = Object.keys(store.getUsers());
  const formattedUserNames = userNames.join('\n');
  let message = `Authenticated users:\n${formattedUserNames}`;
  if (userNames.length === 0) {
    message =
      'No users have been authenticated yet! Try `/spotifyauth` to register yourself.';
  }

  utils.respond(req, res, message);
};
