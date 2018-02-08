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
        thumb_url: item.album.images.length ? item.album.images[1].url : '',
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

  inChannel(rawData) {
    const formatted = {};

    if (typeof rawData === 'string') {
      formatted.text = rawData;
    } else {
      Object.assign(formatted, rawData);
    }

    formatted.response_type = 'in_channel';
    return formatted;
  },

  slackAt(req, rawData) {
    const formatted = this.inChannel(rawData);

    const text = formatted.text;
    const userID = typeof req == 'string' ? req : req.body.user_id;
    formatted.text = `<@${userID}>: ${text}`;

    return formatted;
  },

  getWebClient() {
    return new WebClient(process.env.SLACK_API_TOKEN);
  },

  getErrorMessage(statusCode, custom) {
    const genericError = 'There was a problem handling your request.';
    const errors = {
      401: 'Spotify authorisation failed. Try /spotifyauth again.',
      403: 'Spotify says that you don\'t have permission to do that!',
      404: 'Spotify returned 404. Either a bad request was made, or, more likely, there\'s a problem with the Spotify API.',
      500: 'Spotify had an internal server error. Don\'t shoot the messenger!',
      502: 'The Spotify API is down. Don\'t shoot the messenger!',
      503: 'The Spotify API is down. Don\'t shoot the messenger!'
    };

    return errors[statusCode] || custom || genericError;
  }
};
