import { Meteor } from 'meteor/meteor';

import { Messages, RoomRoles, Subscriptions } from '../../../app/models/client';
import { Notifications } from '../../../app/notifications/client';
import type { IUser } from '@rocket.chat/core-typings';

type UsersNameChangedEvent = Partial<IUser>;

Meteor.startup(() => {
	Notifications.onLogged('Users:NameChanged', ({ _id, name, username }: UsersNameChangedEvent) => {
		Messages.update(
			{
				'u._id': _id,
			},
			{
				$set: {
					'u.username': username,
					'u.name': name,
				},
			},
			{
				multi: true,
			},
		);

		Messages.update(
			{
				mentions: {
					$elemMatch: { _id },
				},
			},
			{
				$set: {
					'mentions.$.username': username,
					'mentions.$.name': name,
				},
			},
			{
				multi: true,
			},
		);

		Subscriptions.update(
			{
				name: username,
				t: 'd',
			},
			{
				$set: {
					fname: name,
				},
			},
		);

		RoomRoles.update(
			{
				'u._id': _id,
			},
			{
				$set: {
					'u.name': name,
				},
			},
			{
				multi: true,
			},
		);
	});
});
