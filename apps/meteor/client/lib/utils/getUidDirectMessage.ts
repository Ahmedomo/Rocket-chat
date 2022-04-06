import { Meteor } from 'meteor/meteor';

import { Rooms } from '../../../app/models/client';
import type { IRoom } from '@rocket.chat/core-typings';
import type { IUser } from '@rocket.chat/core-typings';

export const getUidDirectMessage = (rid: IRoom['_id'], userId: IUser['_id'] | null = Meteor.userId()): string | undefined => {
	const room: IRoom | null = Rooms.findOne({ _id: rid }, { fields: { uids: 1 } });

	if (!room || !room.uids || room.uids.length > 2) {
		return undefined;
	}

	return room.uids.filter((uid) => uid !== userId)[0];
};
