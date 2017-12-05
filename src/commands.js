const storage = require('node-persist');
const { URL } = require('url');

const utils = require('./utils');
const store = require('./store');

// Find the index of the given track in the given playlist.
// This is a work-around for a bug in the Spotify API that prevents specifying
// a playlist offset by URI.
// https://github.com/spotify/web-api/issues/630
const playlistContextOffset = async function (spotifyApi, playlist, track) {
  const { userID, playlistID } = utils.splitPlaylistURI(playlist.uri);

  let next = {};
  let nextURL = true;
  let found = false;

  let index = 0;
  let total = 0;

  while (nextURL && !found) {
    let tracks;
    [tracks, total, nextURL] = await spotifyApi
      .getPlaylistTracks(userID, playlistID, next)
      .then(
        data => [data.body.items, data.body.total, data.body.next],
        err => console.error(err)
      );

    if (nextURL) {
      const searchParams = new URL(nextURL).searchParams;
      next.offset = searchParams.get('offset');
      next.limit = searchParams.get('limit');
    }

    tracks.some(item => {
      if (item.track.id === track.id) {
        found = true;
        return true;
      }

      index++;
      return false;
    });
  }

  return [index, total, found];
};

const queue = async function (spotifyApi, req, res, track, callback) {
  const playlists = store.getPlaylists();
  const playlistAlias = store.getActivePlaylistAlias();
  const playlist = store.getActivePlaylist();
  const artist = track.artists[0];

  spotifyApi
    .addTracksToPlaylist(playlist.user_id, playlist.id, [track.uri])
    .then(
      () => {
        playlist.tracks[track.id] = {
          requester: req.body.user_name,
          artist: artist.name,
          name: track.name
        };
        playlists[playlistAlias] = playlist;
        storage.setItemSync('playlists', playlists);

        callback(artist, playlist);
      },
      err =>
        utils.errorWrapper(err, req, res, () =>
          utils.respond(
            req,
            res,
            `There was an error adding ${utils.formatSong(
              track.name,
              artist.name
            )} to *${playlist.name}*.`
          )
        )
    );
};

