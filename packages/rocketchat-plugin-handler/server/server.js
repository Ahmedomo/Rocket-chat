export const plugin_handler ={};
plugin_handler.plugins = [];
function remove_user_from_automatic_channel(user, plugins) {
	const channelNames = plugins.map(function(x) { return x.getChannelName(user); });

	const userSubscriptions = RocketChat.models.Subscriptions.findByTypeAndUserId('c', user.user._id).fetch();
	userSubscriptions.forEach((arrayItem) => {
		if (!channelNames.includes(arrayItem.name) && arrayItem._room.automatic) {
		// Remove the user from this other channel.
			const room = RocketChat.models.Rooms.findOneById(arrayItem._room._id);
			RocketChat.removeUserFromRoom(room._id, user.user);

			//delete the user if it is last.(There may be a race condition)
			if (room.usernames.length === 1) {
				RocketChat.eraseRoom(room._id);
			}
		}
	});
}

RocketChat.leave_automatic_channel = function(user, room) {
	plugin_handler.plugins.forEach((arrayItem) => {
		if (room.plugin_name === arrayItem.pluginName && RocketChat.settings.get(arrayItem.blacklist)) {
			RocketChat.models.Users.update({ _id: user._id }, { $addToSet: { ignored_automatic_channels: room.name } });
			if (room.usernames.length === 1) {
				RocketChat.eraseRoom(room._id);
			}
		}
	});
};

plugin_handler.addPlugin = function(options) {
	return plugin_handler.plugins.push({
		pluginName: options.pluginName,
		getChannelName :options.getChannelName,
		enable: options.enable,
		blacklist: options.blacklistAllowed
	});
};

Accounts.onLogin(function(user) {
	if (!user.user._id || !user.user.username) {
		return;
	}
	plugin_handler.plugins.forEach((arrayItem) => {
		const channelName = arrayItem.getChannelName(user);
		if (channelName !== null && RocketChat.settings.get(arrayItem.enable)) {
			if (user.user.ignored_automatic_channels) {
				if (user.user.ignored_automatic_channels.includes(channelName)) {
					return;
				}
			}
			const room = RocketChat.models.Rooms.findOneByIdOrName(channelName);
			if (room) {

				//check if user is present in the channel
				const subscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(room._id, user.user._id);
				if (subscription) {
					return;
				} else {
					RocketChat.addUserToRoom(room._id, user.user);

				}
			} else {
				// if room does not exist, create one
				RocketChat.createRoom('c', channelName, user.user && user.user.username, [], false, {automatic: true, plugin_name: arrayItem.pluginName});
			}
		}
	});
	// remove user from previously added automatic channels
	remove_user_from_automatic_channel(user, plugin_handler.plugins);
});
