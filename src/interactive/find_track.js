const store = require('../store');
const utils = require('../utils');

async function playTrackInPlaylistContext(
  playlist,
  track,
  channelID,
  userName
) {
  const spotifyApi = await utils.getSpotifyApi();
  const webClient = utils.getWebClient();

  const formattedSong = utils.formatSong(track.name, track.artists[0].name);

  const [offset, total, found] = await utils.playlistContextOffset(
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

async function addAndStoreTrack(
  playlist,
  track,
  channelID,
  userName,
  chat
) {
  const spotifyApi = await utils.getSpotifyApi();
  const webClient = utils.getWebClient();

  const artist = track.artists[0];

  const playlists = store.getPlaylists();

  await spotifyApi
    .addTracksToPlaylist(playlist.user_id, playlist.id, [track.uri])
    .then(
      () => {
        playlist.tracks[track.id] = {
          requester: userName,
          artist: artist.name,
          name: track.name
        };
        playlists[playlist.id] = playlist;
        store.setPlaylists(playlists);

        const message = `<@${userName}> added ${utils.formatSong(
          track.name,
          artist.name
        )} to *${playlist.name}*`;

        if (chat) {
          webClient.chat.postMessage(channelID, message);
        }
      },
      err =>
        utils.errorWrapper(err, errorMessage => {
          const message =
            errorMessage ||
            `There was an error adding ${utils.formatSong(
              track.name,
              artist.name
            )} to *${playlist.name}*.`;

          if (chat) {
            webClient.chat.postMessage(
              channelID,
              utils.formatResponse(userName, message)
            );
          }
        })
    );
}

async function playAndAddTrack(track, channelID, userName) {
  const playlist = store.getActivePlaylist();

  const [found, total] = await playTrackInPlaylistContext(
    playlist,
    track,
    channelID,
    userName
  );

  if (found) {
    return;
  }

  await addAndStoreTrack(playlist, track, channelID, userName, false);

  const spotifyApi = await utils.getSpotifyApi();
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
  const userName = payload.user.name;
  const channelID = payload.channel.id;

  const action = payload.actions[0];
  const track = JSON.parse(action.value);
  const play = action.name == 'play';

  const playlist = store.getActivePlaylist();

  res.send('Just a moment...');

  if (play) {
    return playAndAddTrack(track, channelID, userName);
  } else {
    await addAndStoreTrack(playlist, track, channelID, userName, !play);
  }
};
