import { Meteor } from 'meteor/meteor';
import { Match } from 'meteor/check';
import { TAPi18n } from 'meteor/rocketchat:tap-i18n';

import { Rooms, Subscriptions } from '../../models/server';
import { settings } from '../../settings/server';
import { slashCommands } from '../../utils/lib/slashCommand';
import { api } from '../../../server/sdk/api';

function Join(command: string, params: string, item: Record<string, string>): void {
	if (command !== 'join' || !Match.test(params, String)) {
		return;
	}
	let channel = params.trim();
	if (channel === '') {
		return;
	}
	const userId = Meteor.userId();
	if (!userId) {
		return;
	}
	channel = channel.replace('#', '');
	const user = Meteor.users.findOne(userId);
	const room = Rooms.findOneByNameAndType(channel, 'c');
	if (!room) {
		api.broadcast('notify.ephemeralMessage', userId, item.rid, {
			msg: TAPi18n.__('Channel_doesnt_exist', {
				postProcess: 'sprintf',
				sprintf: [channel],
				lng: settings.get('Language') || 'en',
			}),
		});
	}

	if (!user) {
		return;
	}
	if (!room) {
		return;
	}

	const subscription = Subscriptions.findOneByRoomIdAndUserId(room._id, user._id, {
		fields: { _id: 1 },
	});
	if (subscription) {
		throw new Meteor.Error('error-user-already-in-room', 'You are already in the channel', {
			method: 'slashCommands',
		});
	}
	Meteor.call('joinRoom', room._id);
}

slashCommands.add(
	'join',
	Join,
	{
		description: 'Join_the_given_channel',
		params: '#channel',
		permission: 'view-c-room',
	},
	undefined,
	false,
	undefined,
	undefined,
);
