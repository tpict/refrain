require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const uuidv4 = require('uuid/v4');
const moment = require('moment');

const store = require('./store');
const utils = require('./utils');

function getApp() {
  const app = express();
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));

  const states = {};

  // Send a message with a Spotify authentication link. The state is used later
  // in the callback endpoint to match the tokens to the Slack user that
  // requested authentication.
  app.post('/spotifyauth', async function (req, res) {
    const state = uuidv4();
    states[state] = req.body.user_name;

    const scope = [
      'playlist-read-private',
      'playlist-read-collaborative',
      'playlist-modify-public',
      'playlist-modify-private',
      'user-read-playback-state',
      'user-modify-playback-state',
      'user-read-currently-playing'
    ];

    const spotifyApi = await utils.getSpotifyApi();
    const authURL = spotifyApi.createAuthorizeURL(scope, state);
    res.send(
      `Click this link to authenticate with Spotify: ${authURL}\n\n*Note*: in order to fetch your Spotify ID you will become the active user. Before clicking, you may want to check the active user with \`/whichuser\` and ask them to take over with \`/commandeer\` once you're authenticated.`
    );
  });

  // Redirect endpoint for Spotify authentication.
  app.get('/callback', async function (req, res) {
    const code = req.query.code;
    const state = req.query.state;

    const userName = states[state];
    const users = store.getUsers();

    const spotifyApi = await utils.getSpotifyApi();
    const { accessToken, refreshToken, expiresIn } = await spotifyApi
      .authorizationCodeGrant(code)
      .then(
        data => {
          const accessToken = data.body['access_token'];
          const refreshToken = data.body['refresh_token'];
          const expiresIn = data.body['expires_in'];

          return { accessToken, refreshToken, expiresIn };
        },
        err => {
          res.send(err);
        }
      );

    spotifyApi.setAccessToken(accessToken);
    spotifyApi.setRefreshToken(refreshToken);

    spotifyApi.getMe().then(
      data => {
        users[userName] = {
          id: data.body.id,
          access_token: accessToken,
          refresh_token: refreshToken,
          token_expiry: moment().add(expiresIn, 'seconds')
        };

        store.setUsers(users);
        store.setActiveUser(userName);

        res.send(
          `${userName} is now authenticated with Spotify! They are now the active user. You can close this tab now.`
        );
      },
      err => res.send(err)
    );
  });

  require('./slack_auth')(app);
  require('./slash_commands/index')(app);
  require('./interactive')(app);

  return app;
}

if (!module.parent) {
  const app = getApp();
  app.listen(4390, () => console.log('Pebble DJ listening on port 4390!'));
}

module.exports = getApp;
