import { Meteor } from 'meteor/meteor';
import { Match, check } from 'meteor/check';

import { hasPermission } from '../../../authorization';
import { createRoom } from '../functions';
import { settings } from '../../../settings';

Meteor.methods({
	createPrivateGroup(name, members, readOnly = false, customFields = {}, extraData = {}) {
		check(name, String);
		check(members, Match.Optional([String]));

		if (!Meteor.userId()) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'createPrivateGroup' });
		}

		if (!hasPermission(Meteor.userId(), 'create-p')) {
			throw new Meteor.Error('error-not-allowed', 'Not allowed', { method: 'createPrivateGroup' });
		}
		if (extraData.ephemeral && !settings.get('Accounts_AllowEphemeralChannels')) {
			throw new Meteor.Error('error-not-allowed', 'Not allowed', { method: 'createPrivateGroup' });
		}

		// validate extra data schema
		check(extraData, Match.ObjectIncluding({
			tokenpass: Match.Maybe({
				require: String,
				tokens: [{
					token: String,
					balance: String,
				}],
			}),
		}));
		if (extraData.ephemeral) { return createRoom('e', name, Meteor.user() && Meteor.user().username, members, readOnly, { customFields, ...extraData }); }
		return createRoom('p', name, Meteor.user() && Meteor.user().username, members, readOnly, { customFields, ...extraData });
	},
});
