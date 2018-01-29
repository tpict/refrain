const User = require('../src/models/user');

module.exports = {
  baseSlackRequest(fields = {}) {
    return Object.assign(
      {
        token: 'mYslacKTOkeN123456789000',
        team_id: 'T0AAAAAAA',
        team_domain: 'refrain',
        channel_id: 'D1AAAAAAA',
        channel_name: 'directmessage',
        user_id: 'U1AAAAAAA',
        user_name: 'bing.bong',
        command: '',
        text: '',
        response_url:
        'https://hooks.slack.com/commands/T0AAAAAAA/123456789000/AAAAAAAAAAAAAAAAAAAAAAAA',
        trigger_id: '123456789000.1234567890.abcdeff123aaa1111111111111111111'
      },
      fields
    );
  },

  async setDefaultUsers(callback) {
    await User.remove({});
    const user = new User({
      slackID: 'U1AAAAAAA',
      spotifyAccessToken: 'myAccessToken',
      spotifyRefreshToken: 'myRefreshToken',
      spotifyTokenExpiry: '2049-01-01',
      active: true
    });
    return user.save(callback);
  }
};
