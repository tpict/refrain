const Playlist = require('../models/playlist');
const User = require('../models/user');
const logger = require('../logger');

module.exports = async function listplaylists() {
  const activeUser = await User.getActive();
  const spotifyApi = await activeUser.getSpotifyApi();

  const playlists = await Playlist.find({});
  const requests = playlists.map(playlist =>
    spotifyApi
      .getPlaylist(playlist.spotifyUserID, playlist.spotifyID)
      .then(data => Object.assign(data, { id: playlist.spotifyID }))
      .catch(err => Object.assign(err, { id: playlist.spotifyID }))
  );

  const body = {
    text: 'Your configured playlists are:'
  };

  let responseList = [];
  try {
    responseList = await Promise.all(requests);
  } catch (err) {
    logger.error(`Error retrieving tracks: ${err}`);
    throw err;
  }

  body.attachments = responseList.map(response => {
    const found = response.statusCode == 200;
    const title = found ? response.body.name : 'Invalid playlist';
    const fallback = `Playlist: ${title}`;
    const text = found
      ? `Total tracks: ${response.body.tracks.total}`
      : 'This playlist is misconfigured, or there\'s a problem with Spotify';
    const callback_id = 'list_playlists';
    const color = 'good';
    const thumb_url =
      found && response.body.images.length > 0
        ? response.body.images[0].url
        : null;

    const attachment = {
      fallback,
      callback_id,
      title,
      text,
      thumb_url,
      color,
      actions: [
        {
          name: 'remove',
          text: 'Remove',
          type: 'button',
          value: response.id
        }
      ]
    };

    if (found) {
      attachment.actions.unshift({
        name: 'play',
        text: 'Play',
        type: 'button',
        value: response.id
      });
    }

    return attachment;
  });

  return body;
};
