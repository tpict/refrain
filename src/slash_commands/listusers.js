const User = require('../models/user');
const utils = require('../utils');

module.exports = async function listusers(req) {
  const userIDList = await User.find({}).select('-_id slackID');
  const formattedUserIDList = userIDList.map(obj => obj.slackID).join('\n');
  return utils.slackAt(req, `Authenticated users:\n${formattedUserIDList}`);
};
