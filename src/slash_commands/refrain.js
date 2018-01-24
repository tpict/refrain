const store = require('../store');
const utils = require('../utils');
const { setOn, setOff } = require('./permission_wrapper');

module.exports = async function refrain(req, res) {
  const spotifyApi = await utils.getSpotifyApi();
  const command = req.body.text.toLowerCase();

  const userName = req.body.user_name;
  const activeUserName = store.getActiveUserName();

  if (userName != activeUserName) {
    return utils.respond(req, res, 'Only the active user may do that.');
  }

  if (command === 'on') {
    const playlistID = store.getActivePlaylistAlias();
    const playlists = store.getPlaylists();
    const playlist = playlists[playlistID];

    if (!playlist) {
      setOn();
      utils.respond(
        req,
        res,
        'Switched on. Add a playlist with `/addplaylist` to get started.'
      );
      return;
    }

    const playlistURI = playlist.uri;

    spotifyApi.play({ context_uri: playlistURI }).then(
      () => {
        setOn();
        utils.respond(
          req,
          res,
          'It begins...\nIf you can\'t hear anything, play any track in the Spotify client and try again.'
        );
      },
      err =>
        utils.errorWrapper(err, errMessage =>
          utils.respond(
            req,
            res,
            errMessage || `There was an error playing *${playlist.name}*`
          )
        )
    );
  } else if (command === 'off') {
    setOff();
    spotifyApi.pause().then(
      () => {
        res.send(
          utils.inChannel(
            '_If music be the food of love, play on._ - Shakespeare\nSwitching off.'
          )
        );
      },
      err =>
        utils.errorWrapper(err, errMessage =>
          utils.respond(req, res, errMessage || 'Couldn\'t stop playing!')
        )
    );
  }
};
