import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { canAccessRoomIdAsync } from '../../../authorization/server/functions/canAccessRoom';
import { Rooms } from '../../../models/server';

Meteor.methods({
	async 'e2e.setRoomKeyID'(rid, keyID) {
		check(rid, String);
		check(keyID, String);

		const userId = Meteor.userId();
		if (!userId) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'e2e.setRoomKeyID' });
		}

		if (!rid) {
			throw new Meteor.Error('error-invalid-room', 'Invalid room', { method: 'e2e.setRoomKeyID' });
		}

		if (!(await canAccessRoomIdAsync(rid, userId))) {
			throw new Meteor.Error('error-invalid-room', 'Invalid room', { method: 'e2e.setRoomKeyID' });
		}

		const room = Rooms.findOneById(rid, { fields: { e2eKeyId: 1 } });

		if (room.e2eKeyId) {
			throw new Meteor.Error('error-room-e2e-key-already-exists', 'E2E Key ID already exists', {
				method: 'e2e.setRoomKeyID',
			});
		}

		return Rooms.setE2eKeyId(room._id, keyID);
	},
});
