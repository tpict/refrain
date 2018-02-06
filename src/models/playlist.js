const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  spotifyID: { type: String, unique: true },
  spotifyUserID: String,
  name: String,
  active: {
    type: Boolean,
    default: false
  },
  tracks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Track' }]
});

schema.pre('save', function (next) {
  let err;

  const query = this.constructor.find({ _id: { $ne: this._id } });
  query
    .then(result => {
      if (result.length === 0 && !this.active) {
        err = new Error('The only playlist must be active.');
      }

      return query.find({ active: true });
    })
    .then(result => {
      if (result.length > 0 && this.active) {
        err = new Error('Only one playlist may be active at a time.');
      }
    })
    .then(() => next(err));
});

schema.pre('remove', function (next) {
  if (!this.active) {
    return next();
  }

  this.constructor
    .find({ _id: { $ne: this._id } })
    .then(playlists => {
      if (playlists.length > 0) {
        const newActivePlaylist = playlists[0];
        return newActivePlaylist.setActive();
      }
    })
    .then(() => next());
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
