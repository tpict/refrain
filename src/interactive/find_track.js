const Playlist = require('../models/playlist');
const Track = require('../models/track');
const User = require('../models/user');
const utils = require('../utils');

module.exports = async function find_track(payload, res) {
  const userID = payload.user.id;
  const channelID = payload.channel.id;
  const action = payload.actions[0];

  const playlist = await Playlist.getActive();
  const activeUser = await User.getActive();

  const spotifyApi = await activeUser.getSpotifyApi();
  const webClient = utils.getWebClient();

  res.send('Just a moment...');

  const trackData = JSON.parse(action.value);
  const track = new Track({
    spotifyID: trackData.id,
    requestedBy: userID,
    artist: trackData.artists[0].name,
    title: trackData.name
  });

  if (action.name === 'play') {
    spotifyApi.refrain
      .playAndAddTrack(track, playlist)
      .then(() =>
        webClient.chat.postMessage(
          channelID,
          `Now playing ${track.formattedTitle}, as requested by <@${userID}>`
        )
      )
      .catch((err, errorMessage) =>
        webClient.chat.postMessage(
          channelID,
          errorMessage ||
            `There was an error playing your track in the context of *${playlist.name}`
        )
      );
  } else {
    spotifyApi.refrain
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
