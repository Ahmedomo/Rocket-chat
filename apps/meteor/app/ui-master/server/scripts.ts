import { config } from '@rocket.chat/config';

import { settings } from '../../settings/server';
import { addScript } from './inject';

const getContent = (): string => `

${
	config.BUGSNAG_CLIENT
		? `window.__BUGSNAG_KEY__ = "${config.BUGSNAG_CLIENT}";\n
window.addEventListener('load', function() {
	const event = new Event('bugsnag-error-boundary');
	window.dispatchEvent(event);
});
`
		: ''
}

${config.DISABLE_ANIMATION ? 'window.DISABLE_ANIMATION = true;\n' : ''}

${settings.get('API_Use_REST_For_DDP_Calls') ? 'window.USE_REST_FOR_DDP_CALLS = true;\n' : ''}
${settings.get('ECDH_Enabled') ? 'window.ECDH_Enabled = true;\n' : ''}
// Custom_Script_Logged_Out
window.addEventListener('Custom_Script_Logged_Out', function() {
	${settings.get('Custom_Script_Logged_Out')}
})


// Custom_Script_Logged_In
window.addEventListener('Custom_Script_Logged_In', function() {
	${settings.get('Custom_Script_Logged_In')}
})


// Custom_Script_On_Logout
window.addEventListener('Custom_Script_On_Logout', function() {
	${settings.get('Custom_Script_On_Logout')}
})

${
	settings.get('Accounts_ForgetUserSessionOnWindowClose')
		? `
window.addEventListener('load', function() {
	if (window.localStorage) {
		Object.keys(window.localStorage).forEach(function(key) {
			window.sessionStorage.setItem(key, window.localStorage.getItem(key));
		});
		window.localStorage.clear();
		Meteor._localStorage = window.sessionStorage;
	}
});
`
		: ''
}`;

settings.watchMultiple(
	[
		'API_Use_REST_For_DDP_Calls',
		'Custom_Script_Logged_Out',
		'Custom_Script_Logged_In',
		'Custom_Script_On_Logout',
		'Accounts_ForgetUserSessionOnWindowClose',
		'ECDH_Enabled',
	],
	() => {
		const content = getContent();
		addScript('scripts', content);
	},
);
