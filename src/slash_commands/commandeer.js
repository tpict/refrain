const utils = require('../utils');
const User = require('../models/user');

module.exports = async function commandeer(req) {
  const userID = req.body.user_id;
  const user = await User.findOne({ slackID: userID });

  let message =
    'You\'re not authenticated with Spotify. Try `/spotifyauth` if you\'d like to get set up.';

  if (user) {
    message = 'You are now the active user!';
    user.setActive();
  }

  return utils.slackAt(req, message);
};
