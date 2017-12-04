const express = require('express');
const bodyParser = require('body-parser');
const storage = require('node-persist');
const uuidv4 = require('uuid/v4');

const utils = require('./utils');
const store = require('./store');

const app = express();
const urlencodedParser = bodyParser.urlencoded({ extended: false });

storage.initSync();

const SpotifyWebApi = require('spotify-web-api-node');

const spotifyApi = new SpotifyWebApi({
  clientId: require('./credentials').spotifyClientID,
  clientSecret: require('./credentials').spotifyClientSecret,
  redirectUri: require('./credentials').spotifyRedirectURI
});

const states = {};

// Try to authenticate as the stored active user. The authenticated variable
// is used to drop out of commands early if authentication fails.
let authenticated = (function () {
  const activeUser = store.getActiveUser();
  if (!activeUser) {
    return false;
  }

  const accessToken = activeUser.access_token;
  const refreshToken = activeUser.refresh_token;

  if (!(accessToken && refreshToken)) {
    return false;
  }

  spotifyApi.setAccessToken(accessToken);
  spotifyApi.setRefreshToken(refreshToken);

  spotifyApi
    .refreshAccessToken()
    .then(
      data => spotifyApi.setAccessToken(data.body['access_token']),
      err => console.log(err)
    );

  return true;
})();

const commands = require('./commands')(spotifyApi);

// Drop out of commands early if we aren't authenticated or if the jukebox is
// off.
function authWrapper(req, res, commandName) {
  if (!authenticated) {
    utils.respond(req, res, 'Spotify authentication failed. Try `/spotifyauth`.');
    return;
  }

  if (!commands.noAuth.includes(commandName) && !commands.on) {
    utils.respond(req, res, 'The jukebox is off!', req);
    return;
  }

  commands[commandName](req, res);
}

// Send a message with a Spotify authentication link. The state is used later
// in the callback endpoint to match the tokens to the Slack user that
// requested authentication.
app.post('/spotifyauth', urlencodedParser, function (req, res) {
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

  const authURL = spotifyApi.createAuthorizeURL(scope, state);
  res.send(`Click this link to authenticate with Spotify: ${authURL}`);
});

// Redirect endpoint for Spotify authentication.
app.get('/callback', async function (req, res) {
  const code = req.query.code;
  const state = req.query.state;

  const userName = states[state];
  const users = store.getUsers();

  const { accessToken, refreshToken } = await spotifyApi
    .authorizationCodeGrant(code)
    .then(
      data => {
        const accessToken = data.body['access_token'];
        const refreshToken = data.body['refresh_token'];

        return { accessToken, refreshToken };
      },
      err => {
        res.send(err);
      }
    );

  spotifyApi.getMe().then(
    data => {
      spotifyApi.setAccessToken(accessToken);
      spotifyApi.setRefreshToken(refreshToken);

      users[userName] = {
        id: data.body.id,
        access_token: accessToken,
        refresh_token: refreshToken
      };

      storage.setItemSync('users', users);
      store.setActiveUser(userName);
      authenticated = true;

      res.send(
        `${userName} is now authenticated with Spotify! They are now the active user. You can close this tab now.`
      );
    },
    err => res.send(err)
  );
});

require('./slack_auth')(app);
require('./interactive')(app, spotifyApi);

// Create endpoints for each slash command. The endpoint is the same as the
// name of the function.
Object.keys(commands).forEach(commandName =>
  app.post(`/${commandName}`, urlencodedParser, (req, res) =>
    authWrapper(req, res, commandName)
  )
);

app.listen(4390, () => console.log('Example app listening on port 4390!'));
