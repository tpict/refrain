const User = require('../models/user');
const utils = require('../utils');
const { wrapper } = require('./permission_wrapper');

module.exports = wrapper(async function eradicate(req, res) {
  const activeUser = await User.getActive();
  const spotifyApi = await activeUser.getSpotifyApi();

  const data = await spotifyApi
    .getMyCurrentPlayingTrack()
    .then(data => data)
    .catch(err =>
      utils.errorWrapper(err, errorMessage =>
        utils.respond(
          req,
          res,
          errorMessage || 'Is something playing? Spotify doesn\'t think so!'
        )
      )
    );

  const track = data.body.item;
  if (!track) {
    utils.respond(
      req,
      res,
      'Are you hearing things? If so, you might want to use `/playplaylist` to try and re-sync things.'
    );
    return;
  }

  const name = track.name;
  const artist = track.artists[0].name;

  utils.respond(req, res, {
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
});
