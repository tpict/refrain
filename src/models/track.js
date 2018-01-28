const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  spotifyID: String,
  title: String,
  artist: String,
  requestedBy: String
});

module.exports = mongoose.model('Track', schema);
