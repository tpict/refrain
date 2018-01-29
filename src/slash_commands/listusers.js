const User = require('../models/user');
const utils = require('../utils');

module.exports = async function listusers(req, res) {
  const userIDList = await User.find({}).select('-_id slackID');
  const formattedUserIDList = userIDList.map(obj => obj.slackID).join('\n');
  let message = `Authenticated users:\n${formattedUserIDList}`;

  if (userIDList.length === 0) {
    message =
      'No users have been authenticated yet! Try `/spotifyauth` to register yourself.';
  }

  utils.respond(req, res, message);
};
