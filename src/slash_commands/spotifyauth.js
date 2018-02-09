const uuidv4 = require('uuid/v4');
const SpotifyWebApi = require('spotify-web-api-node');

const User = require('../models/user');
const authStates = require('../spotify_callback').authStates;

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI
});

module.exports = async function (req) {
  const slackID = req.body.user_id;
  let user = await User.findOne({ slackID });

  if (!user) {
    user = new User({ slackID });
    await user.save();
  }

  // This is used when Spotify requests the callback endpoint so the request
  // can be matched to the user who called /spotifyauth.
  const state = uuidv4();
  authStates[state] = {
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
  return { text: `Click this link to authenticate with Spotify: ${authURL}` };
};
