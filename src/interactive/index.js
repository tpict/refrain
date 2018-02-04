// Callback endpoint for interactive Slack messages.
const utils = require('../utils');

const callbacks = {
  delete_track: require('./delete_track'),
  find_track: require('./find_track'),
  find_track_more: require('./find_more'),
  list_playlists: require('./list_playlists')
};

module.exports = app => {
  app.post('/interactive', async (req, res) => {
    const payload = JSON.parse(req.body.payload);
    const callback = callbacks[payload.callback_id];

    if (callback) {
      try {
        res.send(await callback(payload));
      } catch (err) {
        res.send(utils.getErrorMessage(err.statusCode));

        // Easier debugging in testing
        if (process.env.NODE_ENV !== 'production') {
          throw err;
        }
      }
    } else {
      res.send('Looks like that feature hasn\'t been implemented yet!');
    }
  });
};
