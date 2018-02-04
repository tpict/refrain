const { getErrorMessage } = require('../utils');
const logger = require('../logger');
const { needsPower, needsActive, needsSetup } = require('./permission_wrapper');

const endpoints = [
  ['/addplaylist'],
  ['/commandeer'],
  ['/eradicate', needsPower, needsSetup],
  ['/findme', needsPower, needsSetup],
  ['/listplaylists', needsSetup],
  ['/listusers', needsSetup],
  ['/next', needsPower, needsSetup],
  ['/pauseme', needsPower],
  ['/playme', needsPower],
  ['/refrain', needsActive],
  ['/shuffle', needsPower],
  ['/whichplaylist', needsSetup],
  ['/whichuser', needsSetup],
  ['/whomst', needsPower, needsSetup]
];

const wrapper = handler => async (req, res) => {
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
};

module.exports = app =>
  endpoints.forEach(endpointArgs => {
    const name = endpointArgs[0];
    endpointArgs.push(wrapper(require('.' + name)));
    app.post.apply(app, endpointArgs);
  });
