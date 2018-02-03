const { createLogger, format, transports } = require('winston');
const { combine, timestamp, prettyPrint } = format;

module.exports = createLogger({
  level: 'info',
  format: combine(timestamp(), prettyPrint()),
  transports: [
    new transports.File({ filename: 'error.log', level: 'error' }),
    new transports.File({ filename: 'combined.log' }),
    new transports.Console()
  ]
});
