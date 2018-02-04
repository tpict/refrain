const { getErrorMessage } = require('../utils');
const logger = require('../logger');
const { wrapper } = require('./permission_wrapper');

const endpoints = [
  { name: '/addplaylist', handler: require('./addplaylist') },
  { name: '/commandeer', handler: require('./commandeer') },
  { name: '/eradicate', handler: wrapper(require('./eradicate'), true) },
  { name: '/findme', handler: wrapper(require('./findme'), true) },
  { name: '/listplaylists', handler: wrapper(require('./listplaylists')) },
  { name: '/listusers', handler: wrapper(require('./listusers')) },
  { name: '/next', handler: wrapper(require('./next'), true) },
  { name: '/pauseme', handler: wrapper(require('./pauseme'), true) },
  { name: '/playme', handler: wrapper(require('./playme'), true) },
  { name: '/refrain', handler: require('./refrain') },
  { name: '/shuffle', handler: wrapper(require('./shuffle'), true) },
  { name: '/whichplaylist', handler: require('./whichplaylist') },
  { name: '/whichuser', handler: require('./whichuser') },
  { name: '/whomst', handler: wrapper(require('./whomst'), true) }
];

module.exports = app =>
  endpoints.forEach(({ name, handler }) =>
    app.post(name, async function (req, res) {
      try {
        res.send(await handler(req));
      } catch (err) {
        logger.error(err);
        res.send(getErrorMessage(err.statusCode));

        // Easier debugging in testing
        if (process.env.NODE_ENV !== 'production') {
          throw err;
        }
      }
    })
  );
