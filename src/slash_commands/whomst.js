const store = require('../store');
const utils = require('../utils');
const { wrapper } = require('./permission_wrapper');

module.exports = wrapper(async function whomst(req, res) {
  const spotifyApi = await utils.getSpotifyApi();
  spotifyApi.getMyCurrentPlayingTrack().then(
    data => {
      const track = data.body.item;
      if (!track) {
        utils.respond(
          req,
          res,
          'Are you hearing things? If so, check that `/whichuser` matches the user signed in to Spotify.'
        );
      }

      const name = track.name;
      const artist = track.artists[0].name;
      const playlist = store.getActivePlaylist();

      const storedTrack = playlist.tracks[track.id];

      if (storedTrack) {
        const requester = storedTrack.requester;
        utils.respond(
          req,
          res,
          `${utils.formatSong(
            name,
            artist
          )} was last requested by <@${requester}>`
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
