const storage = require('node-persist');
const utils = require('./utils');

module.exports = spotifyApi => ({
  on: false,
  noAuth: [
    'listusers',
    'whichuser',
    'setuser',
    'pdj'
  ],

  addplaylist(req, res) {
    const splitText = req.body.text.split(' ');
    if (splitText.length !== 2) {
      res.send(
        utils.directed(
          'Didn\'t catch that. Give me an alphanumeric alias for your playlist ' +
            'and its ID (the bit after the last slash in the playlist URL).',
          req
        )
      );
      return;
    }

    const [alias, playlistID] = splitText;

    spotifyApi.getPlaylist(utils.getUserID(), playlistID).then(
      function (data) {
        const name = data.body.name;

        const playlists = utils.getPlaylists();
        playlists[alias] = {
          id: playlistID,
          tracks: {},
          uri: data.body.uri,
          name
        };
        storage.setItemSync('playlists', playlists);

        res.send(
          utils.directed(
            `Added your playlist *${name}* under the alias *${alias}*.`,
            req
          )
        );
      },
      function (err) {
        console.log(err);
        res.send(utils.directed('Couldn\'t add that playlist!', req));
      }
    );
  },

  listplaylists(req, res) {
    const playlists = utils.getPlaylists();
    const userID = utils.getUserID();
    const aliases = Object.keys(playlists);

    const requests = aliases.map(alias =>
      spotifyApi.getPlaylist(userID, playlists[alias].id)
    );
    Promise.all(requests).then(
      values => {
        const lines = values.map(
          (value, index) => `${aliases[index]}: ${value.body.name}`
        );
        res.send(utils.utils.directed(lines.join('\n'), req));
      },
      err => {
        console.log(err);
        res.send(
          utils.utils.directed(
            'Looks like you have a misconfigured playlist.',
            req
          )
        );
      }
    );
  },

  playplaylist(req, res) {
    const playlists = utils.getPlaylists();
    const text = req.body.text;
    const playlist = playlists[text];

    if (!playlist) {
      res.send(
        utils.directed(`Couldn't find a playlist called *${text}*.`, req)
      );
      return;
    }

    spotifyApi.getPlaylist(utils.getUserID(), playlist.id).then(
      data => {
        storage.setItemSync('active_playlist', text);

        const firstTrack = data.body.tracks.items[0];
        if (!firstTrack) {
          res.send(
            utils.directed(
              `Commands will now act on the *${text}* playlist. You'll have to play it\
 from Spotify yourself. Sorry!`,
              req
            )
          );
          return;
        }

        spotifyApi
          .play({
            context_uri: playlist.uri,
            offset: {
              uri: firstTrack.track.uri
            }
          })
          .then(
            () =>
              res.send(
                utils.directed(
                  `Now playing from *${playlist.name}*! Commands will now act on this playlist.`,
                  req
                )
              ),
            err => console.log(err)
          );
      },
      () => res.send(utils.directed('Looks like a misconfigured playlist'))
    );
  },

  whichplaylist(req, res) {
    const playlistID = storage.getItemSync('active_playlist');
    const playlists = utils.getPlaylists();
    const activePlaylist = playlists[playlistID];

    if (activePlaylist) {
      res.send(
        utils.directed(
          `The active playlist is *${activePlaylist.name}*. If that's not what \
you're hearing, you'll have to select it from Spotify yourself.`,
          req
        )
      );
    } else {
      res.send(utils.directed('There is no active playlist!', req));
    }
  },

  queue(req, res) {
    spotifyApi.searchTracks(req.body.text).then(
      data => {
        const results = data.body.tracks.items;

        if (results.length === 0) {
          res.send(utils.directed('Couldn\'t find that track.', req));
          return;
        } else {
          const firstHit = results[0];
          const firstArtist = firstHit.artists[0];
          const playlistAlias = utils.getActivePlaylistID();
          const playlists = utils.getPlaylists();
          const playlist = playlists[playlistAlias];

          spotifyApi
            .addTracksToPlaylist(utils.getUserID(), playlist.id, [firstHit.uri])
            .then(
              () => {
                playlist.tracks[firstHit.id] = {
                  requester: req.body.user_name,
                  artist: firstArtist.name,
                  name: firstHit.name
                };
                playlists[playlistAlias] = playlist;
                storage.setItemSync('playlists', playlists);

                res.send(
                  utils.directed(
                    `Added *${firstHit.name}* by *${firstArtist.name}* to *${playlist.name}*`,
                    req
                  )
                );
              },
              err => {
                console.log(err);
                res.send(
                  utils.directed(
                    `There was an error adding *${firstHit.name}* to *${playlist.name}*.`,
                    req
                  )
                );
              }
            );
        }
      },
      err => {
        console.log(err);
        res.send(
          utils.directed(
            'There was an error while searching for that track.',
            req
          )
        );
      }
    );
  },

  next(req, res) {
    const callback = (skippedName, skippedArtist) => {
      spotifyApi.skipToNext().then(
        () => {
          setTimeout(
            () =>
              spotifyApi.getMyCurrentPlayingTrack().then(
                data => {
                  const name = data.body.item.name;
                  const artist = data.body.item.artists[0].name;
                  const skipText =
                    skippedName == 'Rattlesnake'
                      ? 'You are weak.'
                      : `Skipping *${skippedName}* by *${skippedArtist}*...`;

                  res.send(
                    utils.directed(
                      `${skipText}\nNow playing *${name}* by *${artist}*`,
                      req
                    )
                  );
                },
                err => {
                  console.log(err);
                  res.send(
                    utils.directed(
                      'Managed to skip, but Spotify wouldn\'t say what\'s playing now!'
                    )
                  );
                }
              ),
            500
          );
        },
        err => {
          console.log(err);
          res.send(utils.directed('Spotify couldn\'t skip this track!'));
        }
      );
    };

    spotifyApi.getMyCurrentPlayingTrack().then(
      data => {
        const skippedName = data.body.item.name;
        const skippedArtist = data.body.item.artists[0].name;
        callback(skippedName, skippedArtist);
      },
      err => {
        console.log(err);
        callback('whatever\'s playing');
      }
    );
  },

  pdj(req, res) {
    const command = req.body.text.toLowerCase();

    if (command === 'on') {
      const playlistID = utils.getActivePlaylistID();
      const playlists = utils.getPlaylists();
      const playlist = playlists[playlistID];
      const playlistURI = playlist.uri;

      spotifyApi.play({ context_uri: playlistURI }).then(
        () => {
          this.on = true;
          res.send(utils.directed('It begins', req));
        },
        err => {
          console.log(err);

          if (err.statusCode === 403) {
            res.send(
              utils.directed('Spotify says you\'re not a premium user!', req)
            );
          } else {
            res.send(
              utils.directed(
                `There was an error playing *${playlist.name}*`,
                req
              )
            );
          }
        }
      );
    } else if (command === 'off') {
      spotifyApi.pause().then(
        () => {
          this.on = false;
          res.send(
            utils.inChannel(
              '_If music be the food of love, play on._\nShakespeare'
            )
          );
        },
        err => {
          console.log(err);
          res.send(utils.directed('Couldn\'t stop playing!', req));
        }
      );
    }
  },

  whomst(req, res) {
    spotifyApi.getMyCurrentPlayingTrack().then(
      data => {
        const track = data.body.item;
        const name = track.name;
        const artist = track.artists[0].name;
        const playlist = utils.getActivePlaylist();

        const storedTrack = playlist.tracks[track.id];

        if (storedTrack) {
          const requester = storedTrack.requester;
          res.send(
            utils.directed(
              `*${name}* by *${artist}* was requested by <@${requester}>`,
              req
            )
          );
        } else {
          res.send(
            utils.directed(
              `*${name}* by *${artist}* was added directly through Spotify :thumbsdown:`,
              req
            )
          );
        }
      },
      err => {
        console.log(err);
        res.send('Couldn\'t read the currently playing track');
      }
    );
  },

  listusers(req, res) {
    const users = utils.getUsers();
    const userNames = Object.keys(users).join('\n');
    let message = `Authenticated users:\n${userNames}`;
    if (users.length === 0) {
      message =
        'No users have been authenticated yet! Try `/spotifyauth` to register yourself.';
    }

    res.send(utils.directed(message, req));
  },

  whichuser(req, res) {
    const activeUser = utils.getActiveUser();
    res.send(utils.directed(`The active user is <@${activeUser}>`, req));
  },

  setuser(req, res) {
    const text = req.body.text;
    const user = utils.getUsers()[text];
    if (!user) {
      res.send(utils.directed('That user isn\'t authenticated with Spotify. Try `/listusers` to see who is.', req));
      return;
    }

    utils.setActiveUser(text);
    res.send(utils.directed(`Changed the active user to <@${text}>!`, req));
  }
});
