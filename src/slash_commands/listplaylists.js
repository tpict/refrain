const store = require('../store');
const utils = require('../utils');

module.exports = async function listplaylists(req, res) {
  const playlists = Object.values(store.getPlaylists());

  if (playlists.length === 0) {
    utils.respond(
      req,
      res,
      'There are no configured playlists. Try `/addplaylist` to get started.'
    );
    return;
  }

  const spotifyApi = await utils.getSpotifyApi();

  const requests = playlists.map(playlist =>
    spotifyApi
      .getPlaylist(playlist.user_id, playlist.id)
      .then(data => Object.assign(data, { id: playlist.id }))
      .catch(err => Object.assign(err, { id: playlist.id }))
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
        const thumb_url = found ? response.body.images[0].url : null;
        const callback_id = 'list_playlists';
        const color = 'good';

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
