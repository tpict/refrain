require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const uuidv4 = require('uuid/v4');
const WebClient = require('@slack/client').WebClient;
const SpotifyWebApi = require('spotify-web-api-node');

const utils = require('./utils');
const store = require('./store');

const app = express();
app.use(bodyParser.json());
const urlencodedParser = bodyParser.urlencoded({ extended: false });

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI
});

const webClient = new WebClient(process.env.SLACK_API_TOKEN);

const states = {};

// Try to authenticate as the stored active user. The authenticated variable
// is used to drop out of commands early if authentication fails.
let authenticated;
async function authenticate() {
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

  const data = await spotifyApi
    .refreshAccessToken()
    .then(data => data, err => console.log(err));

  if (!data) {
    return false;
  }

  spotifyApi.setAccessToken(data.body['access_token']);
  return true;
}

setTimeout(async () => {
  for (;;) {
    authenticated = authenticate();

    let sleepDurationSecs;
    if (authenticated) {
      sleepDurationSecs = 3600;
      console.log('Successfully refreshed Spotify access token.');
    } else {
      sleepDurationSecs = 10;
      console.log(
        'Failed to refresh Spotify access token. Trying again in 10 seconds.'
      );
    }

    await utils.sleep(sleepDurationSecs * 1000);
  }
});

const commands = require('./commands')(webClient, spotifyApi);

// Drop out of commands early if we aren't authenticated or if the jukebox is
// off.
function authWrapper(req, res, commandName) {
  if (!authenticated) {
    utils.respond(
      req,
      res,
      'Spotify authentication failed. Try `/spotifyauth`.'
    );
    return;
  }

  const userName = req.body.user_name;
  const activeUserName = store.getActiveUserName();

  if (commandName === 'pdj' && userName !== activeUserName) {
    utils.respond(req, res, 'Only the active user may do that.', req);
    return;
  }

  if (commands.requireOn.includes(commandName) && !commands.on) {
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

      store.setUsers(users);
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
require('./interactive')(app, webClient, spotifyApi);

// Create endpoints for each slash command. The endpoint is the same as the
// name of the function.
Object.keys(commands).forEach(commandName =>
  app.post(`/${commandName}`, urlencodedParser, (req, res) =>
    authWrapper(req, res, commandName)
  )
);

if (!module.parent) {
  app.listen(4390, () => console.log('Pebble DJ listening on port 4390!'));
}

module.exports.app = app;
module.exports.spotifyApi = spotifyApi;
module.exports.webClient = webClient;
