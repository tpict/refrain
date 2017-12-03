const express = require('express');
const bodyParser = require('body-parser');
const storage = require('node-persist');
const utils = require('./utils');

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
  const users = utils.getUsers();
  const activeUserName = utils.getActiveUser();
  const activeUser = users[activeUserName];
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
    res.send(
      utils.directed('Spotify authentication failed. Try `/spotifyauth`.', req)
    );
    return;
  }

  if (!commands.noAuth.includes(commandName) && !commands.on) {
    res.send(utils.directed('The jukebox is off!', req));
    return;
  }

  commands[commandName](req, res);
}

// Send a message with a Spotify authentication link. The state is used later
// in the callback endpoint to match the tokens to the Slack user that
// requested authentication.
app.post('/spotifyauth', urlencodedParser, function (req, res) {
  const state = utils.generateRandomString(16);
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

  res.send(spotifyApi.createAuthorizeURL(scope, state));
});

// Redirect endpoint for Spotify authentication.
app.get('/callback', function (req, res) {
  const code = req.query.code;
  const state = req.query.state;

  spotifyApi.authorizationCodeGrant(code).then(
    data => {
      const accessToken = data.body['access_token'];
      const refreshToken = data.body['refresh_token'];

      const user = states[state];
      const users = utils.getUsers();
      users[user] = {
        access_token: accessToken,
        refresh_token: refreshToken
      };

      storage.setItemSync('users', users);

      if (!utils.getActiveUser()) {
        storage.setItemSync('active_user', user);
        spotifyApi.setAccessToken(accessToken);
        spotifyApi.setRefreshToken(refreshToken);
        authenticated = true;
      }

      res.send(
        `${user} is now authenticated with Spotify! You can close this tab now.`
      );
    },
    err => {
      res.send(err);
    }
  );
});

require('./slack_auth')(app);

// Create endpoints for each slash command. The endpoint is the same as the
// name of the function.
Object.keys(commands).forEach(commandName =>
  app.post(`/${commandName}`, urlencodedParser, (req, res) =>
    authWrapper(req, res, commandName)
  )
);

app.listen(4390, () => console.log('Example app listening on port 4390!'));
