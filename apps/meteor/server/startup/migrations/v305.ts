import { Settings } from '@rocket.chat/models';

import { addMigration } from '../../lib/migrations';

// Removes unused OAuth button colors settings
addMigration({
	version: 305,
	async up() {
		const customOauthServicesButtonColors = await Settings.find(
			{ _id: /Accounts_OAuth_.+button.+color$/ },
			{ projection: { _id: 1 } },
		).toArray();

		const settingsIdToDelete = customOauthServicesButtonColors.map(({ _id }) => _id);

		await Settings.deleteMany({
			_id: {
				$in: settingsIdToDelete,
			},
		});
	},
});
