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
    const name = track.name;
    const artist = track.artist;

    spotifyApi
      .removeTracksFromPlaylist(
        utils.getUserID(),
        utils.getActivePlaylist().id,
        [{ uri: track.uri }]
      )
      .then(
        () => {
          res.send(
            utils.directed(
              `That bad? Let's not listen to *${name}* by *${artist}* again. :bomb:`,
              track.user_name
            )
          );
          return spotifyApi.skipToNext();
        },
        err => {
          console.log(err);
          res.send(
            utils.directed(
              `Spotify doesn\'t want to delete *${name}* by *${artist}*. Godspeed.`,
              req
            )
          );
        }
      )
      .then(() => {}, err => console.log(err));
  });
};
