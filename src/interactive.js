// Callback endpoint for interactive Slack messages.
const store = require('./store');
const utils = require('./utils');
const bodyParser = require('body-parser');

const urlencodedParser = bodyParser.urlencoded({ extended: false });

const callbacks = spotifyApi => ({
  delete_track(req, res, payload) {
    const action = payload.actions[0];

    if (action.name === 'cancel') {
      res.send('Crisis averted.');
      return;
    }

    const track = JSON.parse(action.value);
    const formattedSong = utils.formatSong(track.name, track.artist);

    spotifyApi
      .removeTracksFromPlaylist(
        store.getActiveUserID(),
        store.getActivePlaylist().id,
        [{ uri: track.uri }]
      )
      .then(
        () => {
          utils.respond(
            track.user_name,
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
            `Spotify doesn\'t want to delete ${formattedSong}. Godspeed.`
          );
        }
      )
      .then(() => {}, err => console.log(err));
  },

  find_track(req, res, payload) {
    res.send('Not implemented yet!');
  },

  find_track_more(req, res, payload) {
    res.send('Not implemented yet!');
  }
});

module.exports = (app, spotifyApi) => {
  app.post('/interactive', urlencodedParser, (req, res) => {
    const payload = JSON.parse(req.body.payload);
    callbacks(spotifyApi)[payload.callback_id](req, res, payload);
  });
};
