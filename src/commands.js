const storage = require('node-persist');

const utils = require('./utils');
const store = require('./store');

// Slash commands for Slack.
module.exports = (webClient, spotifyApi) => ({
  on: true,

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
        utils.errorWrapper(err, errorMessage =>
          utils.respond(
            req,
            res,
            errorMessage ||
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
        utils.errorWrapper(err, errorMessage =>
          utils.respond(
            req,
            res,
            errorMessage || 'Looks like you have a misconfigured playlist.'
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
          utils.errorWrapper(err, errorMessage =>
            utils.respond(
              req,
              res,
              errorMessage || 'Looks like a misconfigured playlist'
            )
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

  findme(req, res) {
    const searchTerms = req.body.text;
    if (!searchTerms) {
      res.send('Please provide a search query.');
      return;
    }

    spotifyApi.searchTracks(searchTerms, { limit: 3 }).then(
      data => {
        res.send({
          text:
          `You searched for "${searchTerms}":`,
          attachments: utils.getSearchAttachments(searchTerms, data)
        });
      },
      err =>
        utils.errorWrapper(err, errorMessage =>
          res.send(
            res,
            errorMessage || 'An error occured while performing the search.'
          )
        )
    );
  },

  async queue(req, res) {
    utils.respond(
      req,
      res,
      'This command has been deprecated. Please use `/findme` instead.'
    );
  },


  async playme(req, res) {
    const text = req.body.text;
    if (!text) {
      await spotifyApi
        .play()
        .then(
          () => utils.respond(req, res, 'Now playing!'),
          err =>
            utils.errorWrapper(err, errorMessage =>
              utils.respond(req, res, errorMessage || 'Couldn\'t resume music!')
            )
        );
      return;
    }

    utils.respond(
      req,
      res,
      'Selecting tracks with this command has been deprecated. Please use `/findme` instead.'
    );
  },

  pauseme(req, res) {
    spotifyApi
      .pause()
      .then(
        () => utils.respond(req, res, 'Paused!'),
        err =>
          utils.errorWrapper(err, errorMessage =>
            utils.respond(req, res, errorMessage || 'Couldn\'t pause!')
          )
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
  },

  async eradicate(req, res) {
    const data = await spotifyApi
      .getMyCurrentPlayingTrack()
      .then(data => data)
      .catch(err =>
        utils.errorWrapper(err, errorMessage =>
          utils.respond(
            req,
            res,
            errorMessage || 'Is something playing? Spotify doesn\'t think so!'
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
          utils.errorWrapper(err, errMessage =>
            utils.respond(
              req,
              res,
              errMessage || `There was an error playing *${playlist.name}*`
            )
          )
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
          utils.errorWrapper(err, errMessage =>
            utils.respond(req, res, errMessage || 'Couldn\'t stop playing!')
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
            'Are you hearing things? If so, check that `/whichuser` matches the user signed in to Spotify.'
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
        utils.errorWrapper(err, errorMessage =>
          utils.respond(
            req,
            res,
            errorMessage || 'Couldn\'t read the currently playing track'
          )
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
        utils.errorWrapper(err, errorMessage =>
          utils.respond(
            errorMessage ||
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
          utils.errorWrapper(err, errorMessage =>
            utils.respond(
              req,
              res,
              errorMessage || 'An error occurred while setting shuffle state.'
            )
          )
      );
  }
});
