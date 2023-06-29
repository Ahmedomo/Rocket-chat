import moment from 'moment';
import type { ILivechatBusinessHour } from '@rocket.chat/core-typings';
import { LivechatBusinessHourTypes } from '@rocket.chat/core-typings';
import { LivechatBusinessHours, Users } from '@rocket.chat/models';

import { createDefaultBusinessHourRow } from './LivechatBusinessHours';

const currentDay = moment().format('dddd');

// huh... y is this async?
export const filterBusinessHoursThatMustBeOpened = async (
	businessHours: ILivechatBusinessHour[],
): Promise<Pick<ILivechatBusinessHour, '_id' | 'type'>[]> => {
	const currentTime = moment(moment().format('dddd:HH:mm:ss'), 'dddd:HH:mm:ss');

	return businessHours
		.filter(
			(businessHour) =>
				businessHour.active &&
				businessHour.workHours
					.filter((hour) => hour.open)
					.some((hour) => {
						const localTimeStart = moment(`${hour.start.cron.dayOfWeek}:${hour.start.cron.time}:00`, 'dddd:HH:mm:ss');
						const localTimeFinish = moment(`${hour.finish.cron.dayOfWeek}:${hour.finish.cron.time}:00`, 'dddd:HH:mm:ss');
						return currentTime.isSameOrAfter(localTimeStart) && currentTime.isBefore(localTimeFinish);
					}),
		)
		.map((businessHour) => ({
			_id: businessHour._id,
			type: businessHour.type,
		}));
};

export const filterBusinessHoursThatMustBeOpenedByDay = async (
	businessHours: ILivechatBusinessHour[],
	day: string, // Format: moment.format('dddd')
): Promise<Pick<ILivechatBusinessHour, '_id' | 'type'>[]> => {
	return filterBusinessHoursThatMustBeOpened(
		businessHours.filter((businessHour) =>
			businessHour.workHours.some((workHour) => workHour.start.utc.dayOfWeek === day || workHour.finish.utc.dayOfWeek === day),
		),
	);
};

const getDefaultBusinessHourOpenedRightNow = async (): Promise<ILivechatBusinessHour | undefined> => {
	const activeBusinessHours = await LivechatBusinessHours.findDefaultActiveAndOpenBusinessHoursByDay(currentDay, {
		projection: {
			workHours: 1,
			timezone: 1,
			type: 1,
			active: 1,
		},
	});
	const businessHoursToOpenIds = await filterBusinessHoursThatMustBeOpened(activeBusinessHours);
	if (!businessHoursToOpenIds.length) {
		return;
	}

	return activeBusinessHours[0];
};

export const openBusinessHourDefault = async (): Promise<void> => {
	const activeDefaultBusinessHour = await getDefaultBusinessHourOpenedRightNow();
	if (activeDefaultBusinessHour) {
		await Users.openAgentsBusinessHoursByBusinessHourId([activeDefaultBusinessHour._id]);
	}
	await Users.updateLivechatStatusBasedOnBusinessHours();
};

export const createDefaultBusinessHourIfNotExists = async (): Promise<void> => {
	if ((await LivechatBusinessHours.col.countDocuments({ type: LivechatBusinessHourTypes.DEFAULT })) === 0) {
		await LivechatBusinessHours.insertOne(createDefaultBusinessHourRow());
	}
};

export const isDefaultBusinessHourOpenedRightNow = async (): Promise<boolean> => {
	const activeDefaultBusinessHour = await getDefaultBusinessHourOpenedRightNow();
	return !!activeDefaultBusinessHour;
};

export const isBusinessHourOpenedRightNow = async (businessHourId: string): Promise<boolean> => {
	const businessHour = await LivechatBusinessHours.findOneById(businessHourId);
	if (!businessHour) {
		throw new Error(`Business hour not found for id: ${businessHourId}`);
	}

	return (await filterBusinessHoursThatMustBeOpenedByDay([businessHour], currentDay)).length > 0;
};
