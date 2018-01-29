const uuidv4 = require('uuid/v4');
const moment = require('moment');
const SpotifyWebApi = require('spotify-web-api-node');

const User = require('./models/user');

const states = {};
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI
});

module.exports = app => {
  // Send a message with a Spotify authentication link. The state is used later
  // in the callback endpoint to match the tokens to the Slack user that
  // requested authentication.
  app.post('/spotifyauth', async function (req, res) {
    const slackID = req.body.user_id;
    let user = await User.findOne({ slackID });

    if (!user) {
      user = new User({ slackID });
      await user.save();
    }

    const state = uuidv4();
    states[state] = {
      id: user._id,
      name: req.body.user_name
    };

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
    const state = states[req.query.state];

    const _id = state.id;
    const user = await User.findOne({ _id });

    const {
      accessToken,
      refreshToken,
      expiresIn
    } = await spotifyApi.authorizationCodeGrant(code).then(
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
      async data => {
        user.spotifyID = data.body.id;
        user.spotifyAccessToken = accessToken;
        user.spotifyRefreshToken = refreshToken;
        user.spotifyTokenExpiry = moment().add(expiresIn, 'seconds');
        user.active = true;
        await user.save();

        res.send(
          `${state.name} is now authenticated with Spotify! They are now the active user. You can close this tab now.`
        );
      },
      err => res.send(err)
    );
  });
};
