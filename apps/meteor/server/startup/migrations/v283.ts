import type { IAppStorageItem } from '@rocket.chat/apps-engine/server/storage';

import { AppRealStorage } from '../../../app/apps/server/storage';
import { addMigration } from '../../lib/migrations';
import { AppsModel } from '../../../app/models/server';

addMigration({
	version: 283,
	name: "Mark all installed apps as 'migrated'",
	async up() {
		const appsStorage = new AppRealStorage(AppsModel);

		const apps = await appsStorage.retrieveAll();

		const promises: Array<ReturnType<typeof appsStorage.update>> = [];

		apps.forEach((app) =>
			promises.push(
				appsStorage.update({
					...app,
					migrated: true,
					installationSource: 'marketplaceInfo' in app ? 'marketplace' : 'private',
				} as IAppStorageItem),
			),
		);

		await Promise.all(promises);
	},
});
