const User = require('../models/user');
const Playlist = require('../models/playlist');
const utils = require('../utils');

module.exports = async function delete_track(payload, res) {
  const action = payload.actions[0];

  if (action.name === 'cancel') {
    res.send({ text: 'Crisis averted.' });
    return;
  }

  const track = JSON.parse(action.value);
  const formattedSong = utils.formatSong(track.name, track.artist);
  const playlist = await Playlist.getActive();
  const activeUser = await User.getActive();
  const spotifyApi = await activeUser.getSpotifyApi();

  spotifyApi
    .removeTracksFromPlaylist(playlist.spotifyUserID, playlist.spotifyID, [
      { uri: track.uri }
    ])
    .then(
      () => {
        utils.respond(
          payload.user.name,
          res,
          `That bad? Let's not listen to ${formattedSong} again. :bomb:`
        );
        return spotifyApi.skipToNext();
      },
      err => {
        console.log(err);
        utils.respond(
          track.user_name,
          res,
          `Spotify doesn't want to delete ${formattedSong}. Godspeed.`
        );
      }
    )
    .then(
      () => {},
      err =>
        utils.errorWrapper(err, errorMessage =>
          utils.respond(
            payload.user_name,
            res,
            errorMessage || 'Couldn\'t start the next track.'
          )
        )
    );
};
