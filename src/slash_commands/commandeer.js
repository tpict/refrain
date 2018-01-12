const store = require('../store');
const utils = require('../utils');

module.exports = function commandeer(req, res) {
  const userName = req.body.user_name;
  const user = store.getUsers()[userName];
  if (!user) {
    utils.respond(
      req,
      res,
      'You\'re not authenticated with Spotify. Try `/spotifyauth` if you\'d like to get set up',
      req
    );
    return;
  }

  store.setActiveUser(userName);
  utils.respond(req, res, 'You are now the active user!');
};
