const { getErrorMessage } = require('../utils');
const { needsPower, needsActive, needsSetup } = require('./permission_wrapper');

const commands = {
  '/addplaylist': [require('./addplaylist')],
  '/commandeer': [require('./commandeer')],
  '/eradicate': [needsPower, needsSetup, require('./eradicate')],
  '/findme': [needsPower, needsSetup, require('./findme')],
  '/listplaylists': [needsSetup, require('./listplaylists')],
  '/listusers': [needsSetup, require('./listusers')],
  '/next': [needsPower, needsSetup, require('./next')],
  '/pauseme': [needsPower, require('./pauseme')],
  '/playme': [needsPower, require('./playme')],
  '/refrain': [needsActive, require('./refrain')],
  '/shuffled': [needsPower, require('./shuffle')],
  '/whichplaylist': [needsSetup, require('./whichplaylist')],
  '/whichuser': [needsSetup, require('./whichuser')],
  '/whomst': [needsPower, needsSetup, require('./whomst')]
};

module.exports = app =>
  app.post('/command', async function (req, res) {
    const chain = commands[req.body.command];
    if (!chain) {
      return res.send(
        'Don\'t know how to handle that command. Your app is probably misconfigured.'
      );
    }

    let response = '';

    try {
      for (const func of chain) {
        if (response) {
          break;
        }
        response = await func(req);
      }
    } catch (err) {
      response = getErrorMessage(err.statusCode);
    }

    res.send(response);
  });
