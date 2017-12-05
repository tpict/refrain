module.exports = {
  sleep(duration) {
    return new Promise(resolve => setTimeout(resolve, duration));
  },

  // Handle common HTTP error responses
  errorWrapper(err, req, res, callback) {
    console.error(err);

    const responses = {
      500: 'Spotify had an internal server error. Don\'t shoot the messenger!',
      502: 'The Spotify API is down. Don\'t shoot the messenger!',
      503: 'The Spotify API is down. Don\'t shoot the messenger!'
    };

    const response = responses[err.statusCode];
    if (response) {
      this.respond(req, res, response);
      return;
    }

    callback();
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

    data.text = `<@${userName}>: ${text}`;
    res.send(data);
  },

  formatSong(trackName, artistName) {
    return `*${trackName}* by *${artistName}*`;
  },

  splitPlaylistURI(uri) {
    const splitURI = uri.split(':');
    return [splitURI[2], splitURI[4]];
  }
};
