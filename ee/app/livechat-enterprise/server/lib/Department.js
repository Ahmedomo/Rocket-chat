import { escapeRegExp } from '@rocket.chat/string-helpers';

import {
	LivechatDepartment,
} from '../../../../../server/models/raw';

export const findAllDepartmentsAvailable = async (unitId, offset, count, text) => {
	const filterReg = new RegExp(escapeRegExp(text), 'i');

	const cursor = LivechatDepartment.find({
		type: { $ne: 'u' },
		$or: [{ ancestors: { $in: [[unitId], null, []] } }, { ancestors: { $exists: false } }],
		...text && { name: filterReg },

	}, { limit: count, offset });

	const departments = await cursor.toArray();
	const total = await cursor.count();

	return { departments, total };
};

export const findAllDepartmentsByUnit = async (unitId, offset, count) => {
	const cursor = LivechatDepartment.find({
		ancestors: { $in: [unitId] },
	}, { limit: count, offset });

	const total = await cursor.count();
	const departments = await cursor.toArray();

	return { departments, total };
};
