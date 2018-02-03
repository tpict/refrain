const endpoints = [
  { name: '/addplaylist', handler: require('./addplaylist') },
  { name: '/commandeer', handler: require('./commandeer') },
  { name: '/eradicate', handler: require('./eradicate') },
  { name: '/findme', handler: require('./findme') },
  { name: '/listplaylists', handler: require('./listplaylists') },
  { name: '/listusers', handler: require('./listusers') },
  { name: '/next', handler: require('./next') },
  { name: '/pauseme', handler: require('./pauseme') },
  { name: '/playme', handler: require('./playme') },
  { name: '/refrain', handler: require('./refrain') },
  { name: '/shuffle', handler: require('./shuffle') },
  { name: '/whichplaylist', handler: require('./whichplaylist') },
  { name: '/whichuser', handler: require('./whichuser') },
  { name: '/whomst', handler: require('./whomst') }
];

const errors = {
  403: 'Spotify says that you don\'t have permission to do that!',
  404: 'Spotify returned 404. Either a bad request was made, or, more likely, there\'s a problem with the Spotify API.',
  500: 'Spotify had an internal server error. Don\'t shoot the messenger!',
  502: 'The Spotify API is down. Don\'t shoot the messenger!',
  503: 'The Spotify API is down. Don\'t shoot the messenger!'
};

const genericError = 'There was a problem handling your request.';

module.exports = app =>
  endpoints.forEach(({ name, handler }) =>
    app.post(name, async function (req, res) {
      const response = await handler(req).catch(
        error => {
          console.log(error);
          return errors[error.statusCode] || genericError;
        }
      );

      res.send(response);
    })
  );
