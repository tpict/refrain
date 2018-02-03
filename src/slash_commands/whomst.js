const Playlist = require('../models/playlist');
const User = require('../models/user');
const utils = require('../utils');
const { wrapper } = require('./permission_wrapper');
const logger = require('../logger');

module.exports = wrapper(async function whomst(req) {
  const activeUser = await User.getActive();
  const spotifyApi = await activeUser.getSpotifyApi();

  let data = {};

  try {
    data = await spotifyApi.getMyCurrentPlayingTrack();
  } catch (err) {
    logger.error('Error getting current track for /whomst: ' + err);
    throw err;
  }

  const track = data.body.item;
  if (!track) {
    return utils.slackAt(
      req,
      'Are you hearing things? If so, check that `/whichuser` matches the user signed in to Spotify.'
    );
  }

  const name = track.name;
  const artist = track.artists[0].name;

  const playlist = await Playlist.getActive();
  await playlist
    .populate({
      path: 'tracks',
      match: { spotifyID: track.id }
    })
    .execPopulate();

  if (playlist.tracks.length) {
    return utils.slackAt(
      req,
      `${utils.formatSong(name, artist)} was last requested by <@${
        playlist.tracks[0].requestedBy
      }>`
    );
  }

  return utils.slackAt(
    req,
    `${utils.formatSong(
      name,
      artist
    )} was added directly through Spotify :thumbsdown:`
  );
});
