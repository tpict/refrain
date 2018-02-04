const User = require('../models/user');
const utils = require('../utils');

module.exports = async function whichuser(req) {
  const activeUser = await User.getActive();
  const message = activeUser
    ? `The active user is <@${activeUser.slackID}>`
    : 'No authenticated users yet. Use `/spotifyauth` to get started.';
  return utils.slackAt(req, message);
};
