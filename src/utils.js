module.exports = {
  sleep(duration) {
    return new Promise(resolve => setTimeout(resolve, duration));
  },

  // Handle common HTTP error responses
  errorWrapper(err, req, res, callback) {
    console.error(err);

    if (err.statusCode === 500) {
      this.respond(
        req,
        res,
        'Spotify had an internal server error. Don\'t shoot the messenger!'
      );
      return;
    } else if (err.statusCode === 502) {
      this.respond(
        req,
        res,
        'The Spotify API is down. Don\'t shoot the messenger!'
      );
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
    return data;
  },

  formatSong(trackName, artistName) {
    return `*${trackName}* by *${artistName}*`;
  }
};
