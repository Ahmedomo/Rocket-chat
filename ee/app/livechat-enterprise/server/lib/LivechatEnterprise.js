import { Meteor } from 'meteor/meteor';
import { Match, check } from 'meteor/check';

import { Users, LivechatRooms, Subscriptions, LivechatInquiry, Messages } from '../../../../../app/models';
import LivechatUnit from '../../../models/server/models/LivechatUnit';
import LivechatTag from '../../../models/server/models/LivechatTag';
import LivechatPriority from '../../../models/server/models/LivechatPriority';
import { addUserRoles, removeUserFromRoles } from '../../../../../app/authorization/server';

export const LivechatEnterprise = {
	addMonitor(username) {
		check(username, String);

		const user = Users.findOneByUsername(username, { fields: { _id: 1, username: 1 } });

		if (!user) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'livechat:addMonitor' });
		}

		if (addUserRoles(user._id, 'livechat-monitor')) {
			return user;
		}

		return false;
	},

	removeMonitor(username) {
		check(username, String);

		const user = Users.findOneByUsername(username, { fields: { _id: 1 } });

		if (!user) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'livechat:removeMonitor' });
		}

		if (removeUserFromRoles(user._id, 'livechat-monitor')) {
			return true;
		}

		return false;
	},

	removeUnit(_id) {
		check(_id, String);

		const unit = LivechatUnit.findOneById(_id, { fields: { _id: 1 } });

		if (!unit) {
			throw new Meteor.Error('unit-not-found', 'Unit not found', { method: 'livechat:removeUnit' });
		}

		return LivechatUnit.removeById(_id);
	},

	saveUnit(_id, unitData, unitMonitors, unitDepartments) {
		check(_id, Match.Maybe(String));

		check(unitData, {
			name: String,
			visibility: String,
			enabled: Match.Optional(Boolean),
			description: Match.Optional(String),
			email: Match.Optional(String),
			showOnOfflineForm: Match.Optional(Boolean),
		});

		check(unitMonitors, [
			Match.ObjectIncluding({
				monitorId: String,
				username: String,
			}),
		]);

		check(unitDepartments, [
			Match.ObjectIncluding({
				departmentId: String,
			}),
		]);

		let ancestors = [];
		if (_id) {
			const unit = LivechatUnit.findOneById(_id);
			if (!unit) {
				throw new Meteor.Error('error-unit-not-found', 'Unit not found', { method: 'livechat:saveUnit' });
			}

			ancestors = unit.ancestors;
		}

		return LivechatUnit.createOrUpdateUnit(_id, unitData, ancestors, unitMonitors, unitDepartments);
	},

	removeTag(_id) {
		check(_id, String);

		const tag = LivechatTag.findOneById(_id, { fields: { _id: 1 } });

		if (!tag) {
			throw new Meteor.Error('tag-not-found', 'Tag not found', { method: 'livechat:removeTag' });
		}

		return LivechatTag.removeById(_id);
	},

	saveTag(_id, tagData, tagDepartments) {
		check(_id, Match.Maybe(String));

		check(tagData, {
			name: String,
			description: Match.Optional(String),
		});

		check(tagDepartments, [String]);

		return LivechatTag.createOrUpdateTag(_id, tagData, tagDepartments);
	},

	savePriority(_id, priorityData) {
		check(_id, Match.Maybe(String));

		check(priorityData, {
			name: String,
			description: Match.Optional(String),
			color: String,
			dueTimeInMinutes: String,
		});
		const priority = LivechatPriority.createOrUpdatePriority(_id, priorityData);
		if (priority) {
			LivechatRooms.updatePriorityDataByPriorityId(priority._id, priority);
			Subscriptions.updatePriorityDataByPriorityId(priority._id, priority);
			LivechatInquiry.updatePriorityDataByPriorityId(priority._id, priority);
		}
		return priority;
	},

	removePriority(_id) {
		check(_id, String);

		const priority = LivechatPriority.findOneById(_id, { fields: { _id: 1 } });

		if (!priority) {
			throw new Meteor.Error('priority-not-found', 'Priority not found', { method: 'livechat:removePriority' });
		}
		const removed = LivechatPriority.removeById(_id);
		if (removed) {
			LivechatRooms.unsetPriorityByPriorityId(_id);
			Subscriptions.unsetPriorityByPriorityId(_id);
			LivechatInquiry.unsetPriorityByPriorityId(_id);
		}
		return removed;
	},

	savePriorityOnRoom(roomId, user, priority) {
		check(priority, {
			_id: String,
		});

		const { _id: priorityId } = priority;
		LivechatRooms.setPriorityById(roomId, priorityId);
		// LivechatInquiry.setPriorityByRoomId(roomId, priority);

		const extraData = {
			priorityData: {
				definedBy: user,
				priority: priority || {},
			},
		};
		Messages.createPriorityHistoryWithRoomIdMessageAndUser(roomId, '', user, extraData);
	},
};
