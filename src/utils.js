const { URL } = require('url');
const WebClient = require('@slack/client').WebClient;

module.exports = {
  getSearchAttachments(query, data) {
    const attachments = data.body.tracks.items.map(item => {
      const text = `Artist: ${item.artists[0].name}\nAlbum: ${item.album.name}`;
      return {
        fallback: `Search result: ${text}`,
        callback_id: 'find_track',
        title: item.name,
        text,
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
      };
    });

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

  sleep(duration) {
    return new Promise(resolve => setTimeout(resolve, duration));
  },

  // Handle common HTTP error responses
  errorWrapper(err, callback = () => {}) {
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

  getWebClient() {
    return new WebClient(process.env.SLACK_API_TOKEN);
  }
};
