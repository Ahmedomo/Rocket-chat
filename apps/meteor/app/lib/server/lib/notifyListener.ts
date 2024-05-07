import { api, dbWatchersDisabled } from '@rocket.chat/core-services';
import type { ILivechatPriority, IRocketChatRecord } from '@rocket.chat/core-typings';
import type { IBaseModel, ILivechatPriorityModel } from '@rocket.chat/model-typings';
import { LivechatPriority } from '@rocket.chat/models';
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

export async function broadcastOnLivechatPriorityChanges<T extends ILivechatPriority>(
	ids: T['_id'] | T[],
	clientAction: ClientAction = 'updated',
): Promise<void> {
	if (dbWatchersDisabled) {
		const items = Array.isArray(ids) ? ids : await getEntityDataById<ILivechatPriority, ILivechatPriorityModel>(ids, LivechatPriority);

		for (const item of items) {
			void api.broadcast('watch.priorities', { clientAction, id: item._id, data: item });
		}
	}
}
