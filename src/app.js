const express = require('express');
const bodyParser = require('body-parser');
const storage = require('node-persist');

const app = express();
const urlencodedParser = bodyParser.urlencoded({ extended: false });

storage.initSync();

const SpotifyWebApi = require('spotify-web-api-node');

const spotifyApi = new SpotifyWebApi({
  clientId: require('./credentials').spotifyClientID,
  clientSecret: require('./credentials').spotifyClientSecret,
  redirectUri: require('./credentials').spotifyRedirectURI
});

const accessToken = storage.getItemSync('access_token');
const refreshToken = storage.getItemSync('refresh_token');

let authenticated = false;
if (accessToken && refreshToken) {
  spotifyApi.setAccessToken(accessToken);
  spotifyApi.setRefreshToken(refreshToken);
  authenticated = true;

  spotifyApi
    .refreshAccessToken()
    .then(
      data => spotifyApi.setAccessToken(data.body['access_token']),
      err => console.log(err)
    );
}

function inChannel(data) {
  if (typeof data === 'string') {
    data = { text: data };
  }

  data.response_type = 'in_channel';
  return data;
}

function directed(rawData, req) {
  if (!req) {
    console.error('app#directed should be supplied a request from Spotify');
    return;
  }

  const data = inChannel(rawData);
  const text = data.text;
  data.text = `<@${req.body.user_name}>: ${text}`;
  return data;
}

const scope = [
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-public',
  'playlist-modify-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing'
];

