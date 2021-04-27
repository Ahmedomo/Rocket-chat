import { expect } from 'chai';

import { getCredentials, request, methodCall, api, credentials } from '../../data/api-data.js';
import { updatePermission } from '../../data/permissions.helper.js';

describe('Meteor.methods', function() {
	this.retries(0);

	before((done) => getCredentials(done));

	describe('[@getThreadMessages]', () => {
		let rid = false;
		let firstMessage = false;

		let channelName = false;

		before('create room', (done) => {
			channelName = `methods-test-channel-${ Date.now() }`;
			request.post(api('groups.create'))
				.set(credentials)
				.send({
					name: channelName,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.nested.property('group._id');
					expect(res.body).to.have.nested.property('group.name', channelName);
					expect(res.body).to.have.nested.property('group.t', 'p');
					expect(res.body).to.have.nested.property('group.msgs', 0);
					rid = res.body.group._id;
				})
				.end(done);
		});

		before('send sample message', (done) => {
			request.post(api('chat.sendMessage'))
				.set(credentials)
				.send({
					message: {
						text: 'Sample message',
						rid,
					},
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					firstMessage = res.body.message;
				})
				.end(done);
		});

		before('send sample message into thread', (done) => {
			request.post(api('chat.sendMessage'))
				.set(credentials)
				.send({
					message: {
						text: 'Second Sample message',
						rid,
						tmid: firstMessage._id,
					},
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});

		it('should fail if not logged in', (done) => {
			request.post(methodCall('getThreadMessages'))
				.send({
					message: JSON.stringify({
						method: 'getThreadMessages',
						params: [],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(401)
				.expect((res) => {
					expect(res.body).to.have.property('status', 'error');
					expect(res.body).to.have.property('message');
				})
				.end(done);
		});

		it('should return message thread', (done) => {
			request.post(methodCall('getThreadMessages'))
				.set(credentials)
				.send({
					message: JSON.stringify({
						method: 'getThreadMessages',
						params: [{ tmid: firstMessage._id }],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.a.property('success', true);
					expect(res.body).to.have.a.property('message').that.is.a('string');

					const data = JSON.parse(res.body.message);
					expect(data).to.have.a.property('result').that.is.an('array');
					expect(data.result.length).to.equal(2);
				})
				.end(done);
		});
	});

	describe('[@getMessages]', () => {
		let rid = false;
		let firstMessage = false;
		let lastMessage = false;

		let channelName = false;

		before('create room', (done) => {
			channelName = `methods-test-channel-${ Date.now() }`;
			request.post(api('groups.create'))
				.set(credentials)
				.send({
					name: channelName,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.nested.property('group._id');
					expect(res.body).to.have.nested.property('group.name', channelName);
					expect(res.body).to.have.nested.property('group.t', 'p');
					expect(res.body).to.have.nested.property('group.msgs', 0);
					rid = res.body.group._id;
				})
				.end(done);
		});

		before('send sample message', (done) => {
			request.post(api('chat.sendMessage'))
				.set(credentials)
				.send({
					message: {
						text: 'Sample message',
						rid,
					},
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					firstMessage = res.body.message;
				})
				.end(done);
		});

		before('send another sample message', (done) => {
			request.post(api('chat.sendMessage'))
				.set(credentials)
				.send({
					message: {
						text: 'Second Sample message',
						rid,
					},
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					lastMessage = res.body.message;
				})
				.end(done);
		});

		it('should fail if not logged in', (done) => {
			request.post(methodCall('getMessages'))
				.send({
					message: JSON.stringify({
						method: 'getMessages',
						params: [],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(401)
				.expect((res) => {
					expect(res.body).to.have.property('status', 'error');
					expect(res.body).to.have.property('message');
				})
				.end(done);
		});

		it('should fail if msgIds not specified', (done) => {
			request.post(methodCall('getMessages'))
				.set(credentials)
				.send({
					message: JSON.stringify({
						method: 'getMessages',
						params: [],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.a.property('success', true);
					expect(res.body).to.have.a.property('message').that.is.a('string');

					const data = JSON.parse(res.body.message);
					expect(data).to.have.a.property('error').that.is.an('object');
					expect(data.error).to.have.a.property('sanitizedError');
					expect(data.error.sanitizedError).to.have.property('error', 400);
				})
				.end(done);
		});

		it('should return the first message', (done) => {
			request.post(methodCall('getMessages'))
				.set(credentials)
				.send({
					message: JSON.stringify({
						method: 'getMessages',
						params: [[firstMessage._id]],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.a.property('success', true);
					expect(res.body).to.have.a.property('message').that.is.a('string');

					const data = JSON.parse(res.body.message);
					expect(data).to.have.a.property('result').that.is.an('array');
					expect(data.result.length).to.equal(1);
				})
				.end(done);
		});

		it('should return both messages', (done) => {
			request.post(methodCall('getMessages'))
				.set(credentials)
				.send({
					message: JSON.stringify({
						method: 'getMessages',
						params: [[firstMessage._id, lastMessage._id]],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.a.property('success', true);
					expect(res.body).to.have.a.property('message').that.is.a('string');

					const data = JSON.parse(res.body.message);
					expect(data).to.have.a.property('result').that.is.an('array');
					expect(data.result.length).to.equal(2);
				})
				.end(done);
		});
	});

	describe('[@loadHistory]', () => {
		let rid = false;
		let postMessageDate = false;
		let lastMessage = false;

		let channelName = false;

		before('create room', (done) => {
			channelName = `methods-test-channel-${ Date.now() }`;
			request.post(api('groups.create'))
				.set(credentials)
				.send({
					name: channelName,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.nested.property('group._id');
					expect(res.body).to.have.nested.property('group.name', channelName);
					expect(res.body).to.have.nested.property('group.t', 'p');
					expect(res.body).to.have.nested.property('group.msgs', 0);
					rid = res.body.group._id;
				})
				.end(done);
		});

		before('send sample message', (done) => {
			request.post(api('chat.sendMessage'))
				.set(credentials)
				.send({
					message: {
						text: 'Sample message',
						rid,
					},
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					postMessageDate = { $date: new Date().getTime() };
				})
				.end(done);
		});

		before('send another sample message', (done) => {
			request.post(api('chat.sendMessage'))
				.set(credentials)
				.send({
					message: {
						text: 'Second Sample message',
						rid,
					},
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					lastMessage = res.body.message;
				})
				.end(done);
		});

		it('should fail if not logged in', (done) => {
			request.post(methodCall('loadHistory'))
				.send({
					message: JSON.stringify({
						method: 'loadHistory',
						params: [],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(401)
				.expect((res) => {
					expect(res.body).to.have.property('status', 'error');
					expect(res.body).to.have.property('message');
				})
				.end(done);
		});

		it('should fail if roomId not specified', (done) => {
			request.post(methodCall('loadHistory'))
				.set(credentials)
				.send({
					message: JSON.stringify({
						method: 'loadHistory',
						params: [],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.a.property('success', true);
					expect(res.body).to.have.a.property('message').that.is.a('string');

					const data = JSON.parse(res.body.message);
					expect(data).to.have.a.property('error').that.is.an('object');
					expect(data.error).to.have.a.property('sanitizedError');
					expect(data.error.sanitizedError).to.have.property('error', 400);
				})
				.end(done);
		});

		it('should return all messages for the specified room', (done) => {
			request.post(methodCall('loadHistory'))
				.set(credentials)
				.send({
					message: JSON.stringify({
						method: 'loadHistory',
						params: [rid],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.a.property('success', true);
					expect(res.body).to.have.a.property('message').that.is.a('string');

					const data = JSON.parse(res.body.message);
					expect(data).to.have.a.property('result').that.is.an('object');
					expect(data.result).to.have.a.property('messages').that.is.an('array');
					expect(data.result.messages.length).to.equal(2);
				})
				.end(done);
		});

		it('should return only the first message', (done) => {
			request.post(methodCall('loadHistory'))
				.set(credentials)
				.send({
					message: JSON.stringify({
						method: 'loadHistory',
						params: [rid, postMessageDate],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.a.property('success', true);
					expect(res.body).to.have.a.property('message').that.is.a('string');

					const data = JSON.parse(res.body.message);
					expect(data).to.have.a.property('result').that.is.an('object');
					expect(data.result).to.have.a.property('messages').that.is.an('array');
					expect(data.result.messages.length).to.equal(1);
				})
				.end(done);
		});

		it('should return only one message when limit = 1', (done) => {
			request.post(methodCall('loadHistory'))
				.set(credentials)
				.send({
					message: JSON.stringify({
						method: 'loadHistory',
						params: [rid, { $date: new Date().getTime() }, 1],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.a.property('success', true);
					expect(res.body).to.have.a.property('message').that.is.a('string');

					const data = JSON.parse(res.body.message);
					expect(data).to.have.a.property('result').that.is.an('object');
					expect(data.result).to.have.a.property('messages').that.is.an('array');
					expect(data.result.messages.length).to.equal(1);
				})
				.end(done);
		});

		it('should return the messages since the last one', (done) => {
			request.post(methodCall('loadHistory'))
				.set(credentials)
				.send({
					message: JSON.stringify({
						method: 'loadHistory',
						params: [rid, null, 20, lastMessage],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.a.property('success', true);
					expect(res.body).to.have.a.property('message').that.is.a('string');

					const data = JSON.parse(res.body.message);
					expect(data).to.have.a.property('result').that.is.an('object');
					expect(data.result).to.have.a.property('messages').that.is.an('array');
					expect(data.result.messages.length).to.equal(2);
				})
				.end(done);
		});
	});

	describe('[@loadNextMessages]', () => {
		let rid = false;
		let postMessageDate = false;
		const startDate = { $date: new Date().getTime() };

		let channelName = false;

		before('create room', (done) => {
			channelName = `methods-test-channel-${ Date.now() }`;
			request.post(api('groups.create'))
				.set(credentials)
				.send({
					name: channelName,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.nested.property('group._id');
					expect(res.body).to.have.nested.property('group.name', channelName);
					expect(res.body).to.have.nested.property('group.t', 'p');
					expect(res.body).to.have.nested.property('group.msgs', 0);
					rid = res.body.group._id;
				})
				.end(done);
		});

		before('send sample message', (done) => {
			request.post(api('chat.sendMessage'))
				.set(credentials)
				.send({
					message: {
						text: 'Sample message',
						rid,
					},
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					postMessageDate = { $date: new Date().getTime() };
				})
				.end(done);
		});

		before('send another sample message', (done) => {
			request.post(api('chat.sendMessage'))
				.set(credentials)
				.send({
					message: {
						text: 'Second Sample message',
						rid,
					},
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});

		it('should fail if not logged in', (done) => {
			request.post(methodCall('loadNextMessages'))
				.send({
					message: JSON.stringify({
						method: 'loadNextMessages',
						params: [],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(401)
				.expect((res) => {
					expect(res.body).to.have.property('status', 'error');
					expect(res.body).to.have.property('message');
				})
				.end(done);
		});

		it('should fail if roomId not specified', (done) => {
			request.post(methodCall('loadNextMessages'))
				.set(credentials)
				.send({
					message: JSON.stringify({
						method: 'loadNextMessages',
						params: [],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.a.property('success', true);
					expect(res.body).to.have.a.property('message').that.is.a('string');

					const data = JSON.parse(res.body.message);
					expect(data).to.have.a.property('error').that.is.an('object');
					expect(data.error).to.have.a.property('sanitizedError');
					expect(data.error.sanitizedError).to.have.property('error', 400);
				})
				.end(done);
		});

		it('should return all messages for the specified room', (done) => {
			request.post(methodCall('loadNextMessages'))
				.set(credentials)
				.send({
					message: JSON.stringify({
						method: 'loadNextMessages',
						params: [rid],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.a.property('success', true);
					expect(res.body).to.have.a.property('message').that.is.a('string');

					const data = JSON.parse(res.body.message);
					expect(data).to.have.a.property('result').that.is.an('object');
					expect(data.result).to.have.a.property('messages').that.is.an('array');
					expect(data.result.messages.length).to.equal(2);
				})
				.end(done);
		});

		it('should return only the latest message', (done) => {
			request.post(methodCall('loadNextMessages'))
				.set(credentials)
				.send({
					message: JSON.stringify({
						method: 'loadNextMessages',
						params: [rid, postMessageDate],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.a.property('success', true);
					expect(res.body).to.have.a.property('message').that.is.a('string');

					const data = JSON.parse(res.body.message);
					expect(data).to.have.a.property('result').that.is.an('object');
					expect(data.result).to.have.a.property('messages').that.is.an('array');
					expect(data.result.messages.length).to.equal(1);
				})
				.end(done);
		});

		it('should return only one message when limit = 1', (done) => {
			request.post(methodCall('loadNextMessages'))
				.set(credentials)
				.send({
					message: JSON.stringify({
						method: 'loadNextMessages',
						params: [rid, startDate, 1],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.a.property('success', true);
					expect(res.body).to.have.a.property('message').that.is.a('string');

					const data = JSON.parse(res.body.message);
					expect(data).to.have.a.property('result').that.is.an('object');
					expect(data.result).to.have.a.property('messages').that.is.an('array');
					expect(data.result.messages.length).to.equal(1);
				})
				.end(done);
		});
	});

	describe('[@getUsersOfRoom]', () => {
		let testUser;
		let rid = false;

		let channelName = false;

		before('create room', (done) => {
			channelName = `methods-test-channel-${ Date.now() }`;
			request.post(api('groups.create'))
				.set(credentials)
				.send({
					name: channelName,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.nested.property('group._id');
					expect(res.body).to.have.nested.property('group.name', channelName);
					expect(res.body).to.have.nested.property('group.t', 'p');
					expect(res.body).to.have.nested.property('group.msgs', 0);
					rid = res.body.group._id;
				})
				.end(done);
		});

		before('create test user', (done) => {
			const username = `user.test.${ Date.now() }`;
			const email = `${ username }@rocket.chat`;
			request.post(api('users.create'))
				.set(credentials)
				.send({ email, name: username, username, password: username })
				.end((err, res) => {
					testUser = res.body.user;
					done();
				});
		});

		before('add user to room', (done) => {
			request.post(api('groups.invite'))
				.set(credentials)
				.send({
					roomId: rid,
					userId: testUser._id,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.end(done);
		});

		it('should fail if not logged in', (done) => {
			request.post(methodCall('getUsersOfRoom'))
				.send({
					message: JSON.stringify({
						method: 'getUsersOfRoom',
						params: [],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(401)
				.expect((res) => {
					expect(res.body).to.have.property('status', 'error');
					expect(res.body).to.have.property('message');
				})
				.end(done);
		});

		it('should fail if roomId not specified', (done) => {
			request.post(methodCall('getUsersOfRoom'))
				.set(credentials)
				.send({
					message: JSON.stringify({
						method: 'getUsersOfRoom',
						params: [],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.a.property('success', true);
					expect(res.body).to.have.a.property('message').that.is.a('string');

					const data = JSON.parse(res.body.message);
					expect(data).to.have.a.property('error').that.is.an('object');
					expect(data.error).to.have.a.property('sanitizedError');
					expect(data.error.sanitizedError).to.have.property('error', 400);
				})
				.end(done);
		});

		it('should return the users for the specified room', (done) => {
			request.post(methodCall('getUsersOfRoom'))
				.set(credentials)
				.send({
					message: JSON.stringify({
						method: 'getUsersOfRoom',
						params: [rid],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.a.property('success', true);
					expect(res.body).to.have.a.property('message').that.is.a('string');

					const data = JSON.parse(res.body.message);
					expect(data).to.have.a.property('result').that.is.an('object');
					expect(data.result).to.have.a.property('total', 2);
				})
				.end(done);
		});
	});

	describe('[@getUserRoles]', () => {
		it('should fail if not logged in', (done) => {
			request.post(methodCall('getUserRoles'))
				.send({
					message: JSON.stringify({
						method: 'getUserRoles',
						params: [],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(401)
				.expect((res) => {
					expect(res.body).to.have.property('status', 'error');
					expect(res.body).to.have.property('message');
				})
				.end(done);
		});

		it('should return the roles for the current user', (done) => {
			request.post(methodCall('getUserRoles'))
				.set(credentials)
				.send({
					message: JSON.stringify({
						method: 'getUserRoles',
						params: [],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.a.property('success', true);
					expect(res.body).to.have.a.property('message').that.is.a('string');

					const data = JSON.parse(res.body.message);
					expect(data).to.have.a.property('result').that.is.an('array');
				})
				.end(done);
		});
	});

	describe('[@listCustomUserStatus]', () => {
		it('should fail if not logged in', (done) => {
			request.post(methodCall('listCustomUserStatus'))
				.send({
					message: JSON.stringify({
						method: 'listCustomUserStatus',
						params: [],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(401)
				.expect((res) => {
					expect(res.body).to.have.property('status', 'error');
					expect(res.body).to.have.property('message');
				})
				.end(done);
		});

		it('should return custom status for the current user', (done) => {
			request.post(methodCall('listCustomUserStatus'))
				.set(credentials)
				.send({
					message: JSON.stringify({
						method: 'listCustomUserStatus',
						params: [],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.a.property('success', true);
					expect(res.body).to.have.a.property('message').that.is.a('string');

					const data = JSON.parse(res.body.message);
					expect(data).to.have.a.property('result').that.is.an('array');
				})
				.end(done);
		});
	});

	describe('[@permissions:get]', () => {
		const date = {
			$date: new Date().getTime(),
		};

		it('should fail if not logged in', (done) => {
			request.post(methodCall('permissions:get'))
				.send({
					message: JSON.stringify({
						method: 'permissions/get',
						params: [date],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(401)
				.expect((res) => {
					expect(res.body).to.have.property('status', 'error');
					expect(res.body).to.have.property('message');
				})
				.end(done);
		});

		it('should return all permissions', (done) => {
			request.post(methodCall('permissions:get'))
				.set(credentials)
				.send({
					message: JSON.stringify({
						method: 'permissions/get',
						params: [],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.a.property('success', true);
					expect(res.body).to.have.a.property('message').that.is.a('string');

					const data = JSON.parse(res.body.message);
					expect(data).to.have.a.property('result').that.is.an('array');
					expect(data.result.length).to.be.above(1);
				})
				.end(done);
		});

		it('should return all permissions after the given date', (done) => {
			request.post(methodCall('permissions:get'))
				.set(credentials)
				.send({
					message: JSON.stringify({
						method: 'permissions/get',
						params: [date],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.a.property('success', true);
					expect(res.body).to.have.a.property('message').that.is.a('string');

					const data = JSON.parse(res.body.message);
					expect(data).to.have.a.property('result').that.is.an('object');
					expect(data.result).to.have.a.property('update').that.is.an('array');
				})
				.end(done);
		});
	});

	describe('[@loadMissedMessages]', () => {
		let rid = false;
		const date = {
			$date: new Date().getTime(),
		};
		let postMessageDate = false;

		const channelName = `methods-test-channel-${ Date.now() }`;

		before('create test group', (done) => {
			request.post(api('groups.create'))
				.set(credentials)
				.send({
					name: channelName,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.nested.property('group._id');
					expect(res.body).to.have.nested.property('group.name', channelName);
					expect(res.body).to.have.nested.property('group.t', 'p');
					expect(res.body).to.have.nested.property('group.msgs', 0);
					rid = res.body.group._id;
				})
				.end(done);
		});

		before('send sample message', (done) => {
			request.post(api('chat.sendMessage'))
				.set(credentials)
				.send({
					message: {
						text: 'Sample message',
						rid,
					},
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					postMessageDate = { $date: new Date().getTime() };
				})
				.end(done);
		});

		before('send another sample message', (done) => {
			request.post(api('chat.sendMessage'))
				.set(credentials)
				.send({
					message: {
						text: 'Second Sample message',
						rid,
					},
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});

		it('should fail if not logged in', (done) => {
			request.post(methodCall('loadMissedMessages'))
				.send({
					message: JSON.stringify({
						method: 'loadMissedMessages',
						params: [rid, date],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(401)
				.expect((res) => {
					expect(res.body).to.have.property('status', 'error');
					expect(res.body).to.have.property('message');
				})
				.end(done);
		});

		it('should return an error if the rid param is empty', (done) => {
			request.post(methodCall('loadMissedMessages'))
				.set(credentials)
				.send({
					message: JSON.stringify({
						method: 'loadMissedMessages',
						params: ['', date],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.a.property('success', true);
					expect(res.body).to.have.a.property('message').that.include('error-invalid-room');
				})
				.end(done);
		});

		it('should return an error if the start param is missing', (done) => {
			request.post(methodCall('loadMissedMessages'))
				.set(credentials)
				.send({
					message: JSON.stringify({
						method: 'loadMissedMessages',
						params: [rid],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.a.property('success', true);
					expect(res.body).to.have.a.property('message').that.include('Match error');
				})
				.end(done);
		});

		it('should return and empty list if using current time', (done) => {
			request.post(methodCall('loadMissedMessages'))
				.set(credentials)
				.send({
					message: JSON.stringify({
						method: 'loadMissedMessages',
						params: [rid, { $date: new Date().getTime() }],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.a.property('success', true);
					expect(res.body).to.have.a.property('message').that.is.a('string');

					const data = JSON.parse(res.body.message);
					expect(data).to.have.a.property('result').that.is.a('array');
					expect(data.result.length).to.be.equal(0);
				})
				.end(done);
		});

		it('should return two messages if using a time from before the first msg was sent', (done) => {
			request.post(methodCall('loadMissedMessages'))
				.set(credentials)
				.send({
					message: JSON.stringify({
						method: 'loadMissedMessages',
						params: [rid, date],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.a.property('success', true);
					expect(res.body).to.have.a.property('message').that.is.a('string');

					const data = JSON.parse(res.body.message);
					expect(data).to.have.a.property('result').that.is.a('array');
					expect(data.result.length).to.be.equal(2);
				})
				.end(done);
		});

		it('should return a single message if using a time from in between the messages', (done) => {
			request.post(methodCall('loadMissedMessages'))
				.set(credentials)
				.send({
					message: JSON.stringify({
						method: 'loadMissedMessages',
						params: [rid, postMessageDate],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.a.property('success', true);
					expect(res.body).to.have.a.property('message').that.is.a('string');

					const data = JSON.parse(res.body.message);
					expect(data).to.have.a.property('result').that.is.a('array');
					expect(data.result.length).to.be.equal(1);
				})
				.end(done);
		});
	});

	describe('[@public-settings:get]', () => {
		const date = {
			$date: new Date().getTime(),
		};

		it('should fail if not logged in', (done) => {
			request.post(methodCall('public-settings:get'))
				.send({
					message: JSON.stringify({
						method: 'public-settings/get',
						params: [date],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(401)
				.expect((res) => {
					expect(res.body).to.have.property('status', 'error');
					expect(res.body).to.have.property('message');
				})
				.end(done);
		});

		it('should return the list of public settings', (done) => {
			request.post(methodCall('public-settings:get'))
				.set(credentials)
				.send({
					message: JSON.stringify({
						method: 'public-settings/get',
						params: [date],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.a.property('success', true);
					expect(res.body).to.have.a.property('message').that.is.a('string');

					const data = JSON.parse(res.body.message);
					expect(data).to.have.a.property('result').that.is.an('object');
				})
				.end(done);
		});
	});

	describe('[@private-settings:get]', () => {
		const date = {
			$date: 0,
		};

		it('should fail if not logged in', (done) => {
			request.post(methodCall('private-settings:get'))
				.send({
					message: JSON.stringify({
						method: 'private-settings/get',
						params: [date],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(401)
				.expect((res) => {
					expect(res.body).to.have.property('status', 'error');
					expect(res.body).to.have.property('message');
				})
				.end(done);
		});

		it('should return nothing when user doesnt have any permission', (done) => {
			updatePermission('view-privileged-setting', [])
				.then(updatePermission('edit-privileged-setting', []))
				.then(updatePermission('manage-selected-settings', []))
				.then(() => {
					request.post(methodCall('private-settings:get'))
						.set(credentials)
						.send({
							message: JSON.stringify({
								method: 'private-settings/get',
								params: [date],
							}),
						})
						.expect('Content-Type', 'application/json')
						.expect(200)
						.expect((res) => {
							expect(res.body).to.have.a.property('success', true);
							expect(res.body).to.have.a.property('message').that.is.a('string');

							const data = JSON.parse(res.body.message);
							expect(data).to.have.a.property('result').that.is.an('array');
							expect(data.result.length).to.be.equal(0);
						})
						.end(done);
				});
		});

		it('should return properties when user has any related permissions', (done) => {
			updatePermission('view-privileged-setting', ['admin']).then(() => {
				request.post(methodCall('private-settings:get'))
					.set(credentials)
					.send({
						message: JSON.stringify({
							method: 'private-settings/get',
							params: [date],
						}),
					})
					.expect('Content-Type', 'application/json')
					.expect(200)
					.expect((res) => {
						expect(res.body).to.have.a.property('success', true);
						expect(res.body).to.have.a.property('message').that.is.a('string');

						const data = JSON.parse(res.body.message);
						expect(data).to.have.a.property('result').that.is.an('object');
						expect(data.result).to.have.a.property('update').that.is.an('array');
						expect(data.result.update.length).to.not.equal(0);
					})
					.end(done);
			});
		});

		it('should return properties when user has all related permissions', (done) => {
			updatePermission('view-privileged-setting', ['admin'])
				.then(updatePermission('edit-privileged-setting', ['admin']))
				.then(updatePermission('manage-selected-settings', ['admin']))
				.then(() => {
					request.post(methodCall('private-settings:get'))
						.set(credentials)
						.send({
							message: JSON.stringify({
								method: 'private-settings/get',
								params: [date],
							}),
						})
						.expect('Content-Type', 'application/json')
						.expect(200)
						.expect((res) => {
							expect(res.body).to.have.a.property('success', true);
							expect(res.body).to.have.a.property('message').that.is.a('string');

							const data = JSON.parse(res.body.message);
							expect(data).to.have.a.property('result').that.is.an('object');
							expect(data.result).to.have.a.property('update').that.is.an('array');
							expect(data.result.update.length).to.not.equal(0);
						})
						.end(done);
				});
		});
	});

	describe('[@subscriptions:get]', () => {
		const date = {
			$date: new Date().getTime(),
		};

		it('should fail if not logged in', (done) => {
			request.post(methodCall('subscriptions:get'))
				.send({
					message: JSON.stringify({
						method: 'subscriptions/get',
						params: [date],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(401)
				.expect((res) => {
					expect(res.body).to.have.property('status', 'error');
					expect(res.body).to.have.property('message');
				})
				.end(done);
		});

		it('should return all subscriptions', (done) => {
			request.post(methodCall('subscriptions:get'))
				.set(credentials)
				.send({
					message: JSON.stringify({
						method: 'subscriptions/get',
						params: [],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.a.property('success', true);
					expect(res.body).to.have.a.property('message').that.is.a('string');

					const data = JSON.parse(res.body.message);
					expect(data).to.have.a.property('result').that.is.an('array');
					expect(data.result.length).to.be.above(1);
				})
				.end(done);
		});

		it('should return all subscriptions after the given date', (done) => {
			request.post(methodCall('subscriptions:get'))
				.set(credentials)
				.send({
					message: JSON.stringify({
						method: 'subscriptions/get',
						params: [date],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.a.property('success', true);
					expect(res.body).to.have.a.property('message').that.is.a('string');

					const data = JSON.parse(res.body.message);
					expect(data).to.have.a.property('result').that.is.an('object');
					expect(data.result).to.have.a.property('update').that.is.an('array');
				})
				.end(done);
		});
	});

	describe('[@sendMessage]', () => {
		let rid = false;
		let channelName = false;

		before('create room', (done) => {
			channelName = `methods-test-channel-${ Date.now() }`;
			request.post(api('groups.create'))
				.set(credentials)
				.send({
					name: channelName,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.nested.property('group._id');
					expect(res.body).to.have.nested.property('group.name', channelName);
					expect(res.body).to.have.nested.property('group.t', 'p');
					expect(res.body).to.have.nested.property('group.msgs', 0);
					rid = res.body.group._id;
				})
				.end(done);
		});

		it('should send a message', (done) => {
			request.post(methodCall('sendMessage'))
				.set(credentials)
				.send({
					message: JSON.stringify({
						method: 'sendMessage',
						params: [{ _id: `${ Date.now() + Math.random() }`, rid, msg: 'test message' }],
						id: 1000,
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.a.property('success', true);
					expect(res.body).to.have.a.property('message').that.is.a('string');

					const data = JSON.parse(res.body.message);
					expect(data).to.have.a.property('result').that.is.an('object');
					expect(data.result.msg).to.equal('test message');
				})
				.end(done);
		});

		it('should parse correctly urls sent in message', (done) => {
			request.post(methodCall('sendMessage'))
				.set(credentials)
				.send({
					message: JSON.stringify({
						method: 'sendMessage',
						params: [{ _id: `${ Date.now() + Math.random() }`, rid, msg: 'test message with https://github.com' }],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.a.property('success', true);
					expect(res.body).to.have.a.property('message').that.is.a('string');

					const data = JSON.parse(res.body.message);
					expect(data).to.have.a.property('result').that.is.an('object');
					expect(data.result).to.have.a.property('urls').that.is.an('array');
					expect(data.result.urls[0].url).to.equal('https://github.com');
				})
				.end(done);
		});

		describe('optional link embeds', () => {
			let messageWithOptionalEmbedId = null;
			it('should not parse urls with <> in the sent message', (done) => {
				request.post(methodCall('sendMessage'))
					.set(credentials)
					.send({
						message: JSON.stringify({
							method: 'sendMessage',
							params: [{ _id: `${ Date.now() + Math.random() }`, rid, msg: 'https://rocket.chat is test1 and test2 is <https://youtube.com> and  https://github.com is test3 and also <ftp://user:password@server/pathname;type=a> which ftp link test4' }],
						}),
					})
					.expect('Content-Type', 'application/json')
					.expect(200)
					.expect((res) => {
						expect(res.body).to.have.a.property('success', true);
						expect(res.body).to.have.a.property('message').that.is.a('string');

						const data = JSON.parse(res.body.message);
						expect(data.result.urls).to.have.lengthOf(2);
						expect(data.result.urls[0].url).to.equal('https://rocket.chat');
						expect(data.result.urls[1].url).to.equal('https://github.com');

						messageWithOptionalEmbedId = data.result._id;
					})
					.end(done);
			});
			it('works for long urls', (done) => {
				request.post(methodCall('sendMessage'))
					.set(credentials)
					.send({
						message: JSON.stringify({
							method: 'sendMessage',
							params: [{ _id: `${ Date.now() + Math.random() }`, rid, msg: `search1 on rocketchat <https://www.google.com/search?q=rocket+chat&ei=pFaIe6F4t4PgsO5gAs&oq=rocketchat&gs_lcp=Cgdnd3Mtd2l6EAMYADIKCAAQ&uact=5> and
							search2 on meteor https://www.qwant.com/?q=site%3Ameteor.com+what+is+meteor+js+and+how+to+get+started&t=web and a <https://very.deep.nest.sub.sub.domain.link?query1=has%20queries&testing=true&works=1&isawesome>` }],
						}),
					})
					.expect('Content-Type', 'application/json')
					.expect(200)
					.expect((res) => {
						expect(res.body).to.have.a.property('success', true);
						expect(res.body).to.have.a.property('message').that.is.a('string');

						const data = JSON.parse(res.body.message);
						expect(data.result.urls).to.have.lengthOf(1);
						expect(data.result.urls[0].url).to.equal('https://www.qwant.com/?q=site%3Ameteor.com+what+is+meteor+js+and+how+to+get+started&t=web');
					})
					.end(done);
			});
			it('works inside threads', (done) => {
				request.post(methodCall('sendMessage'))
					.set(credentials)
					.send({
						message: JSON.stringify({
							method: 'sendMessage',
							params: [{ _id: `${ Date.now() + Math.random() }`, tmid: messageWithOptionalEmbedId, rid, msg: 'https://www.chaijs.com/api/bdd/ is test1 and <https://mochajs.org/#parallel-tests> is test2' }],
						}),
					})
					.expect('Content-Type', 'application/json')
					.expect(200)
					.expect((res) => {
						expect(res.body).to.have.a.property('success', true);
						expect(res.body).to.have.a.property('message').that.is.a('string');

						const data = JSON.parse(res.body.message);
						expect(data.result.urls).to.have.lengthOf(1);
						expect(data.result.urls[0].url).to.equal('https://www.chaijs.com/api/bdd/');
					})
					.end(done);
			});
		});
	});

	describe('[@updateMessage]', () => {
		let rid = false;
		let messageId;
		let messageWithMarkdownId;
		let channelName = false;

		before('create room', (done) => {
			channelName = `methods-test-channel-${ Date.now() }`;
			request.post(api('groups.create'))
				.set(credentials)
				.send({
					name: channelName,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.nested.property('group._id');
					expect(res.body).to.have.nested.property('group.name', channelName);
					expect(res.body).to.have.nested.property('group.t', 'p');
					expect(res.body).to.have.nested.property('group.msgs', 0);
					rid = res.body.group._id;
				})
				.end(done);
		});

		before('send message with URL', (done) => {
			request.post(methodCall('sendMessage'))
				.set(credentials)
				.send({
					message: JSON.stringify({
						method: 'sendMessage',
						params: [{ _id: `${ Date.now() + Math.random() }`, rid, msg: 'test message with https://github.com' }],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.a.property('success', true);
					expect(res.body).to.have.a.property('message').that.is.a('string');

					const data = JSON.parse(res.body.message);
					expect(data).to.have.a.property('result').that.is.an('object');
					expect(data.result).to.have.a.property('urls').that.is.an('array');
					expect(data.result.urls[0].url).to.equal('https://github.com');
					messageId = data.result._id;
				})
				.end(done);
		});

		before('send message with URL inside markdown', (done) => {
			request.post(methodCall('sendMessage'))
				.set(credentials)
				.send({
					message: JSON.stringify({
						method: 'sendMessage',
						params: [{ _id: `${ Date.now() + Math.random() }`, rid, msg: 'test message with ```https://github.com```' }],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.a.property('success', true);
					expect(res.body).to.have.a.property('message').that.is.a('string');

					const data = JSON.parse(res.body.message);
					expect(data).to.have.a.property('result').that.is.an('object');
					messageWithMarkdownId = data.result._id;
				})
				.end(done);
		});

		it('should update a message with a URL', (done) => {
			request.post(methodCall('updateMessage'))
				.set(credentials)
				.send({
					message: JSON.stringify({
						method: 'updateMessage',
						params: [{ _id: messageId, rid, msg: 'https://github.com updated' }],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.a.property('success', true);
					expect(res.body).to.have.a.property('message').that.is.a('string');
					const data = JSON.parse(res.body.message);
					expect(data).to.have.a.property('msg').that.is.an('string');
				})
				.end(done);
		});

		it('should not parse URLs inside markdown on update', (done) => {
			request.post(methodCall('updateMessage'))
				.set(credentials)
				.send({
					message: JSON.stringify({
						method: 'updateMessage',
						params: [{ _id: messageWithMarkdownId, rid, msg: 'test message with ```https://github.com``` updated' }],
					}),
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.a.property('success', true);
					expect(res.body).to.have.a.property('message').that.is.a('string');

					const data = JSON.parse(res.body.message);
					expect(data).to.have.a.property('msg').that.is.an('string');
				})
				.then(() => {
					request.get(api(`chat.getMessage?msgId=${ messageWithMarkdownId }`))
						.set(credentials)
						.expect('Content-Type', 'application/json')
						.expect(200)
						.expect((res) => {
							expect(res.body).to.have.property('message').that.is.an('object');
							expect(res.body.message.msg).to.equal('test message with ```https://github.com``` updated');
							expect(res.body.message).to.have.property('urls');
							expect(res.body.message.urls.length).to.be.equal(0);
						})
						.end(done);
				});
		});
		describe('optional link embeds', () => {
			let messageWithOptionalEmbedId = null;
			beforeEach('send message with one disabled and one enabled', (done) => {
				request.post(methodCall('sendMessage'))
					.set(credentials)
					.send({
						message: JSON.stringify({
							method: 'sendMessage',
							params: [{ _id: `${ Date.now() + Math.random() }`, rid, msg: 'https://developer.rocket.chat is test1 and test2 is <https://docs.github.com>' }],
						}),
					})
					.expect('Content-Type', 'application/json')
					.expect(200)
					.expect((res) => {
						expect(res.body).to.have.a.property('success', true);
						expect(res.body).to.have.a.property('message').that.is.a('string');

						const data = JSON.parse(res.body.message);
						expect(data.result.urls).to.have.lengthOf(1);
						expect(data.result.urls[0].url).to.equal('https://developer.rocket.chat');
						messageWithOptionalEmbedId = data.result._id;
					})
					.end(done);
			});
			it('adding a new url with <>', (done) => {
				request.post(methodCall('updateMessage'))
					.set(credentials)
					.send({
						message: JSON.stringify({
							method: 'updateMessage',
							params: [{ _id: messageWithOptionalEmbedId, rid, msg: 'https://developer.rocket.chat is test1 and test2 is <https://docs.github.com> and <https://regexr.com/> is test3' }],
						}),
					})
					.expect('Content-Type', 'application/json')
					.expect(200)
					.expect((res) => {
						expect(res.body).to.have.a.property('success', true);
						expect(res.body).to.have.a.property('message').that.is.a('string');

						const data = JSON.parse(res.body.message);
						expect(data).to.have.a.property('msg').that.is.an('string');
					})
					.then(() => {
						request.get(api(`chat.getMessage?msgId=${ messageWithOptionalEmbedId }`))
							.set(credentials)
							.expect('Content-Type', 'application/json')
							.expect(200)
							.expect((res) => {
								expect(res.body.message).to.have.property('urls');
								expect(res.body.message.urls).to.have.lengthOf(1);
							})
							.end(done);
					});
			});
			it('disable embed by adding <>', (done) => {
				request.post(methodCall('updateMessage'))
					.set(credentials)
					.send({
						message: JSON.stringify({
							method: 'updateMessage',
							params: [{ _id: messageWithOptionalEmbedId, rid, msg: '<https://developer.rocket.chat> is test1 and test2 is <https://docs.github.com>' }],
						}),
					})
					.expect('Content-Type', 'application/json')
					.expect(200)
					.expect((res) => {
						expect(res.body).to.have.a.property('success', true);
						expect(res.body).to.have.a.property('message').that.is.a('string');

						const data = JSON.parse(res.body.message);
						expect(data).to.have.a.property('msg').that.is.an('string');
					})
					.then(() => {
						request.get(api(`chat.getMessage?msgId=${ messageWithOptionalEmbedId }`))
							.set(credentials)
							.expect('Content-Type', 'application/json')
							.expect(200)
							.expect((res) => {
								expect(res.body.message).to.have.property('urls');
								expect(res.body.message.urls).to.be.empty;
							})
							.end(done);
					});
			});
			it('enable embeds by removing', (done) => {
				request.post(methodCall('updateMessage'))
					.set(credentials)
					.send({
						message: JSON.stringify({
							method: 'updateMessage',
							params: [{ _id: messageWithOptionalEmbedId, rid, msg: 'https://developer.rocket.chat is test1 and test2 is https://docs.github.com' }],
						}),
					})
					.expect('Content-Type', 'application/json')
					.expect(200)
					.expect((res) => {
						expect(res.body).to.have.a.property('success', true);
						expect(res.body).to.have.a.property('message').that.is.a('string');

						const data = JSON.parse(res.body.message);
						expect(data).to.have.a.property('msg').that.is.an('string');
					})
					.then(() => {
						request.get(api(`chat.getMessage?msgId=${ messageWithOptionalEmbedId }`))
							.set(credentials)
							.expect('Content-Type', 'application/json')
							.expect(200)
							.expect((res) => {
								expect(res.body.message).to.have.property('urls');
								expect(res.body.message.urls).to.have.lengthOf(2);
							})
							.end(done);
					});
			});
		});
	});
});
