const Playlist = require('../models/playlist');
const User = require('../models/user');
const utils = require('../utils');
const { wrapper } = require('./permission_wrapper');

module.exports = wrapper(async function whomst(req, res) {
  const activeUser = await User.getActive();
  const spotifyApi = await activeUser.getSpotifyApi();
  spotifyApi.getMyCurrentPlayingTrack().then(
    async data => {
      const track = data.body.item;
      if (!track) {
        return utils.respond(
          req,
          res,
          'Are you hearing things? If so, check that `/whichuser` matches the user signed in to Spotify.'
        );
      }

      const name = track.name;
      const artist = track.artists[0].name;

      const playlist = await Playlist.getActive()
        .then(playlist =>
          playlist.populate({
            path: 'tracks',
            match: { spotifyID: track.id }
          })
        )
        .then(playlist => playlist.execPopulate());

      if (playlist.tracks.length) {
        utils.respond(
          req,
          res,
          `${utils.formatSong(name, artist)} was last requested by <@${playlist
            .tracks[0].requestedBy}>`
        );
      } else {
        utils.respond(
          req,
          res,
          `${utils.formatSong(
            name,
            artist
          )} was added directly through Spotify :thumbsdown:`
        );
      }
    },
    err =>
      utils.errorWrapper(err, errorMessage =>
        utils.respond(
          req,
          res,
          errorMessage || 'Couldn\'t read the currently playing track'
        )
      )
  );
});
