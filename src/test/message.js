require('dotenv').config();
const app = require('../server.js');
const mongoose = require('mongoose');
const chai = require('chai');
const chaiHttp = require('chai-http');
const assert = chai.assert;

const User = require('../models/user.js');
const Message = require('../models/message.js');

chai.config.includeStack = true;

const expect = chai.expect;
const should = chai.should();
chai.use(chaiHttp);

/**
 * root level hooks
 */
after((done) => {
  // required because https://github.com/Automattic/mongoose/issues/1251#issuecomment-65793092
  mongoose.models = {};
  mongoose.modelSchemas = {};
  mongoose.connection.close();
  done();
});

describe('Message API endpoints', () => {
  let user;
  let message1;
  let message2;

  beforeEach(async () => {
    user = new User({
      username: 'testuser',
      password: 'testpassword',
    });
    await user.save();
    message1 = new Message({
      title: 'Test Message 1',
      body: 'Test Body 1',
      author: user._id,
    });
    message2 = new Message({
      title: 'Test Message 2',
      body: 'Test Body 2',
      author: user._id,
    });
    await Promise.all([message1.save(), message2.save()]);
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Message.deleteMany({});
  });

  it('should load all messages', async () => {
    const res = await chai.request(app).get('/messages');
    expect(res).to.have.status(200);
    expect(res.body.messages).to.be.an('array');
    expect(res.body.messages.length).to.equal(2);
  });

  it('should get one specific message', async () => {
    const res = await chai.request(app).get(`/messages/${message1._id}`);
    expect(res).to.have.status(200);
    expect(res.body.message).to.be.an('object');
    expect(res.body.message.title).to.equal(message1.title);
    expect(res.body.message.body).to.equal(message1.body);
    expect(res.body.message.author).to.equal(user._id.toString());
  });

  it('should post a new message', async () => {
    const res = await chai
      .request(app)
      .post('/messages')
      .send({
        title: 'Test Message 3',
        body: 'Test Body 3',
        author: user._id,
      });
    const message = await Message.findOne({ title: 'Test Message 3' });
    expect(res).to.have.status(200);
    expect(message).to.be.an('object');
    expect(message).to.not.equal(null);
    expect(message.title).to.equal('Test Message 3');
    expect(message.body).to.equal('Test Body 3');
  });

  it('should update a message', async () => {
    const res = await chai
      .request(app)
      .put(`/messages/${message1._id}`)
      .send({ title: 'Updated Title' });
    expect(res.body.message).to.be.an('object');
    expect(res.body.message).to.have.property('title', 'Updated Title');

    // check that user is actually inserted into database
    const message = await Message.findOne({ title: 'Updated Title' });
    expect(message).to.be.an('object');
    expect(message).to.not.equal(null);
    expect(message.title).to.equal('Updated Title');
  });

  it('should delete a message', async () => {
    const res = await chai.request(app).delete(`/messages/${message1._id}`);
    expect(res).to.have.status(200);
    expect(res.body.message).to.equal('Successfully deleted.');
  });

});