const generateRandomString = function (length) {
  var text = '';
  var possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

app.post('/spotifyauth', urlencodedParser, function (req, res) {
  res.send(
    directed(
      spotifyApi.createAuthorizeURL(scope, generateRandomString(16)),
      req
    )
  );
});

app.get('/callback', function (req, res) {
  const code = req.query.code;
  spotifyApi.authorizationCodeGrant(code).then(
    data => {
      const accessToken = data.body['access_token'];
      const refreshToken = data.body['refresh_token'];

      storage.setItemSync('access_token', accessToken);
      storage.setItemSync('refresh_token', refreshToken);

      spotifyApi.setAccessToken(accessToken);
      spotifyApi.setRefreshToken(refreshToken);

      res.send('Auth done!');
    },
    err => {
      res.send(err);
    }
  );
});

require('./slack_auth')(app);

function getUserID() {
  return storage.getItemSync('user_id');
}

function getPlaylists() {
  return storage.getItemSync('playlists') || {};
}

function getActivePlaylistID() {
  return storage.getItemSync('active_playlist');
}

function getActivePlaylist() {
  return getPlaylists()[getActivePlaylistID()];
}

app.post('/test', urlencodedParser, function (req, res) {
  console.log(req.body);

  let message;
  const spotifyUserID = getUserID();

  if (!spotifyUserID) {
    message =
      'Looks like you haven\'t set up Spotify yet. Ask your MC for ' +
      'assistance.';
  } else {
    message = `Hi! Your Spotify ID is ${spotifyUserID}`;
  }
  res.send(message);
});

app.post('/addplaylist', urlencodedParser, function (req, res) {
  console.log(req.body);

  const splitText = req.body.text.split(' ');
  if (splitText.length !== 2) {
    res.send(
      directed(
        'Didn\'t catch that. Give me an alphanumeric alias for your playlist ' +
          'and its ID (the bit after the last slash in the playlist URL).',
        req
      )
    );
    return;
  }

  const [alias, playlistID] = splitText;

  spotifyApi.getPlaylist(getUserID(), playlistID).then(
    function (data) {
      const name = data.body.name;

      const playlists = getPlaylists();
      playlists[alias] = {
        id: playlistID,
        tracks: {},
        uri: data.body.uri,
        name
      };
      storage.setItemSync('playlists', playlists);

      console.log(data);

      res.send(
        directed(
          `Added your playlist *${name}* under the alias *${alias}*.`,
          req
        )
      );
    },
    function (err) {
      console.log(err);
      res.send(directed('Couldn\'t add that playlist!', req));
    }
  );
});

app.post('/listplaylists', urlencodedParser, function (req, res) {
  console.log(req.body);

  const playlists = getPlaylists();
  const userID = getUserID();
  const aliases = Object.keys(playlists);

  const requests = aliases.map(alias =>
    spotifyApi.getPlaylist(userID, playlists[alias].id)
  );
  Promise.all(requests).then(
    values => {
      console.log(values);
      const lines = values.map(
        (value, index) => `${aliases[index]}: ${value.body.name}`
      );
      res.send(directed(lines.join('\n'), req));
    },
    err => {
      console.log(err);
      res.send(directed('Looks like you have a misconfigured playlist.', req));
    }
  );
});

app.post('/setplaylist', urlencodedParser, function (req, res) {
  console.log(req.body);

  const playlists = getPlaylists();
  const text = req.body.text;
  const playlist = playlists[text];

  if (!playlist) {
    res.send(directed(`Couldn't find a playlist called *${text}*.`, req));
    return;
  }

  spotifyApi.getPlaylist(getUserID(), playlist.id).then(
    data => {
      storage.setItemSync('active_playlist', text);

      const firstTrack = data.body.tracks.items[0];
      if (!firstTrack) {
        res.send(
          directed(
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
          () => res.send(directed(`Now playing from *${playlist.name}*!`)),
          err => console.log(err)
        );
    },
    () => res.send(directed('Looks like a misconfigured playlist'))
  );
});

app.post('/whichplaylist', urlencodedParser, function (req, res) {
  console.log(req.body);

  const playlistID = storage.getItemSync('active_playlist');
  const playlists = getPlaylists();
  const activePlaylist = playlists[playlistID];

  if (activePlaylist) {
    res.send(
      directed(
        `The active playlist is *${activePlaylist.name}*. If that's not what \
you're hearing, you'll have to select it from Spotify yourself.`,
        req
      )
    );
  } else {
    res.send(directed('There is no active playlist!', req));
  }
});

app.post('/queue', urlencodedParser, function (req, res) {
  console.log(req.body);

  spotifyApi.searchTracks(req.body.text).then(
    data => {
      const results = data.body.tracks.items;

      if (results.length === 0) {
        req.send(directed('Couldn\'t find that track.', req));
        return;
      } else {
        const firstHit = results[0];
        console.log(firstHit);
        const firstArtist = firstHit.artists[0];
        const playlistAlias = getActivePlaylistID();
        const playlists = getPlaylists();
        const playlist = playlists[playlistAlias];

        spotifyApi
          .addTracksToPlaylist(getUserID(), playlist.id, [firstHit.uri])
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
                directed(
                  `Added *${firstHit.name}* by *${firstArtist.name}* to *${playlist.name}*`,
                  req
                )
              );
            },
            err => {
              console.log(err);
              res.send(
                directed(
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
        directed('There was an error while searching for that track.', req)
      );
    }
  );
});

app.post('/next', urlencodedParser, function (req, res) {
  console.log(req.body);

  const callback = skipped => {
    spotifyApi.skipToNext().then(
      () => {
        setTimeout(
          () =>
            spotifyApi.getMyCurrentPlayingTrack().then(
              data => {
                const name = data.body.item.name;
                const artist = data.body.item.artists[0].name;

                res.send(
                  directed(
                    `Skipping ${skipped}...\nNow playing *${name}* by *${artist}*`,
                    req
                  )
                );
              },
              err => {
                console.log(err);
                res.send(
                  directed(
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
        res.send(directed('Spotify couldn\'t skip this track!'));
      }
    );
  };

  spotifyApi.getMyCurrentPlayingTrack().then(
    data => {
      const skippedName = data.body.item.name;
      const skippedArtist = data.body.item.artists[0].name;
      callback(`*${skippedName}* by *${skippedArtist}*`);
    },
    err => {
      console.log(err);
      callback('whatever\'s playing');
    }
  );
});

app.post('/pdj', urlencodedParser, function (req, res) {
  console.log(req.body);

  const command = req.body.text.toLowerCase();

  if (command === 'on') {
    const playlistID = getActivePlaylistID();
    const playlists = getPlaylists();
    const playlist = playlists[playlistID];
    const playlistURI = playlist.uri;

    spotifyApi.play({ context_uri: playlistURI }).then(
      data => {
        console.log(data);
        res.send(directed('It begins', req));
      },
      err => {
        console.log(err);

        if (err.statusCode === 403) {
          res.send(directed('Spotify says you\'re not a premium user!', req));
        } else {
          res.send(
            directed(`There was an error playing *${playlist.name}*`, req)
          );
        }
      }
    );
  } else if (command === 'off') {
    spotifyApi.pause().then(
      () => res.send(directed('No more music', req)),
      err => {
        console.log(err);
        res.send(directed('Couldn\'t stop playing!', req));
      }
    );
  }
});

// app.post('/loudness', urlencodedParser, function (req, res) {
//   console.log(req.body);

app.listen(4390, () => console.log('Example app listening on port 4390!'));
