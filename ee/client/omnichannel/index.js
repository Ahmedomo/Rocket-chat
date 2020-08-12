import { hasLicense } from '../../app/license/client';

hasLicense('livechat-enterprise').then((enabled) => {
	if (!enabled) {
		return;
	}

	require('./additionalForms/register');
});
