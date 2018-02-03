const User = require('../models/user');
const utils = require('../utils');
const { wrapper } = require('./permission_wrapper');
const logger = require('../logger');

async function performSkip(spotifyApi, req) {
  const webClient = utils.getWebClient();

  try {
    await spotifyApi.skipToNext();
  } catch (err) {
    logger.error('Error skipping current track for /next: ' + err);
    // TODO: Expose the generic error message function to use here
    return webClient.chat.postMessage(
      req.body.channel_id,
      'Spotify couldn\'t skip this track!'
    );
  }

  await utils.sleep(500);

  let nextTrackData = {};
  try {
    nextTrackData = await spotifyApi.getMyCurrentPlayingTrack();
  } catch (err) {
    logger.error('Error getting current track post-skip for /next: ' + err);
    // TODO: As above
    return webClient.chat.postMessage(
      req.body.channel_id,
      'Managed to skip, but Spotify wouldn\'t say what\'s playing now!'
    );
  }

  const track = nextTrackData.body.item;

  if (!track) {
    return webClient.chat.postMessage(
      req.body.channel_id,
      'Out of music! You might need to use `/playplaylist`.'
    );
  }

  const name = track.name;
  const artist = track.artists[0].name;

  webClient.chat.postMessage(
    req.body.channel_id,
    `Now playing ${utils.formatSong(name, artist)}`
  );
}

module.exports = wrapper(async function next(req) {
  const activeUser = await User.getActive();
  const spotifyApi = await activeUser.getSpotifyApi();

  let trackData = {};
  let skipMessage = 'Skipping...';

  try {
    trackData = await spotifyApi.getMyCurrentPlayingTrack();
    const skippedName = trackData.body.item.name;
    const skippedArtist = trackData.body.item.artists[0].name;
    skipMessage = `Skipping ${utils.formatSong(skippedName, skippedArtist)}...`;
  } catch (err) {
    logger.error('Error getting current track for /next: ' + err);
  }

  performSkip(spotifyApi, req);
  return utils.slackAt(req, skipMessage);
});
