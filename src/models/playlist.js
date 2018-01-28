const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  spotifyID: String,
  spotifyUserID: String,
  name: String,
  active: { type: Boolean, default: false },
  tracks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Track' }]
});

schema.virtual('uri').get(function () {
  return `spotify:user:${this.spotifyUserID}:playlist:${this.spotifyID}`;
});

schema.methods.setActive = async function () {
  await this.constructor.find({ active: true }).update({ active: false });
  this.active = true;
  return this.save();
};

schema.static('getActive', async function () {
  return this.findOne({ active: true });
});

module.exports = mongoose.model('Playlist', schema);
