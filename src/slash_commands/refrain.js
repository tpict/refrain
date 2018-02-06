const Playlist = require('../models/playlist');
const User = require('../models/user');
const utils = require('../utils');
const { setOn, setOff } = require('./permission_wrapper');
const logger = require('../logger');

async function setOnAndPlay(spotifyApi, req) {
  const playlist = await Playlist.getActive();

  if (!playlist) {
    setOn();
    return utils.slackAt(
      req,
      'Switched on. Add a playlist with `/addplaylist` to get started.'
    );
  }

  const playlistURI = playlist.uri;

  try {
    await spotifyApi.play({ context_uri: playlistURI });
    setOn();
    return utils.slackAt(
      req,
      'It begins...\nIf you can\'t hear anything, play any track in the Spotify client and try again.'
    );
  } catch (err) {
    logger.error('Error playing music for /refrain: ' + (err.stack || err));
    throw err;
  }
}

async function setOffAndPause(spotifyApi) {
  setOff();

  try {
    await spotifyApi.pause();
    return utils.inChannel(
      '_If music be the food of love, play on._ - Shakespeare\nSwitching off.'
    );
  } catch (err) {
    logger.error('Error pausing music for /refrain: ' + (err.stack || err));
    throw err;
  }
}

module.exports = async function refrain(req) {
  const command = req.body.text.toLowerCase();

  const incomingUserID = req.body.user_id;
  const activeUser = await User.getActive();
  const spotifyApi = await activeUser.getSpotifyApi();

  if (activeUser.slackID != incomingUserID) {
    return utils.slackAt(req, 'Only the active user may do that.');
  }

  if (command === 'on') {
    return setOnAndPlay(spotifyApi, req);
  } else if (command === 'off') {
    return setOffAndPause(spotifyApi);
  }
};
