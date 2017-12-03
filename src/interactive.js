// Callback endpoint for interactive Slack messages.
const utils = require('./utils');
const bodyParser = require('body-parser');

const urlencodedParser = bodyParser.urlencoded({ extended: false });

module.exports = (app, spotifyApi) => {
  app.post('/interactive', urlencodedParser, (req, res) => {
    const payload = JSON.parse(req.body.payload);
    const action = payload.actions[0];

    if (action.name === 'cancel') {
      res.send('Crisis averted.');
      return;
    }

    const track = JSON.parse(action.value);
    const formattedSong = utils.formatSong(track.name, track.artist);

    spotifyApi
      .removeTracksFromPlaylist(
        utils.getActiveUserID(),
        utils.getActivePlaylist().id,
        [{ uri: track.uri }]
      )
      .then(
        () => {
          res.send(
            utils.directed(
              `That bad? Let's not listen to ${formattedSong} again. :bomb:`,
              track.user_name
            )
          );
          return spotifyApi.skipToNext();
        },
        err => {
          console.log(err);
          res.send(
            utils.directed(
              `Spotify doesn\'t want to delete ${formattedSong}. Godspeed.`,
              req
            )
          );
        }
      )
      .then(() => {}, err => console.log(err));
  });
};
