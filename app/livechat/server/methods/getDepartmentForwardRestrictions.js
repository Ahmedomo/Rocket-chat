import { Meteor } from 'meteor/meteor';

import { callbacks } from '../../../callbacks';

Meteor.methods({
	'livechat:getDepartmentForwardRestrictions'(departmentId) {
		if (!Meteor.userId()) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'livechat:getDepartmentForwardRestrictions' });
		}

		const restrictions = callbacks.run('livechat.onLoadForwardDepartmentRestrictions', departmentId);
		return typeof restrictions === 'object' ? restrictions : {};
	},
});
