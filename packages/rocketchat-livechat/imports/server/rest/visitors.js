import LivechatVisitors from '../../../server/models/LivechatVisitors';

RocketChat.API.v1.addRoute('livechat/visitor/:visitorToken', { authRequired: true }, {
	get() {
		if (!RocketChat.authz.hasPermission(this.userId, 'view-livechat-manager')) {
			return RocketChat.API.v1.unauthorized();
		}

		const visitor = LivechatVisitors.getVisitorByToken(this.urlParams.visitorToken);
		return RocketChat.API.v1.success(visitor);
	}
});

RocketChat.API.v1.addRoute('livechat/visitor/:visitorToken/room', { authRequired: true }, {
	get() {
		if (!RocketChat.authz.hasPermission(this.userId, 'view-livechat-manager')) {
			return RocketChat.API.v1.unauthorized();
		}

		const rooms = RocketChat.models.Rooms.findOpenByVisitorToken(this.urlParams.visitorToken, {
			fields: {
				name: 1,
				t: 1,
				cl: 1,
				u: 1,
				usernames: 1,
				servedBy: 1
			}
		}).fetch();
		return RocketChat.API.v1.success({ rooms });
	}
});

RocketChat.API.v1.addRoute('livechat/visitor/:visitorToken/room/close', { authRequired: true }, {
	post() {
		if (!RocketChat.authz.hasPermission(this.userId, 'view-livechat-manager')) {
			return RocketChat.API.v1.unauthorized();
		}

		const visitor = LivechatVisitors.getVisitorByToken(this.urlParams.visitorToken);
		if (!visitor) {
			return RocketChat.API.v1.failure('Visitor not found');
		}

		const rooms = RocketChat.models.Rooms.findOpenByVisitorToken(this.urlParams.visitorToken).fetch();
		if (!rooms || rooms.length === 0) {
			return RocketChat.API.v1.failure('Visitor dont have any opened room');
		}
		const room = rooms[0];

		const user =
			this.bodyParams.username ?
				RocketChat.models.Users.findOneByUsername(this.bodyParams.username):
				RocketChat.models.Users.findOneById(this.userId);

		return RocketChat.API.v1.success({
			closed: RocketChat.Livechat.closeRoom({
				room,
				user,
				comment: this.bodyParams.comment
			})
		});
	}
});
