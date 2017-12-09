const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require ('../src/app');
const sinon = require('sinon');
const should = chai.should();
const nock = require('nock');

process.env.NODE_ENV = 'test';

chai.use(chaiHttp);
describe('Spotify interactions', function () {
  beforeEach(function () {
  });

  it('should work', function () {});

  it('test', function (done) {
    nock('https://api.spotify.com').put('/v1/me/player/shuffle').query({
      state: true
    }).reply(200, {});

    const body = {
      token: 'gvbhX3Gbt3GrOKb1pm3zLjH5',
      team_id: 'T02AQEVPE',
      team_domain: 'mypebble',
      channel_id: 'D1KFLA0JF',
      channel_name: 'directmessage',
      user_id: 'U17U357GF',
      user_name: 'tom.picton',
      command: '/shuffled',
      text: 'on',
      response_url:
        'https://hooks.slack.com/commands/T02AQEVPE/283740530289/LLnz6BT6vH6Meb0q7Zq4ysOe',
      trigger_id: '283598364096.2364505796.dbebcef467aaa5524d5a58cdd1c95af1'
    };

    chai
      .request(app)
      .post('/shuffle')
      .send(body)
      .end((err, res) => {
        console.log(err, res);
        done();
      });
  });
});
