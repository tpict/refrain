const Playlist = require('../models/playlist');
const Track = require('../models/track');
const User = require('../models/user');
const utils = require('../utils');
const logger = require('../logger');

module.exports = async function find_track(payload) {
  const userID = payload.user.id;
  const channelID = payload.channel.id;
  const action = payload.actions[0];

  const playlist = await Playlist.getActive();
  const activeUser = await User.getActive();

  const spotifyApi = await activeUser.getSpotifyApi();
  const webClient = utils.getWebClient();

  const trackData = JSON.parse(action.value);
  const track = new Track({
    spotifyID: trackData.id,
    requestedBy: userID,
    artist: trackData.artists[0].name,
    title: trackData.name
  });

  if (action.name === 'play') {
    spotifyApi.refrain
      .playAndAddTrack(track, playlist)
      .then(() =>
        webClient.chat.postMessage(
          channelID,
          `Now playing ${track.formattedTitle}, as requested by <@${userID}>`
        )
      )
      .catch(err => {
        logger.error('Error playing track for /interactive play: ' + err);
        webClient.chat.postMessage(
          channelID,
          utils.getErrorMessage(err.statusCode)
        );
        throw err;
      });
  } else {
    spotifyApi.refrain
      .addAndStoreTrack(track, playlist)
      .then(() =>
        webClient.chat.postMessage(
          channelID,
          `<@${userID}> added ${track.formattedTitle} to *${playlist.name}*`
        )
      )
      .catch(err => {
        logger.error('Error queueing track for /interactive queue: ' + err);
        webClient.chat.postMessage(
          channelID,
          utils.getErrorMessage(err.statusCode)
        );
        throw err;
      });
  }

  return 'Just a moment...';
};
