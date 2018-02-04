// From https://api.slack.com/tutorials/tunneling-with-ngrok
// This isn't actually used since Refrain is self-hosted for now

const request = require('request');

module.exports = function (app) {
  app.get('/oauth', function (req, res) {
    // When a user authorizes an app, a code query parameter is passed on the oAuth endpoint. If that code is not there, we respond with an error message
    if (!req.query.code) {
      res.status(500);
      res.send({ Error: 'Looks like we\'re not getting code.' });
      console.log('Looks like we\'re not getting code.');
      return;
    }

    // If it's there...

    // We'll do a GET call to Slack's `oauth.access` endpoint, passing our app's client ID, client secret, and the code we just got as query parameters.
    request(
      {
        url: 'https://slack.com/api/oauth.access', //URL to hit
        qs: {
          code: req.query.code,
          client_id: process.env.SLACK_CLIENT_ID,
          client_secret: process.env.SLACK_CLIENT_SECRET
        }, //Query string data
        method: 'GET' //Specify the method
      },
      function (error, response, body) {
        if (error) {
          console.log(error);
        } else {
          console.log(response, body);
          res.json(body);
        }
      }
    );
  });
};
