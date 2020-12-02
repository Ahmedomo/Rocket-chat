import { addAction } from '../../../client/channel/lib/Toolbox';

addAction('push-notifications', {
	groups: ['channel', 'group', 'direct', 'live'],
	id: 'push-notifications',
	title: 'Notifications_Preferences',
	icon: 'bell',
	template: 'pushNotificationsFlexTab',
	order: 8,
});
