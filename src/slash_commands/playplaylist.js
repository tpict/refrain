const store = require('../store');
const utils = require('../utils');
const { wrapper } = require('./permission_wrapper');

module.exports = wrapper(async function playplaylist(req, res) {
  const playlists = store.getPlaylists();
  const text = req.body.text;
  const playlist = playlists[text];

  if (!playlist) {
    utils.respond(req, res, `Couldn't find a playlist called *${text}*.`);
    return;
  }

  const spotifyApi = await utils.getSpotifyApi();
  spotifyApi
    .play({
      context_uri: playlist.uri
    })
    .then(
      () => {
        store.setActivePlaylist(text);

        utils.respond(
          req,
          res,
          `Now playing from *${playlist.name}*! Commands will now act on this playlist.`
        );
      },
      err =>
        utils.errorWrapper(err, errorMessage =>
          utils.respond(
            req,
            res,
            errorMessage || 'Looks like a misconfigured playlist.'
          )
        )
    );
});
