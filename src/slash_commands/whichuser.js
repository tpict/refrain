const User = require('../models/user');
const utils = require('../utils');

module.exports = async function whichuser(req, res) {
  const activeUser = await User.getActive();
  const message = activeUser
    ? `The active user is <@${activeUser.slackID}>`
    : 'No authenticated users yet. Use `/spotifyauth` to get started.';
  utils.respond(req, res, message);
};
