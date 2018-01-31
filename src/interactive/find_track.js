const Playlist = require('../models/playlist');
const Track = require('../models/track');
const User = require('../models/user');
const utils = require('../utils');

async function playTrackInPlaylistContext(
  playlist,
  track,
  channelID,
  userName
) {
  const activeUser = await User.getActive();
  const spotifyApi = await activeUser.getSpotifyApi();
  const webClient = utils.getWebClient();

  const formattedSong = utils.formatSong(track.name, track.artists[0].name);

  const [offset, total, found] = await spotifyApi.getPlaylistOffset(
    playlist,
    track
  );

  if (found) {
    await spotifyApi
      .play({ context_uri: playlist.uri, offset: { position: offset } })
      .then(
        () =>
          webClient.chat.postMessage(
            channelID,
            `Now playing ${formattedSong}, as requested by <@${userName}>`
          ),
        err =>
          utils.errorWrapper(err, errorMessage =>
            webClient.chat.postMessage(
              channelID,
              errorMessage ||
                `<@{userName}> added ${formattedSong} to *${playlist.name}*, but there was an error playing it.`
            )
          )
      );
  }

  return [found, total];
}

async function playAndAddTrack(track, channelID, userName) {
  const playlist = await Playlist.getActive();

  const [found, total] = await playTrackInPlaylistContext(
    playlist,
    track,
    channelID,
    userName
  );

  if (found) {
    return;
  }

  await spotifyApi.addAndStoreTrack(playlist, track);

  const activeUser = await User.getActive();
  const spotifyApi = await activeUser.getSpotifyApi();
  const webClient = await utils.getWebClient();
  const formattedSong = utils.formatSong(track.name, track.artists[0].name);

  spotifyApi
    .play({ context_uri: playlist.uri, offset: { position: total } })
    .then(
      () =>
        webClient.chat.postMessage(
          channelID,
          `Now playing ${formattedSong}, as requested by <@${userName}>`
        ),
      err =>
        utils.errorWrapper(err, errorMessage =>
          webClient.chat.postMessage(
            channelID,
            errorMessage ||
              `<@{userName}> added ${formattedSong} to *${playlist.name}*, but there was an error playing it.`
          )
        )
    );
}

module.exports = async function find_track(payload, res) {
  const userID = payload.user.id;
  const channelID = payload.channel.id;

  const action = payload.actions[0];
  const trackData = JSON.parse(action.value);
  const play = action.name == 'play';

  const playlist = await Playlist.getActive();

  const activeUser = await User.getActive();
  const spotifyApi = await activeUser.getSpotifyApi();
  const webClient = utils.getWebClient();

  res.send('Just a moment...');

  if (play) {
    return playAndAddTrack(trackData, channelID, userID);
  } else {
    spotifyApi
      .addAndStoreTrack(trackData, playlist, userID)
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
