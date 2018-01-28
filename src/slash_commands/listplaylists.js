const Playlist = require('../models/playlist');
const utils = require('../utils');

module.exports = async function listplaylists(req, res) {
  if (await Playlist.count() === 0) {
    utils.respond(
      req,
      res,
      'There are no configured playlists. Try `/addplaylist` to get started.'
    );
    return;
  }

  const spotifyApi = await utils.getSpotifyApi();

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

  Promise.all(requests).then(
    responseList => {
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

      res.send(body);
    },
    err =>
      utils.errorWrapper(err, errorMessage =>
        utils.respond(
          req,
          res,
          errorMessage || 'Looks like you have a misconfigured playlist.'
        )
      )
  );
};
