const storage = require('node-persist');

const utils = require('./utils');
const store = require('./store');

const queue = async function (spotifyApi, req, res, track, callback) {
  const playlists = store.getPlaylists();
  const playlistAlias = store.getActivePlaylistAlias();
  const playlist = store.getActivePlaylist();
  const artist = track.artists[0];

  spotifyApi
    .addTracksToPlaylist(store.getActiveUserID(), playlist.id, [track.uri])
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
module.exports = spotifyApi => ({
  on: false,

  // Commands which don't require authentication.
  noAuth: ['listusers', 'whichuser', 'setuser', 'pdj'],

  addplaylist(req, res) {
    const splitText = req.body.text.split(' ');
    if (splitText.length !== 2) {
      utils.respond(
        req,
        res,
        'Didn\'t catch that. Give me an alphanumeric alias for your playlist and its ID (the bit after the last slash in the playlist URL).'
      );
      return;
    }

    const [alias, playlistID] = splitText;

    spotifyApi.getPlaylist(store.getActiveUserID(), playlistID).then(
      data => {
        const name = data.body.name;

        const playlists = store.getPlaylists();
        playlists[alias] = {
          id: playlistID,
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
          utils.respond(req, res, 'Couldn\'t add that playlist!')
        )
    );
  },

  listplaylists(req, res) {
    const playlists = store.getPlaylists();
    const userID = store.getActiveUserID();
    const aliases = Object.keys(playlists);

    const requests = aliases.map(alias =>
      spotifyApi.getPlaylist(userID, playlists[alias].id)
    );
    Promise.all(requests).then(
      values => {
        const lines = values.map(
          (value, index) => `${aliases[index]}: ${value.body.name}`
        );
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
      .getPlaylist(store.getActiveUserID(), playlist.id)
      .then(data => {
        storage.setItemSync('active_playlist', text);

        const firstTrack = data.body.tracks.items[0];
        if (!firstTrack) {
          utils.respond(
            `Commands will now act on the *${text}* playlist. You'll have to play it from Spotify yourself. Sorry!`
          );
          return;
        }

        return spotifyApi.play({
          context_uri: playlist.uri,
          offset: {
            uri: firstTrack.track.uri
          }
        });
      })
      .then(() =>
        utils.respond(
          req,
          res,
          `Now playing from *${playlist.name}*! Commands will now act on this playlist.`
        )
      )
      .catch(err =>
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

  async playme(req, res) {
    const text = req.body.text;
    if (!text) {
      await spotifyApi.play();
      return;
    }

    const playlist = store.getActivePlaylist();
    const track = await spotifyApi.searchTracks(text).then(
      data => {
        const results = data.body.tracks.items;

        if (results.length === 0) {
          utils.respond(req, res, 'Couldn\'t find that track.', req);
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

    const formattedSong = utils.formatSong(track.name, track.artists[0].name);
    if (playlist.tracks[track.id]) {
      await spotifyApi
        .play({ context_uri: playlist.uri, offset: { uri: track.uri } })
        .then(
          () => utils.respond(req, res, `Now playing ${formattedSong}`),
          err =>
            utils.errorWrapper(err, req, res, () =>
              utils.respond(
                req,
                res,
                `${formattedSong} is already in *${playlist.name}*, but couldn't start playing it.`
              )
            )
        );

      return;
    }

    queue(spotifyApi, req, res, track, async (artist, playlist) => {
      const formattedSong = utils.formatSong(track.name, artist.name);

      spotifyApi
        .play({ context_uri: playlist.uri, offset: { uri: track.uri } })
        .then(
          () => utils.respond(req, res, `Now playing ${formattedSong}`),
          err =>
            utils.errorWrapper(err, req, res, () =>
              utils.respond(
                req,
                res,
                `Added ${formattedSong} to *${playlist.name}*, but couldn't start playing it.`
              )
            )
        );
    });
  },

  pauseme(req, res) {
    spotifyApi.pause().then(
      () => utils.respond(req, res, 'Paused!'),
      err => utils.errorWrapper(err, req, res, 'Couldn\'t pause!')
    );
  },

  next(req, res) {
    const callback = (skippedName, skippedArtist, errorText) => {
      spotifyApi
        .skipToNext()
        .then(
          async () => {
            await utils.sleep(500);
            return spotifyApi.getMyCurrentPlayingTrack();
          },
          err =>
            utils.errorWrapper(err, req, res, () =>
              utils.respond(req, res, 'Spotify couldn\'t skip this track!')
            )
        )
        .then(
          data => {
            const track = data.body.item;
            if (!track) {
              utils.respond(
                req,
                res,
                'Out of music! You might need to use `/playplaylist`.'
              );
              return;
            }

            const name = track.name;
            const artist = track.artists[0].name;

            let skipText = errorText;
            if (!skipText) {
              skipText =
                skippedName == 'Rattlesnake'
                  ? 'You are weak. :snake:'
                  : `Skipping ${utils.formatSong(
                      skippedName,
                      skippedArtist
                    )}...`;
            }

            utils.respond(
              req,
              res,
              `${skipText}\nNow playing ${utils.formatSong(name, artist)}`
            );
          },
          err =>
            utils.errorWrapper(err, req, res, () =>
              utils.respond(
                req,
                res,
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
          callback(null, null, 'whatever\'s playing')
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

  setuser(req, res) {
    const text = req.body.text;
    const user = store.getUsers()[text];
    if (!user) {
      utils.respond(
        req,
        res,
        'That user isn\'t authenticated with Spotify. Try `/listusers` to see who is.',
        req
      );
      return;
    }

    store.setActiveUser(text);
    spotifyApi.setAccessToken(user.access_token);
    spotifyApi.setRefreshToken(user.refresh_token);

    spotifyApi.refreshAccessToken().then(
      data => {
        spotifyApi.setAccessToken(data.body['access_token']);
        utils.respond(req, res, `Changed the active user to <@${text}>!`);
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
