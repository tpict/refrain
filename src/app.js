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

const authenticated = (function () {
  const users = utils.getUsers();
  const activeUserName = utils.getActiveUser();
  const activeUser = users[activeUserName];
  if (!activeUser) {
    return false;
  }

  const accessToken = activeUser.access_token;
  const refreshToken = activeUser.refresh_token;

  if (accessToken && refreshToken) {
    spotifyApi.setAccessToken(accessToken);
    spotifyApi.setRefreshToken(refreshToken);

    spotifyApi
      .refreshAccessToken()
      .then(
        data => spotifyApi.setAccessToken(data.body['access_token']),
        err => console.log(err)
      );

    return true;
  }
})();

const commands = require('./commands')(spotifyApi);

function authWrapper(req, res, callback) {
  if (!authenticated) {
    res.send(
      utils.directed('Spotify authentication failed. Try `/spotifyauth`.', req)
    );
    return;
  }

  callback(req, res);
}

app.post('/spotifyauth', urlencodedParser, function (req, res) {
  const state = utils.generateRandomString(16);
  const states = utils.getStates();
  states[state] = req.body.user_name;
  storage.setItemSync('states', states);

  const scope = [
    'playlist-read-private',
    'playlist-read-collaborative',
    'playlist-modify-public',
    'playlist-modify-private',
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing'
  ];

  res.send(utils.directed(spotifyApi.createAuthorizeURL(scope, state), req));
});

app.get('/callback', function (req, res) {
  const code = req.query.code;
  const state = req.query.state;

  spotifyApi.authorizationCodeGrant(code).then(
    data => {
      const accessToken = data.body['access_token'];
      const refreshToken = data.body['refresh_token'];

      const states = utils.getStates();
      const user = states[state];
      const users = utils.getUsers();
      users[user] = {
        access_token: accessToken,
        refresh_token: refreshToken
      };

      storage.setItemSync('users', users);
      storage.setItemSync('active_user', user);

      spotifyApi.setAccessToken(accessToken);
      spotifyApi.setRefreshToken(refreshToken);

      res.send('Auth done!');
    },
    err => {
      res.send(err);
    }
  );
});

require('./slack_auth')(app);

Object.keys(commands).forEach(command =>
  app.post(`/${command}`, urlencodedParser, (req, res) =>
    authWrapper(req, res, commands[command])
  )
);

app.listen(4390, () => console.log('Example app listening on port 4390!'));
