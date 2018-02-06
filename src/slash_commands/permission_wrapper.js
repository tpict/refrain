const utils = require('../utils');
const logger = require('../logger');
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

// This shouldn't be necessary but is useful for testing.
async function hasActivePlaylist() {
  if (process.env.NODE_ENV !== 'production' && !await Playlist.getActive()) {
    logger.error('No active playlist found. Please report this.');
    throw 'For some reason, there\'s no active playlist. Try starting one with `/listplaylists.`';
  }
}

module.exports = {
  needsPower(req, res, next) {
    if (on) {
      next();
    } else {
      res.send(utils.slackAt(req, 'The jukebox is off!'));
    }
  },

  async needsActive(req, res, next) {
    const activeUser = await User.getActive();
    if (req.body.user_id === activeUser.slackID) {
      next();
    } else {
      res.send(utils.slackAt(req, 'Only the active user may do that.'));
    }
  },

  async needsSetup(req, res, next) {
    try {
      await Promise.all([hasUsers(), hasPlaylists(), hasActivePlaylist()]);
      next();
    } catch (err) {
      res.send(utils.slackAt(req, err));
    }
  },

  setOn() {
    on = true;
  },

  setOff() {
    on = false;
  }
};
