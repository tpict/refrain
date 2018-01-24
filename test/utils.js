const sinon = require('sinon');
const storage = require('node-persist');

const store = require('../src/store');

class MockStorage {
  constructor() {
    this.storage = null;
  }

  setup() {
  sinon.stub(storage, 'initSync').callsFake(() => {
    this.storage = {};
  });

  sinon.stub(storage, 'getItemSync').callsFake((key) => {
    return this.storage[key] || null;
  });

  sinon.stub(storage, 'setItemSync').callsFake((key, data) => {
    this.storage[key] = data;
  });

  sinon.stub(storage, 'clearSync').callsFake(() => {
    this.storage = {};
  });
  }
}

const mockStorage = new MockStorage();
mockStorage.setup();

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

  setDefaultUsers() {
    store.setUsers({
      'bing.bong': {
        id: 'myID',
        access_token: 'myAccessToken',
        refresh_token: 'myRefreshToken',
        token_expiry: '2049-01-01'
      }
    });
    store.setActiveUser('bing.bong');
  }
};
