const User = require('../models/user');
const utils = require('../utils');
const logger = require('../logger');

module.exports = async function eradicate(req) {
  const activeUser = await User.getActive();
  const spotifyApi = await activeUser.getSpotifyApi();

  let data;
  try {
    data = await spotifyApi.getMyCurrentPlayingTrack();
  } catch (err) {
    logger.error(
      `Error getting current track for /eradicate: ${err.stack || err}`
    );
    throw err;
  }

  if (data.statusCode === 204) {
    return utils.slackAt(
      req,
      'Are you hearing things? If so, you might want to use `/playplaylist` to try and re-sync things.'
    );
  }

  const track = data.body.item;
  const name = track.name;
  const artist = track.artists[0].name;

  return utils.slackAt(req, {
    text: `Whoa! Are you absolutely positive that you want to delete ${utils.formatSong(
      name,
      artist
    )}?`,
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
            value: JSON.stringify({
              uri: track.uri,
              name,
              artist
            })
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
