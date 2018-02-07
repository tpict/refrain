const utils = require('../utils');
const Playlist = require('../models/playlist');
const User = require('../models/user');

let on = true;

async function hasUsers() {
  if ((await User.count({})) === 0) {
    throw 'No users have been authenticated yet! Try `/spotifyauth` to register yourself.';
  }
}

async function hasPlaylists() {
  if ((await Playlist.count({})) === 0) {
    throw 'There are no configured playlists. Try `/addplaylist` to get started.';
  }
}

module.exports = {
  needsPower(req) {
    if (!on) {
      return utils.slackAt(req, 'The jukebox is off!');
    }
  },

  async needsActive(req) {
    const activeUser = await User.getActive();
    if (req.body.user_id !== activeUser.slackID) {
      return utils.slackAt(req, 'Only the active user may do that.');
    }
  },

  async needsSetup(req) {
    try {
      await Promise.all([hasUsers(), hasPlaylists()]);
    } catch (err) {
      return utils.slackAt(req, err);
    }
  },

  setOn() {
    on = true;
  },

  setOff() {
    on = false;
  }
};
