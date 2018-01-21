// Callback endpoint for interactive Slack messages.
const bodyParser = require('body-parser');

const store = require('./store');
const utils = require('./utils');

const urlencodedParser = bodyParser.urlencoded({ extended: false });

const SpotifyInteractions = (webClient, spotifyApi) => ({
  async playTrackInPlaylistContext(playlist, track, channelID, userName) {
    const formattedSong = utils.formatSong(track.name, track.artists[0].name);

    const [offset, total, found] = await utils.playlistContextOffset(
      spotifyApi,
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
  },

  async addAndStoreTrack(playlistAlias, track, channelID, userName, chat) {
    const playlists = store.getPlaylists();
    const playlist = playlists[playlistAlias];

    const artist = track.artists[0];

    await spotifyApi
      .addTracksToPlaylist(playlist.user_id, playlist.id, [track.uri])
      .then(
        () => {
          playlist.tracks[track.id] = {
            requester: userName,
            artist: artist.name,
            name: track.name
          };
          playlists[playlistAlias] = playlist;
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
});

const callbacks = {
  async delete_track(payload, res) {
    const action = payload.actions[0];

    if (action.name === 'cancel') {
      res.send({ text: 'Crisis averted.' });
      return;
    }

    const track = JSON.parse(action.value);
    const formattedSong = utils.formatSong(track.name, track.artist);
    const playlist = store.getActivePlaylist();

    const spotifyApi = await utils.getSpotifyApi();

    spotifyApi
      .removeTracksFromPlaylist(playlist.user_id, playlist.id, [
        { uri: track.uri }
      ])
      .then(
        () => {
          utils.respond(
            payload.user.name,
            res,
            `That bad? Let's not listen to ${formattedSong} again. :bomb:`
          );
          return spotifyApi.skipToNext();
        },
        err => {
          console.log(err);
          utils.respond(
            track.user_name,
            res,
            `Spotify doesn't want to delete ${formattedSong}. Godspeed.`
          );
        }
      )
      .then(
        () => {},
        err =>
          utils.errorWrapper(err, errorMessage =>
            utils.respond(
              payload.user_name,
              res,
              errorMessage || 'Couldn\'t start the next track.'
            )
          )
      );
  },

  async find_track(payload, res) {
    const spotifyApi = await utils.getSpotifyApi();
    const webClient = utils.getWebClient();
    const spotifyInteractions = SpotifyInteractions(webClient, spotifyApi);

    const userName = payload.user.name;
    const channelID = payload.channel.id;

    const action = payload.actions[0];
    const track = JSON.parse(action.value);
    const play = action.name == 'play';

    const formattedSong = utils.formatSong(track.name, track.artists[0].name);

    const playlist = store.getActivePlaylist();
    const playlistAlias = store.getActivePlaylistAlias();

    let found = false;
    let total;

    res.send('Just a moment...');

    if (play) {
      [found, total] = await spotifyInteractions.playTrackInPlaylistContext(
        playlist,
        track,
        channelID,
        userName
      );
    }

    if (found) {
      return;
    }

    await spotifyInteractions.addAndStoreTrack(
      playlistAlias,
      track,
      channelID,
      userName,
      !play
    );

    if (!play) {
      return;
    }

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
  },

  async find_track_more(payload, res) {
    const action = payload.actions[0];
    const data = JSON.parse(action.value);

    const query = data.query;
    const options = {
      offset: data.offset,
      limit: data.limit
    };

    const spotifyApi = await utils.getSpotifyApi();
    spotifyApi.searchTracks(query, options).then(
      data => {
        res.send({
          text: `You searched for "${query}":`,
          attachments: utils.getSearchAttachments(query, data)
        });
      },
      err =>
        utils.errorWrapper(err, errorMessage =>
          res.send(
            errorMessage || 'An error occured while performing the search.'
          )
        )
    );
    return;
  }
};

module.exports = app => {
  app.post('/interactive', urlencodedParser, (req, res) => {
    const payload = JSON.parse(req.body.payload);
    const callback = callbacks[payload.callback_id];
    callback(payload, res);
  });
};