// Slash commands for Slack.
module.exports = (webClient, spotifyApi) => ({
  on: false,

  // Commands which require the jukebox to be switched on.
  requireOn: [
    'playplaylist',
    'playme',
    'pauseme',
    'shuffle',
    'whomst',
    'eradicate',
    'next'
  ],

  addplaylist(req, res) {
    const splitText = req.body.text.split(' ');
    if (splitText.length !== 2) {
      utils.respond(
        req,
        res,
        'Didn\'t catch that. Give me an alphanumeric alias for your playlist followed by its URI. You can get the URI from Spotify by clicking Share -> Copy Spotify URI.'
      );
      return;
    }

    const [alias, playlistURI] = splitText;
    const splitURI = playlistURI.split(':');
    const userID = splitURI[2];
    const playlistID = splitURI[4];

    spotifyApi.getPlaylist(userID, playlistID).then(
      data => {
        const name = data.body.name;

        const playlists = store.getPlaylists();
        playlists[alias] = {
          id: playlistID,
          user_id: utils.splitPlaylistURI(data.body.uri).userID,
          tracks: {},
          uri: data.body.uri,
          name
        };
        storage.setItemSync('playlists', playlists);

        if (!store.getActivePlaylist()) {
          store.setActivePlaylist(alias);
        }

        utils.respond(
          req,
          res,
          `Added your playlist *${name}* under the alias *${alias}*.`
        );
      },
      err =>
        utils.errorWrapper(err, req, res, () =>
          utils.respond(
            req,
            res,
            'Didn\'t catch that. Give me an alphanumeric alias for your playlist followed by its URI. You can get the URI from Spotify by clicking Share -> Copy Spotify URI.'
          )
        )
    );
  },

  removeplaylist(req, res) {
    const alias = req.body.text;
    if (!alias) {
      utils.respond(
        req,
        res,
        'Please specify the alias of the playlist you wish to remove.'
      );
      return;
    }

    const playlists = store.getPlaylists();
    const playlist = playlists[alias];

    if (!playlist) {
      utils.respond(
        req,
        res,
        'That doesn\'t look like a valid playlist alias! Try `/listplaylists`.'
      );
      return;
    }

    delete playlists[alias];
    store.setPlaylists(playlists);
    utils.respond(req, res, `Removed configuration for *${playlist.name}*.`);
  },

  listplaylists(req, res) {
    const playlists = store.getPlaylists();
    const aliases = Object.keys(playlists);

    const requests = aliases.map(alias =>
      spotifyApi
        .getPlaylist(playlists[alias].user_id, playlists[alias].id)
        .catch(err => err)
    );
    Promise.all(requests).then(
      values => {
        const lines = values.map((value, index) => {
          return `${aliases[index]}: ${value.body
            ? value.body.name
            : 'Misconfigured!'}`;
        });
        utils.respond(req, res, `\n${lines.join('\n')}`);
      },
      err =>
        utils.errorWrapper(
          err,
          req,
          res,
          utils.respond(
            req,
            res,
            'Looks like you have a misconfigured playlist.'
          )
        )
    );
  },

  playplaylist(req, res) {
    const playlists = store.getPlaylists();
    const text = req.body.text;
    const playlist = playlists[text];

    if (!playlist) {
      utils.respond(`Couldn't find a playlist called *${text}*.`);
      return;
    }

    spotifyApi
      .play({
        context_uri: playlist.uri
      })
      .then(
        () => {
          storage.setItemSync('active_playlist', text);

          utils.respond(
            req,
            res,
            `Now playing from *${playlist.name}*! Commands will now act on this playlist.`
          );
        },
        err =>
          utils.errorWrapper(err, req, res, () =>
            utils.respond(req, res, 'Looks like a misconfigured playlist')
          )
      );
  },

  whichplaylist(req, res) {
    const playlistID = storage.getItemSync('active_playlist');
    const playlists = store.getPlaylists();
    const activePlaylist = playlists[playlistID];

    if (activePlaylist) {
      utils.respond(
        req,
        res,
        `The active playlist is *${activePlaylist.name}*. If that's not what you're hearing, you'll have to select it from Spotify yourself.`
      );
    } else {
      utils.respond(req, res, 'There is no active playlist!', req);
    }
  },

  async queue(req, res) {
    const track = await spotifyApi.searchTracks(req.body.text).then(
      data => {
        const results = data.body.tracks.items;

        if (results.length === 0) {
          utils.respond(req, res, 'Couldn\'t find that track.');
          return;
        }

        return results[0];
      },
      err =>
        utils.errorWrapper(err, req, res, () =>
          utils.respond(
            req,
            res,
            'There was an error while searching for that track.'
          )
        )
    );

    queue(spotifyApi, req, res, track, (artist, playlist) =>
      utils.respond(
        req,
        res,
        `Added ${utils.formatSong(
          track.name,
          artist.name
        )} to *${playlist.name}*`
      )
    );
  },

  findme(req, res) {
    const searchTerms = req.body.text;
    if (!searchTerms) {
      utils.respond(req, res, 'Please provide a search query.');
      return;
    }

    spotifyApi.searchTracks(searchTerms, { limit: 5 }).then(
      data => {
        const attachments = data.body.tracks.items.map(item => ({
          fallback: 'test',
          callback_id: 'find_track',
          title: `${item.name} by ${item.artists[0].name}`,
          color: 'good',
          actions: [
            {
              name: 'play',
              text: 'Play now',
              type: 'button',
              value: item.id
            },
            {
              name: 'queue',
              text: 'Queue',
              type: 'button',
              value: item.id
            }
          ]
        }));

        attachments.push({
          fallback: 'load more',
          callback_id: 'find_track_more',
          actions: [
            {
              name: 'load_more',
              text: 'Load more',
              type: 'button',
              value: 'load_more'
            }
          ]
        });

        utils.respond(req, res, {
          text:
            '*WARNING!* This feature is under development and probably won\'t work!',
          attachments
        });
      },
      err =>
        utils.errorWrapper(
          err,
          req,
          res,
          'An error occured while performing the search.'
        )
    );
  },

  async playme(req, res) {
    const text = req.body.text;
    if (!text) {
      await spotifyApi
        .play()
        .then(
          () => utils.respond(req, res, 'Now playing!'),
          err => utils.errorWrapper(err, req, res, 'Couldn\'t resume music!')
        );
      return;
    }

    utils.respond(req, res, 'Give me a second...');

    const playlist = store.getActivePlaylist();
    const track = await spotifyApi.searchTracks(text).then(
      data => {
        const results = data.body.tracks.items;

        if (results.length === 0) {
          webClient.chat.postMessage(
            req.body.channel_id,
            'Couldn\'t find that track.'
          );
          return;
        }

        return results[0];
      },
      err =>
        utils.errorWrapper(err, req, res, () =>
          webClient.chat.postMessage(
            req.body.channel_id,
            'There was an error while searching for that track.'
          )
        )
    );

    const [offset, total, found] = await playlistContextOffset(
      spotifyApi,
      playlist,
      track
    );

    const formattedSong = utils.formatSong(track.name, track.artists[0].name);
    if (found) {
      await spotifyApi
        // Uncomment when https://github.com/spotify/web-api/issues/630 is fixed
        // .play({ context_uri: playlist.uri, offset: { uri: track.uri } })
        .play({ context_uri: playlist.uri, offset: { position: offset } })
        .then(
          () =>
            webClient.chat.postMessage(
              req.body.channel_id,
              `Now playing ${formattedSong}`
            ),
          err =>
            utils.errorWrapper(err, req, res, () =>
              webClient.chat.postMessage(
                req.body.channel_id,
                `${formattedSong} is already in *${playlist.name}*, but couldn't start playing it.`
              )
            )
        );

      return;
    }

    queue(spotifyApi, req, res, track, async (artist, playlist) => {
      const formattedSong = utils.formatSong(track.name, artist.name);

      spotifyApi
        // .play({ context_uri: playlist.uri, offset: { uri: track.uri } })
        .play({ context_uri: playlist.uri, offset: { position: total } })
        .then(
          () =>
            webClient.chat.postMessage(
              req.body.channel_id,
              `Now playing ${formattedSong}`
            ),
          err =>
            utils.errorWrapper(err, req, res, () =>
              webClient.chat.postMessage(
                `Added ${formattedSong} to *${playlist.name}*, but couldn't start playing it.`
              )
            )
        );
    });
  },

  pauseme(req, res) {
    spotifyApi
      .pause()
      .then(
        () => utils.respond(req, res, 'Paused!'),
        err => utils.errorWrapper(err, req, res, 'Couldn\'t pause!')
      );
  },

  next(req, res) {
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
            utils.errorWrapper(err, req, res, () =>
              webClient.chat.postMessage(
                req.body.channel_id,
                'Spotify couldn\'t skip this track!'
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
            utils.errorWrapper(err, req, res, () =>
              webClient.chat.postMessage(
                req.body.channel_id,
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
      err =>
        utils.errorWrapper(err, req, res, () =>
          callback(null, null, 'Skipping whatever\'s playing...')
        )
    );
  },

  async eradicate(req, res) {
    const data = await spotifyApi
      .getMyCurrentPlayingTrack()
      .then(data => data)
      .catch(err =>
        utils.errorWrapper(err, req, res, () =>
          utils.respond(
            req,
            res,
            'Is something playing? Spotify doesn\'t think so!'
          )
        )
      );

    const track = data.body.item;
    if (!track) {
      utils.respond(
        req,
        res,
        'Are you hearing things? If so, you might want to use `/playplaylist` to try and re-sync things.'
      );
      return;
    }

    const name = track.name;
    const artist = track.artists[0].name;

    utils.respond(req, res, {
      text: `Whoa! Are you absolutely positive that you want to delete ${utils.formatSong(
        name,
        artist
      )}?`,
      attachments: [
        {
          fallback: 'Your device doesn\'t support this.',
          callback_id: 'delete_track',
          color: 'danger',
          actions: [
            {
              name: 'delete',
              text: 'Do it.',
              type: 'button',
              style: 'danger',
              value: JSON.stringify({
                user_name: req.body.user_name,
                uri: track.uri,
                name,
                artist
              })
            },
            {
              name: 'cancel',
              text: 'Cancel',
              type: 'button',
              value: {}
            }
          ]
        }
      ]
    });
  },

  pdj(req, res) {
    const command = req.body.text.toLowerCase();

    if (command === 'on') {
      const playlistID = store.getActivePlaylistAlias();
      const playlists = store.getPlaylists();
      const playlist = playlists[playlistID];

      if (!playlist) {
        this.on = true;
        utils.respond(
          req,
          res,
          'Switched on. Add a playlist with `/addplaylist` to get started.'
        );
        return;
      }

      const playlistURI = playlist.uri;

      spotifyApi.play({ context_uri: playlistURI }).then(
        () => {
          this.on = true;
          utils.respond(
            req,
            res,
            'It begins...\nIf you can\'t hear anything, play any track in the Spotify client and try again.'
          );
        },
        err =>
          utils.errorWrapper(err, req, res, err => {
            if (err.statusCode === 403) {
              utils.respond(
                req,
                res,
                'Spotify says you\'re not a premium user!'
              );
            } else {
              utils.respond(
                req,
                res,
                `There was an error playing *${playlist.name}*`
              );
            }
          })
      );
    } else if (command === 'off') {
      spotifyApi.pause().then(
        () => {
          this.on = false;
          res.send(
            utils.inChannel(
              '_If music be the food of love, play on._ - Shakespeare\nSwitching off.'
            )
          );
        },
        err =>
          utils.errorWrapper(err, req, res, () =>
            utils.respond(req, res, 'Couldn\'t stop playing!')
          )
      );
    }
  },

  whomst(req, res) {
    spotifyApi.getMyCurrentPlayingTrack().then(
      data => {
        const track = data.body.item;
        if (!track) {
          utils.respond(
            req,
            res,
            'Are you hearing things? If so, check that `/activeuser` matches the user signed in to Spotify.'
          );
        }

        const name = track.name;
        const artist = track.artists[0].name;
        const playlist = store.getActivePlaylist();

        const storedTrack = playlist.tracks[track.id];

        if (storedTrack) {
          const requester = storedTrack.requester;
          utils.respond(
            req,
            res,
            `${utils.formatSong(
              name,
              artist
            )} was last requested by <@${requester}>`
          );
        } else {
          utils.respond(
            req,
            res,
            `${utils.formatSong(
              name,
              artist
            )} was added directly through Spotify :thumbsdown:`
          );
        }
      },
      err =>
        utils.errorWrapper(err, req, res, () =>
          utils.respond(req, res, 'Couldn\'t read the currently playing track')
        )
    );
  },

  listusers(req, res) {
    const users = store.getUsers();
    const userNames = Object.keys(users).join('\n');
    let message = `Authenticated users:\n${userNames}`;
    if (users.length === 0) {
      message =
        'No users have been authenticated yet! Try `/spotifyauth` to register yourself.';
    }

    utils.respond(req, res, message);
  },

  whichuser(req, res) {
    const activeUser = store.getActiveUserName();
    utils.respond(req, res, `The active user is <@${activeUser}>`, req);
  },

  commandeer(req, res) {
    const userName = req.body.user_name;
    const user = store.getUsers()[userName];
    if (!user) {
      utils.respond(
        req,
        res,
        'You\'re not authenticated with Spotify. Try `/spotifyauth` if you\'d like to get set up',
        req
      );
      return;
    }

    store.setActiveUser(userName);
    spotifyApi.setAccessToken(user.access_token);
    spotifyApi.setRefreshToken(user.refresh_token);

    spotifyApi.refreshAccessToken().then(
      data => {
        spotifyApi.setAccessToken(data.body['access_token']);
        utils.respond(req, res, 'You are now the active user!');
      },
      err =>
        utils.errorWrapper(err, req, res, () =>
          utils.respond(
            'There was an authentication failure. Please try again!'
          )
        )
    );
  },

  shuffle(req, res) {
    const text = req.body.text;
    if (!text) {
      utils.respond(req, res, 'Please specify `on` or `off`.');
      return;
    }

    const state = text.toLowerCase() === 'on';
    spotifyApi
      .setShuffle({ state })
      .then(
        () =>
          utils.respond(req, res, `Shuffle is now ${state ? 'on' : 'off'}.`),
        err =>
          utils.errorWrapper(err, req, res, () =>
            utils.respond(
              req,
              res,
              'An error occurred while setting shuffle state.'
            )
          )
      );
  }
});
