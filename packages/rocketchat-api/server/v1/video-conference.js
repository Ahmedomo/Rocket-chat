import { Meteor } from 'meteor/meteor';
import { RocketChat } from 'meteor/rocketchat:lib';
import { Rooms } from 'meteor/rocketchat:models';

RocketChat.API.v1.addRoute('video-conference/jitsi.update-timeout', { authRequired: true }, {
	post() {
		const { roomId } = this.bodyParams;
		if (!roomId) {
			return RocketChat.API.v1.failure('The "roomId" parameter is required!');
		}

		const room = Rooms.findOneById(roomId);
		if (!room) {
			return RocketChat.API.v1.failure('Room does not exist!');
		}

		Meteor.runAsUser(this.userId, () => Meteor.call('jitsi:updateTimeout', roomId));

		return RocketChat.API.v1.success({ jitsiTimeout: Rooms.findOneById(roomId).jitsiTimeout });
	},
});
