const utils = require('../utils');
const User = require('../models/user');

module.exports = async function commandeer(req, res) {
  const userID = req.body.user_id;
  const user = await User.findOne({ slackID: userID });
  if (!user) {
    utils.respond(
      req,
      res,
      'You\'re not authenticated with Spotify. Try `/spotifyauth` if you\'d like to get set up',
      req
    );
    return;
  }

  user.setActive();
  utils.respond(req, res, 'You are now the active user!');
};
