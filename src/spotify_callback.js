const moment = require('moment');
const SpotifyWebApi = require('spotify-web-api-node');

const User = require('./models/user');

const authStates = {};
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI
});

// Redirect endpoint for Spotify authentication.
const endpoint = app =>
  app.get('/callback', async function (req, res) {
    const code = req.query.code;
    const state = authStates[req.query.state];

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

    const userData = await spotifyApi.getMe();
    const activeUser = await User.getActive();

    user.spotifyID = userData.body.id;
    user.spotifyAccessToken = accessToken;
    user.spotifyRefreshToken = refreshToken;
    user.spotifyTokenExpiry = moment().add(expiresIn, 'seconds');
    user.active = !activeUser;
    await user.save();

    res.send(
      `${
        state.name
      } is now authenticated with Spotify! You can close this tab now.`
    );
  });

module.exports = {
  authStates,
  endpoint
};
