import { callbacks } from '../../../../../app/callbacks/server';
import { LivechatDepartment } from '../../../../../app/models/server';
import { settings } from '../../../../../app/settings/server';
import { logger } from '../lib/logger';

callbacks.add('livechat.applySimultaneousChatRestrictions', (_: any, { departmentId }: { departmentId?: string }) => {
	if (departmentId) {
		const departmentLimit = LivechatDepartment.findOneById(departmentId)?.maxNumberSimultaneousChat || 0;
		if (departmentLimit > 0) {
			(logger as any).cb.debug(`Applying department filters. Max chats per department ${ departmentLimit }`);
			return { $match: { 'queueInfo.chats': { $gte: Number(departmentLimit) } } };
		}
	}

	const maxChatsPerSetting = settings.get('Livechat_maximum_chats_per_agent') as number;
	const agentFilter = { $and: [{ 'livechat.maxNumberSimultaneousChat': { $gt: 0 } }, { $expr: { $gte: ['queueInfo.chats', 'livechat.maxNumberSimultaneousChat'] } }] };
	// apply filter only if agent setting is 0 or is disabled
	const globalFilter = maxChatsPerSetting > 0
		? {
			$and: [
				{
					$or: [
						{
							'livechat.maxNumberSimultaneousChat': { $exists: false },
						},
						{ 'livechat.maxNumberSimultaneousChat': 0 },
					],
				},
				{ 'queueInfo.chats': { $gte: maxChatsPerSetting } },
			],
		}
		: {};

	(logger as any).cb.debug(`Applying agent & global filters. Max number of chats allowed to all agents: ${ maxChatsPerSetting }`);

	return { $match: { $or: [agentFilter, globalFilter] } };
}, callbacks.priority.HIGH, 'livechat-apply-simultaneous-restrictions');
