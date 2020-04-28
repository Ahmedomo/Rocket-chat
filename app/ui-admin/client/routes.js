import { FlowRouter } from 'meteor/kadira:flow-router';
// import { BlazeLayout } from 'meteor/kadira:blaze-layout';
import { Meteor } from 'meteor/meteor';

import { renderRouteComponent } from '../../../client/reactAdapters';

const routeGroup = FlowRouter.group({
	name: 'admin',
	prefix: '/admin',
});

export const registerAdminRoute = (path, { lazyRouteComponent, props, action, ...options } = {}) => {
	routeGroup.route(path, {
		...options,
		action: (params, queryParams) => {
			if (action) {
				action(params, queryParams);
				return;
			}

			renderRouteComponent(() => import('./components/AdministrationRouter'), {
				template: 'main',
				region: 'center',
				propsFn: () => ({ lazyRouteComponent, ...options, params, queryParams, ...props }),
			});
		},
	});
};

registerAdminRoute('/', {
	triggersEnter: [(context, redirect) => {
		redirect('admin-info');
	}],
});

registerAdminRoute('/info', {
	name: 'admin-info',
	lazyRouteComponent: () => import('./components/info/InformationRoute'),
});

registerAdminRoute('/mailer', {
	name: 'admin-mailer',
	lazyRouteComponent: () => import('./components/mailer/MailerRoute'),
});

registerAdminRoute('/custom-user-status/:context?/:id?', {
	name: 'custom-user-status',
	lazyRouteComponent: () => import('../../../client/admin/customUserStatus/CustomUserStatusRoute'),
});

registerAdminRoute('/users/:context?/:id?', {
	name: 'admin-users',
	lazyRouteComponent: () => import('../../../client/admin/users/AdminUsersRoute'),
	tab: 'users',
});

registerAdminRoute('/rooms/:context?/:id?', {
	name: 'admin-rooms',
	lazyRouteComponent: () => import('../../../client/admin/rooms/AdminRoomsRoute'),
	tab: 'rooms',
});

Meteor.startup(() => {
	registerAdminRoute('/:group+', {
		name: 'admin',
		lazyRouteComponent: () => import('./components/settings/SettingsRoute'),
	});
});
