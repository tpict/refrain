const User = require('../models/user');

module.exports = async function listusers() {
  const userIDList = await User.find({}).select('-_id slackID');
  const formattedUserIDList = userIDList
    .map(obj => `<@${obj.slackID}>`)
    .join('\n');
  return { text: `Authenticated users:\n${formattedUserIDList}` };
};
