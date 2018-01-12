const utils = require('../utils');
const { wrapper } = require('./permission_wrapper');

module.exports = wrapper(function next(req, res) {
  const spotifyApi = utils.getSpotifyApi();
  const webClient = utils.getWebClient();

  const callback = (skippedName, skippedArtist, errorText) => {
    let skipText = errorText;
    if (!skipText) {
      skipText =
        skippedName == 'Rattlesnake'
        ? 'You are weak. :snake:'
        : `Skipping ${utils.formatSong(skippedName, skippedArtist)}...`;
    }
    utils.respond(req, res, skipText);

    spotifyApi
      .skipToNext()
      .then(
        async () => {
          await utils.sleep(500);
          return spotifyApi.getMyCurrentPlayingTrack();
        },
        err =>
        utils.errorWrapper(err, errorMessage =>
          webClient.chat.postMessage(
            req.body.channel_id,
            errorMessage || 'Spotify couldn\'t skip this track!'
          )
        )
      )
      .then(
        data => {
          const track = data.body.item;

          if (!track) {
            webClient.chat.postMessage(
              req.body.channel_id,
              'Out of music! You might need to use `/playplaylist`.'
            );
            return;
          }

          const name = track.name;
          const artist = track.artists[0].name;

          webClient.chat.postMessage(
            req.body.channel_id,
            `Now playing ${utils.formatSong(name, artist)}`,
            (err, res) => console.error(err, res)
          );
        },
        err =>
        utils.errorWrapper(err, errorMessage =>
          webClient.chat.postMessage(
            req.body.channel_id,
            errorMessage ||
            'Managed to skip, but Spotify wouldn\'t say what\'s playing now!'
          )
        )
      );
  };

  spotifyApi.getMyCurrentPlayingTrack().then(
    data => {
      const skippedName = data.body.item.name;
      const skippedArtist = data.body.item.artists[0].name;
      callback(skippedName, skippedArtist);
    },
    () => callback(null, null, 'Skipping whatever\'s playing...')
  );
});
