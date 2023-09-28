import type { FilterOperators } from 'mongodb';
import type { ILivechatDepartment } from '@rocket.chat/core-typings';

import { callbacks } from '../../../../../lib/callbacks';
import { hasRoleAsync } from '../../../../../app/authorization/server/functions/hasRole';
import { cbLogger } from '../lib/logger';
import { getUnitsFromUser } from '../methods/getUnitsFromUserRoles';

export const addQueryRestrictionsToDepartmentsModel = async (originalQuery: FilterOperators<ILivechatDepartment> = {}, userId: string) => {
	const query: FilterOperators<ILivechatDepartment> = { ...originalQuery, type: { $ne: 'u' } };

	const units = await getUnitsFromUser(userId);
	if (Array.isArray(units)) {
		query.ancestors = { $in: units };
		query._id = { $in: units };
	}

	cbLogger.debug({ msg: 'Applying department query restrictions', userId, units });
	return query;
};

callbacks.add(
	'livechat.applyDepartmentRestrictions',
	async (originalQuery: FilterOperators<ILivechatDepartment> = {}, { userId }: { userId?: string | null } = { userId: null }) => {
		if (!userId || !(await hasRoleAsync(userId, 'livechat-monitor'))) {
			cbLogger.debug('Skipping callback. No user id provided or user is not a monitor');
			return originalQuery;
		}

		return addQueryRestrictionsToDepartmentsModel(originalQuery, userId);
	},
	callbacks.priority.HIGH,
	'livechat-apply-department-restrictions',
);
