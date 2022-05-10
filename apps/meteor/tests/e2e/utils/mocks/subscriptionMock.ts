import type { ISubscription } from '@rocket.chat/core-typings';

export const subscriptionMock: ISubscription[] = [
	{
		_id: 'zjHWmhH4go9NoGwTP',
		open: true,
		alert: true,
		unread: 0,
		userMentions: 0,
		groupMentions: 0,
		ts: new Date(),
		rid: 'GENERAL',
		name: 'general',
		ls: new Date(),
		lr: new Date(),
		t: 'c',
		u: {
			_id: 'vvsKGW5tKKqP9vj54',
			username: 'user.name.test',
			name: 'Normal User',
		},
		_updatedAt: new Date(),
	},
	{
		_id: 'cKZP37FdE8soBpJmN',
		open: true,
		alert: true,
		unread: 0,
		userMentions: 0,
		groupMentions: 0,
		ts: new Date(),
		rid: 'fWJChTFjhQLXZrusq',
		name: 'public channel',
		fname: 'public channel',
		lr: new Date(),
		t: 'c',
		u: {
			_id: 'vvsKGW5tKKqP9vj54',
			username: 'user.name.test',
		},
		ls: new Date(),
		_updatedAt: new Date(),
		roles: ['owner'],
	},
	{
		_id: 'RD7gjmtqnQtnR6BTt',
		open: true,
		alert: false,
		unread: 0,
		userMentions: 0,
		groupMentions: 0,
		ts: new Date(),
		rid: '9kc9F8BghhCp5bc3T',
		name: 'private channel',
		fname: 'private channel',
		lr: new Date(),
		t: 'p',
		u: {
			_id: 'vvsKGW5tKKqP9vj54',
			username: 'user.name.test',
		},
		ls: new Date(),
		_updatedAt: new Date(),
		roles: ['owner'],
	},
	{
		_id: 'T3Skt3gxZoTrWwWZx',
		open: true,
		alert: false,
		unread: 0,
		userMentions: 0,
		groupMentions: 0,
		ts: new Date(),
		rid: '9kc9F8BghhCp5bc3T',
		name: 'private channel',
		fname: 'private channel',
		lr: new Date(),
		t: 'p',
		u: {
			_id: 'rocketchat.internal.admin.test',
			username: 'rocketchat.internal.admin.test',
			name: 'RocketChat Internal Admin Test',
		},
		_updatedAt: new Date(),
		ls: new Date(),
	},
];
