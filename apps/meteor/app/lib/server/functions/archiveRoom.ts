import { Message } from '@rocket.chat/core-services';
import type { IMessage } from '@rocket.chat/core-typings';
import { Rooms, Subscriptions } from '@rocket.chat/models';

import { callbacks } from '../../../../lib/callbacks';
import { notifyListenerOnRoomChanges } from '../lib/notifyListenerOnRoomChanges';

export const archiveRoom = async function (rid: string, user: IMessage['u']): Promise<void> {
	await Rooms.archiveById(rid);
	await Subscriptions.archiveByRoomId(rid);
	await Message.saveSystemMessage('room-archived', rid, '', user);

	const room = await Rooms.findOneById(rid);

	await callbacks.run('afterRoomArchived', room, user);

	void notifyListenerOnRoomChanges(rid);
};
