const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  spotifyID: String,
  title: String,
  artist: String,
  requestedBy: String
});

schema.virtual('formattedTitle').get(function () {
  return `*${this.title}* by *${this.artist}*`;
});

schema.virtual('uri').get(function () {
  return `spotify:track:${this.spotifyID}`;
});

module.exports = mongoose.model('Track', schema);
