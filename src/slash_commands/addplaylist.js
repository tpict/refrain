const Playlist = require('../models/playlist');
const utils = require('../utils');

module.exports = async function addplaylist(req, res) {
  const playlistURI = req.body.text;
  const splitURI = playlistURI.split(':');
  const spotifyUserID = splitURI[2];
  const spotifyID = splitURI[4];

  const spotifyApi = await utils.getSpotifyApi();

  spotifyApi.getPlaylist(spotifyUserID, spotifyID).then(
    data => {
      const name = data.body.name;
      const playlist = new Playlist({
        spotifyID,
        spotifyUserID,
        name
      });
      playlist.save().then(() => {

        // if (!Playlist.getActive()) {
        //   playlist.setActive();
        // }

        utils.respond(req, res, `Added your playlist *${name}*.`);
      });
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
