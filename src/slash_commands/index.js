module.exports = app => {
  app.post('/pdj', require('./pdj'));
  app.post('/commandeer', require('./commandeer'));

  app.post('/findme', require('./findme'));

  app.post('/playme', require('./playme'));
  app.post('/pauseme', require('./pauseme'));
  app.post('/shuffle', require('./shuffle'));
  app.post('/next', require('./next'));
  app.post('/eradicate', require('./eradicate'));

  app.post('/playplaylist', require('./playplaylist'));
  app.post('/addplaylist', require('./addplaylist'));
  app.post('/removeplaylist', require('./removeplaylist'));
  app.post('/whichplaylist', require('./whichplaylist'));
  app.post('/listplaylists', require('./listplaylists'));

  app.post('/whomst', require('./whomst'));
  app.post('/whichuser', require('./whichuser'));
  app.post('/listusers', require('./listusers'));
};