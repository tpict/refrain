const Playlist = require('../models/playlist');
const Track = require('../models/track');
const User = require('../models/user');
const utils = require('../utils');

async function playAndAddTrack(track, channelID) {
  const activeUser = await User.getActive();
  const spotifyApi = await activeUser.getSpotifyApi();
  const playlist = await Playlist.getActive();
  const webClient = await utils.getWebClient();
  const userID = track.requestedBy;

  const [found, total] = await spotifyApi
    .playTrackInPlaylistContext(track, playlist)
    .then(result => {
      webClient.chat.postMessage(
        channelID,
        `Now playing ${track.formattedTitle}, as requested by <@${userID}>`
      );
      return result;
    })
    .catch(err =>
      utils.errorWrapper(err, errorMessage =>
        webClient.chat.postMessage(
          channelID,
          errorMessage ||
            `<@{userID}> added ${track.formattedTitle} to *${playlist.name}*, but there was an error playing it.`
        )
      )
    );

  if (found) {
    return;
  }

  await spotifyApi.addAndStoreTrack(playlist, track);

  spotifyApi
    .play({ context_uri: playlist.uri, offset: { position: total } })
    .then(
      () =>
        webClient.chat.postMessage(
          channelID,
          `Now playing ${track.formattedTitle}, as requested by <@${userID}>`
        ),
      err =>
        utils.errorWrapper(err, errorMessage =>
          webClient.chat.postMessage(
            channelID,
            errorMessage ||
              `<@{userID}> added ${track.formattedTitle} to *${playlist.name}*, but there was an error playing it.`
          )
        )
    );
}

module.exports = async function find_track(payload, res) {
  const userID = payload.user.id;
  const channelID = payload.channel.id;

  const action = payload.actions[0];
  const trackData = JSON.parse(action.value);

  const playlist = await Playlist.getActive();

  const activeUser = await User.getActive();
  const spotifyApi = await activeUser.getSpotifyApi();
  const webClient = utils.getWebClient();

  res.send('Just a moment...');

  const track = new Track({
    spotifyID: trackData.id,
    requestedBy: userID,
    artist: trackData.artists[0].name,
    title: trackData.name
  });

  if (action.name === 'play') {
    return playAndAddTrack(track, channelID, userID);
  } else {
    spotifyApi
      .addAndStoreTrack(track, playlist)
      .then(track => {
        const message = `<@${userID}> added ${track.formattedTitle} to *${playlist.name}*`;
        webClient.chat.postMessage(channelID, message);
      })
      .catch(err =>
        utils.errorWrapper(err, errorMessage => {
          const message =
            errorMessage ||
            `There was an error adding your track to *${playlist.name}*.`;

          webClient.chat.postMessage(
            channelID,
            utils.formatResponse(userID, message)
          );
        })
      );
  }
};
