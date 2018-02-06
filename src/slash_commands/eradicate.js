const User = require('../models/user');
const utils = require('../utils');
const logger = require('../logger');

module.exports = async function eradicate(req) {
  const activeUser = await User.getActive();
  const spotifyApi = await activeUser.getSpotifyApi();

  let track;
  try {
    track = await spotifyApi.refrain.getMyCurrentPlayingTrack(false);
  } catch (err) {
    logger.error(
      `Error getting current track for /eradicate: ${err.stack || err}`
    );
    throw err;
  }

  if (!track) {
    return utils.slackAt(
      req,
      'Are you hearing things? If so, you might want to use `/playplaylist` to try and re-sync things.'
    );
  }

  return utils.slackAt(req, {
    text: `Whoa! Are you absolutely positive that you want to delete ${track.formattedTitle}?`,
    attachments: [
      {
        fallback: 'Your device doesn\'t support this.',
        callback_id: 'delete_track',
        color: 'danger',
        actions: [
          {
            name: 'delete',
            text: 'Do it.',
            type: 'button',
            style: 'danger',
            value: track.spotifyID,
          },
          {
            name: 'cancel',
            text: 'Cancel',
            type: 'button',
            value: {}
          }
        ]
      }
    ]
  });
};
