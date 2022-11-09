import { LivechatPriority } from '@rocket.chat/models';
import { isGETLivechatPrioritiesParams, isPUTLivechatPriority, isGETLivechatPriorityParams } from '@rocket.chat/rest-typings';

import { API } from '../../../../../app/api/server';
import { findPriority, updatePriority } from './lib/priorities';

API.v1.addRoute(
	'livechat/priorities',
	{
		authRequired: true,
		validateParams: isGETLivechatPrioritiesParams,
		permissionsRequired: { GET: { permissions: ['manage-livechat-priorities', 'view-l-room'], operation: 'hasAny' } },
	},
	{
		async get() {
			const { offset, count } = this.getPaginationItems();
			const { sort } = this.parseJsonQuery();
			const { text } = this.queryParams;

			return API.v1.success(
				await findPriority({
					text,
					pagination: {
						offset,
						count,
						sort,
					},
				}),
			);
		},
	},
);

API.v1.addRoute(
	'livechat/priority/:priorityId',
	{
		authRequired: true,
		permissionsRequired: {
			GET: { permissions: ['manage-livechat-priorities', 'view-l-room'], operation: 'hasAny' },
			DELETE: { permissions: ['manage-livechat-priorities'], operation: 'hasAny' },
		},
		validateParams: { GET: isGETLivechatPriorityParams, PUT: isPUTLivechatPriority },
	},
	{
		async get() {
			const { priorityId } = this.urlParams;
			const priority = await LivechatPriority.findOneById(priorityId);

			if (!priority) {
				return API.v1.notFound(`Priority with id ${priorityId} not found`);
			}

			return API.v1.success(priority);
		},
		async put() {
			const { priorityId } = this.urlParams;
			const { name } = this.requestParams();

			await updatePriority(priorityId, {
				name,
			});

			return API.v1.success();
		},
	},
);
