const { URL } = require('url');
const SpotifyWebApi = require('spotify-web-api-node');
const WebClient = require('@slack/client').WebClient;
const moment = require('moment');

const store = require('./store');

module.exports = {
  getSearchAttachments(query, data) {
    const attachments = data.body.tracks.items.map(item => ({
      fallback: 'test',
      callback_id: 'find_track',
      title: item.name,
      text: `Artist: ${item.artists[0].name}\nAlbum: ${item.album.name}`,
      thumb_url: item.album.images[1].url,
      color: 'good',
      actions: [
        {
          name: 'play',
          text: 'Play now',
          type: 'button',
          value: JSON.stringify({
            id: item.id,
            uri: item.uri,
            name: item.name,
            artists: item.artists
          })
        },
        {
          name: 'queue',
          text: 'Queue',
          type: 'button',
          value: JSON.stringify({
            id: item.id,
            uri: item.uri,
            name: item.name,
            artists: item.artists
          })
        }
      ]
    }));

    const nextURL = data.body.tracks.next;
    if (nextURL) {
      const searchParams = new URL(nextURL).searchParams;

      attachments.push({
        fallback: 'load more',
        callback_id: 'find_track_more',
        actions: [
          {
            name: 'load_more',
            text: 'Load more',
            type: 'button',
            value: JSON.stringify({
              offset: searchParams.get('offset'),
              limit: searchParams.get('limit'),
              query
            })
          }
        ]
      });
    }

    return attachments;
  },

  // Find the index of the given track in the given playlist.
  // This is a work-around for a bug in the Spotify API that prevents specifying
  // a playlist offset by URI.
  // https://github.com/spotify/web-api/issues/630
  async playlistContextOffset(spotifyApi, playlist, track) {
    const { userID, playlistID } = this.splitPlaylistURI(playlist.uri);

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
  },

  sleep(duration) {
    return new Promise(resolve => setTimeout(resolve, duration));
  },

  // Handle common HTTP error responses
  errorWrapper(err, callback) {
    console.error(err);

    const responses = {
      403: 'Spotify says that you don\'t have permission to do that!',
      404: 'Spotify returned 404. Either a bad request was made, or, more likely, there\'s a problem with the Spotify API.',
      500: 'Spotify had an internal server error. Don\'t shoot the messenger!',
      502: 'The Spotify API is down. Don\'t shoot the messenger!',
      503: 'The Spotify API is down. Don\'t shoot the messenger!'
    };

    callback(responses[err.statusCode]);
  },

  inChannel(data) {
    if (typeof data === 'string') {
      data = { text: data };
    }

    data.response_type = 'in_channel';
    return data;
  },

  respond(req, res, rawData) {
    const data = this.inChannel(rawData);
    const text = data.text;

    const userName = typeof req == 'string' ? req : req.body.user_name;

    data.text = this.formatResponse(userName, text);
    res.send(data);
  },

  formatResponse(userName, text) {
    return `<@${userName}>: ${text}`;
  },

  formatSong(trackName, artistName) {
    return `*${trackName}* by *${artistName}*`;
  },

  splitPlaylistURI(uri) {
    const splitURI = uri.split(':');
    return { userID: splitURI[2], playlistID: splitURI[4] };
  },

  async getSpotifyApi() {
    const spotifyApi = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      redirectUri: process.env.SPOTIFY_REDIRECT_URI
    });

    const activeUser = store.getActiveUser();
    const activeUserName = store.getActiveUserName();

    const accessToken = activeUser.access_token;
    const refreshToken = activeUser.refresh_token;

    spotifyApi.setAccessToken(accessToken);
    spotifyApi.setRefreshToken(refreshToken);

    const tokenExpiry = moment(activeUser.token_expiry);
    if (!tokenExpiry || moment() > tokenExpiry) {
      const data = await spotifyApi
        .refreshAccessToken()
        .then(data => data, err => console.log(err));

      spotifyApi.setAccessToken(data.body['access_token']);

      activeUser.access_token = data.body['access_token'];
      activeUser.token_expiry = moment().add(data.body['expires_in'], 'seconds');
      store.setUser(activeUserName, activeUser);
    }

    return spotifyApi;
  },

  getWebClient() {
    return new WebClient(process.env.SLACK_API_TOKEN);
  }
};
