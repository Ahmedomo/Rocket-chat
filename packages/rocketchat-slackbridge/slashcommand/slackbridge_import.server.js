/* globals msgStream */
function SlackBridgeImport(command, params, item) {
	var channel, room, user;
	if (command !== 'slackbridge-import' || !Match.test(params, String)) {
		return;
	}
	room = RocketChat.cache.Rooms.findOneById(item.rid);
	channel = room.name;
	user = Meteor.users.findOne(Meteor.userId());

	msgStream.emit(item.rid, {
		_id: Random.id(),
		rid: item.rid,
		u: { username: 'rocket.cat' },
		ts: new Date(),
		msg: TAPi18n.__('SlackBridge_start', {
			postProcess: 'sprintf',
			sprintf: [user.username, channel]
		}, user.language)
	});

	try {
		RocketChat.SlackBridge.importMessages(item.rid, error => {
			if (error) {
				msgStream.emit(item.rid, {
					_id: Random.id(),
					rid: item.rid,
					u: { username: 'rocket.cat' },
					ts: new Date(),
					msg: TAPi18n.__('SlackBridge_error', {
						postProcess: 'sprintf',
						sprintf: [channel, error.message]
					}, user.language)
				});
			} else {
				msgStream.emit(item.rid, {
					_id: Random.id(),
					rid: item.rid,
					u: { username: 'rocket.cat' },
					ts: new Date(),
					msg: TAPi18n.__('SlackBridge_finish', {
						postProcess: 'sprintf',
						sprintf: [channel]
					}, user.language)
				});
			}
		});
	} catch (error) {
		msgStream.emit(item.rid, {
			_id: Random.id(),
			rid: item.rid,
			u: { username: 'rocket.cat' },
			ts: new Date(),
			msg: TAPi18n.__('SlackBridge_error', {
				postProcess: 'sprintf',
				sprintf: [channel, error.message]
			}, user.language)
		});
		throw error;
	}
	return SlackBridgeImport;
}

RocketChat.slashCommands.add('slackbridge-import', SlackBridgeImport);
