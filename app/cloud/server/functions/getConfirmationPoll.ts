import { HTTP } from 'meteor/http';

import { settings } from '../../../settings/server';
import { SystemLogger } from '../../../../server/lib/logger/system';

export async function getConfirmationPoll(deviceCode: string): Promise<void | boolean> {
	const cloudUrl = settings.get('Cloud_Url');

	let result;
	try {
		result = HTTP.get(`${cloudUrl}/api/v2/register/workspace/poll?token=${deviceCode}`);
	} catch (e) {
		if (e.response && e.response.data && e.response.data.error) {
			SystemLogger.error(`Failed to register with Rocket.Chat Cloud. ErrorCode: ${e.response.data.error}`);
		} else {
			SystemLogger.error(e);
		}

		return false;
	}

	const { data } = result;

	if (!data) {
		return false;
	}

	return data;
}
