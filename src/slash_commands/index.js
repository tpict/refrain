const { getErrorMessage } = require('../utils');

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

module.exports = app =>
  endpoints.forEach(({ name, handler }) =>
    app.post(name, async function (req, res) {
      const response = await handler(req).catch(
        error => {
          console.log(error);
          return getErrorMessage(error.statusCode);
        }
      );

      res.send(response);
    })
  );
