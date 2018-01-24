const store = require('../store');
const utils = require('../utils');

module.exports = async function addplaylist(req, res) {
  const playlistURI = req.body.text;
  const splitURI = playlistURI.split(':');
  const userID = splitURI[2];
  const playlistID = splitURI[4];

  const spotifyApi = await utils.getSpotifyApi();

  spotifyApi.getPlaylist(userID, playlistID).then(
    data => {
      const name = data.body.name;

      const playlists = store.getPlaylists();
      playlists[playlistID] = {
        id: playlistID,
        user_id: utils.splitPlaylistURI(data.body.uri).userID,
        tracks: {},
        uri: data.body.uri,
        name
      };
      store.setPlaylists(playlists);

      if (!store.getActivePlaylist()) {
        store.setActivePlaylist(playlistID);
      }

      utils.respond(req, res, `Added your playlist *${name}*.`);
    },
    err => {
      const error404 = 'Couldn\'t find that playlist.';
      utils.errorWrapper(err, errorMessage =>
        utils.respond(
          req,
          res,
          err.statusCode == 404 ? error404 : errorMessage || error404
        )
      );
    }
  );
};
