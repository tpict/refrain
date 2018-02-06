const User = require('../models/user');
const utils = require('../utils');
const logger = require('../logger');

async function performSkip(spotifyApi, req) {
  const webClient = utils.getWebClient();

  try {
    await spotifyApi.skipToNext();
  } catch (err) {
    logger.error(
      'Error skipping current track for /next: ' + (err.stack || err)
    );
    return webClient.chat.postMessage(
      req.body.channel_id,
      utils.getErrorMessage(err.statusCode)
    );
  }

  await utils.sleep(500);

  let track = null;
  try {
    track = await spotifyApi.refrain.getMyCurrentPlayingTrack();
  } catch (err) {
    logger.error(
      'Error getting current track post-skip for /next: ' + (err.stack || err)
    );
    return webClient.chat.postMessage(
      req.body.channel_id,
      utils.getErrorMessage(err.statusCode)
    );
  }

  if (!track) {
    return webClient.chat.postMessage(
      req.body.channel_id,
      'Out of music! You might need to use `/playplaylist`.'
    );
  }

  webClient.chat.postMessage(
    req.body.channel_id,
    `Now playing ${track.formattedTitle}`
  );
}

module.exports = async function next(req) {
  const activeUser = await User.getActive();
  const spotifyApi = await activeUser.getSpotifyApi();

  let track;
  let skipMessage = 'Skipping...';

  try {
    track = await spotifyApi.refrain.getMyCurrentPlayingTrack(false);
    skipMessage = `Skipping ${track.formattedTitle}...`;
  } catch (err) {
    logger.error(
      'Error getting current track for /next: ' + (err.stack || err)
    );
  }

  performSkip(spotifyApi, req);
  return utils.slackAt(req, skipMessage);
};
