const moment = require('moment');
const mongoose = require('mongoose');
const SpotifyWebApi = require('spotify-web-api-node');

const schema = new mongoose.Schema({
  slackID: String,
  spotifyID: String,
  spotifyAccessToken: String,
  spotifyRefreshToken: String,
  spotifyTokenExpiry: Date,
  active: { type: Boolean, default: false }
});

schema.methods.setActive = async function () {
  await this.constructor.find({ active: true }).update({ active: false });
  this.active = true;
  return this.save();
};

schema.methods.getSpotifyApi = async function () {
  const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI
  });

  const accessToken = this.spotifyAccessToken;
  const refreshToken = this.spotifyRefreshToken;

  spotifyApi.setAccessToken(accessToken);
  spotifyApi.setRefreshToken(refreshToken);

  const tokenExpiry = this.spotifyTokenExpiry;
  if (!tokenExpiry || moment() > moment(tokenExpiry)) {
    const data = await spotifyApi
      .refreshAccessToken()
      .then(data => data, err => console.log(err));

    spotifyApi.setAccessToken(data.body['access_token']);

    this.spotifyAccessToken = data.body['access_token'];
    this.spotifyTokenExpiry = moment().add(data.body['expires_in'], 'seconds');
    await this.save();
  }

  return spotifyApi;
};

schema.static('getActive', function (callback) {
  return this.findOne({ active: true }, callback);
});

module.exports = mongoose.model('User', schema);
