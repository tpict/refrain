const Playlist = require('../models/playlist');
const User = require('../models/user');
const utils = require('../utils');
const logger = require('../logger');

module.exports = async function addplaylist(req) {
  const playlistURI = req.body.text;
  const splitURI = playlistURI.split(':');
  const spotifyUserID = splitURI[2];
  const spotifyID = splitURI[4];

  const activeUser = await User.getActive();
  const spotifyApi = await activeUser.getSpotifyApi();

  return spotifyApi
    .getPlaylist(spotifyUserID, spotifyID)
    .then(data => {
      const name = data.body.name;
      const playlist = new Playlist({
        spotifyID,
        spotifyUserID,
        name
      });
      return playlist.save().then(async () => {
        if (!await Playlist.getActive()) {
          await playlist.setActive();
        }

        return utils.slackAt(req, `Added your playlist *${name}*.`);
      });
    })
    .catch(err => {
      if (err.statusCode === 404) {
        return utils.slackAt(req, 'Couldn\'t find that playlist.');
      } else {
        logger.error(`Error retrieving playlist ${playlistURI}: ${err}`);
        throw err;
      }
    });
};
