// Callback endpoint for interactive Slack messages.
const bodyParser = require('body-parser');

const urlencodedParser = bodyParser.urlencoded({ extended: false });

const callbacks = {
  delete_track: require('./delete_track'),
  find_track: require('./find_track'),
  find_more: require('./find_more'),
  list_playlists: require('./list_playlists')
};

module.exports = app => {
  app.post('/interactive', urlencodedParser, (req, res) => {
    const payload = JSON.parse(req.body.payload);
    const callback = callbacks[payload.callback_id];

    if (callback) {
      callback(payload, res);
    } else {
      res.send('Looks like that feature hasn\'t been implemented yet!');
    }
  });
};
