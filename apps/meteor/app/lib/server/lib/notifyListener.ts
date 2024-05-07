import { api, dbWatchersDisabled } from '@rocket.chat/core-services';
import type { IPbxEvent, IRocketChatRecord } from '@rocket.chat/core-typings';
import type { IBaseModel, IPbxEventsModel } from '@rocket.chat/model-typings';
import { PbxEvents } from '@rocket.chat/models';
import type { Filter } from 'mongodb';

type ClientAction = 'inserted' | 'updated' | 'removed';

async function getEntityDataById<T extends IRocketChatRecord, M extends IBaseModel<T>>(ids: T['_id'] | T['_id'][], model: M): Promise<T[]> {
	if (Array.isArray(ids)) {
		const query = { _id: { $in: ids } } as unknown as Filter<T>;
		return model.find(query).toArray();
	}
	const item = await model.findOneById<T>(ids);
	return item ? [item] : [];
}

export async function broadcastOnPbxEventChanges<T extends IPbxEvent>(id: T['_id'], clientAction: ClientAction = 'updated'): Promise<void> {
	if (dbWatchersDisabled) {
		const item = await getEntityDataById<IPbxEvent, IPbxEventsModel>(id, PbxEvents);
		void api.broadcast('watch.pbxevents', { clientAction, id, data: item[0] });
	}
}
