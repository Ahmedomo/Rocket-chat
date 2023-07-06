import os from 'os';

import { Settings } from '@rocket.chat/models';
import { check, Match } from 'meteor/check';
import { serverFetch as fetch } from '@rocket.chat/server-fetch';
import { config } from '@rocket.chat/config';

import { Info } from '../../../utils/server';
import { getWorkspaceAccessToken } from '../../../cloud/server';

export const getNewUpdates = async () => {
	try {
		const uniqueID = await Settings.findOne('uniqueID');

		if (!uniqueID) {
			throw new Error('uniqueID not found');
		}

		const params = {
			uniqueId: String(uniqueID.value),
			installedAt: uniqueID.createdAt.toJSON(),
			version: Info.version,
			osType: os.type(),
			osPlatform: os.platform(),
			osArch: os.arch(),
			osRelease: os.release(),
			nodeVersion: process.version,
			deployMethod: config.DEPLOY_METHOD,
			deployPlatform: config.DEPLOY_PLATFORM,
		};

		const token = await getWorkspaceAccessToken();
		const headers = {
			...(token && { Authorization: `Bearer ${token}` }),
		};
		const url = 'https://releases.rocket.chat/updates/check';
		const response = await fetch(url, {
			headers,
			params,
		});

		const data = await response.json();

		check(
			data,
			Match.ObjectIncluding({
				versions: [
					Match.ObjectIncluding({
						version: String,
						security: Match.Optional(Boolean),
						infoUrl: String,
					}),
				],
				alerts: [
					Match.Optional([
						Match.ObjectIncluding({
							id: String,
							title: String,
							text: String,
							textArguments: [Match.Any],
							modifiers: [String] as [StringConstructor],
							infoUrl: String,
						}),
					]),
				],
			}),
		);

		return data as {
			versions: {
				version: string;
				security: boolean;
				infoUrl: string;
			}[];

			alerts: {
				id: string;
				priority: number;
				title: string;
				text: string;
				textArguments?: string[];
				modifiers: string[];
				infoUrl: string;
			}[];
		};
	} catch (error) {
		// There's no need to log this error
		// as it's pointless and the user
		// can't do anything about it anyways

		return {
			versions: [],
			alerts: [],
		};
	}
};
