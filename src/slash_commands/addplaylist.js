const store = require('../store');
const utils = require('../utils');

module.exports = async function addplaylist(req, res) {
    const customErrorMessage =
      'Didn\'t catch that. Give me an alphanumeric alias for your playlist followed by its URI. You can get the URI from Spotify by clicking Share -> Copy Spotify URI.';

    const splitText = req.body.text.split(' ');
    if (splitText.length !== 2) {
      utils.respond(req, res, customErrorMessage);
      return;
    }

    const [alias, playlistURI] = splitText;
    const splitURI = playlistURI.split(':');
    const userID = splitURI[2];
    const playlistID = splitURI[4];

    const spotifyApi = await utils.getSpotifyApi();

    spotifyApi.getPlaylist(userID, playlistID).then(
      data => {
        const name = data.body.name;

        const playlists = store.getPlaylists();
        playlists[alias] = {
          id: playlistID,
          user_id: utils.splitPlaylistURI(data.body.uri).userID,
          tracks: {},
          uri: data.body.uri,
          name
        };
        store.setPlaylists(playlists);

        if (!store.getActivePlaylist()) {
          store.setActivePlaylist(alias);
        }

        utils.respond(
          req,
          res,
          `Added your playlist *${name}* under the alias *${alias}*.`
        );
      },
      err =>
        utils.errorWrapper(err, errorMessage =>
          utils.respond(
            req,
            res,
            err.statusCode == 404
              ? customErrorMessage
              : errorMessage || customErrorMessage
          )
        )
    );
  };
