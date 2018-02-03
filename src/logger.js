const moment = require('moment');
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf } = format;

const simpleFormat = printf(info => {
  const time = moment(info.timestamp).format('YYYY-MM-DD HH:mm:ss');
  return `${time} ${info.level}: ${info.message}`;
});

module.exports = createLogger({
  level: 'info',
  format: combine(timestamp(), simpleFormat),
  transports: [
    new transports.File({ filename: 'error.log', level: 'error' }),
    new transports.File({ filename: 'combined.log' }),
    new transports.Console()
  ]
});
