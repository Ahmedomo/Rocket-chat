import type { IRole } from './IRole';

type sessionType = 'session' | 'computed-session' | 'user_daily';
export interface ISessionDevice {
	type: string;
	name: string;
	longVersion: string;
	os: {
		name: string;
		version: string;
	};
	version: string;
}
export interface ISession {
	_id: string;
	type: sessionType;
	mostImportantRole: IRole['_id'];
	userId: string;
	lastActivityAt?: Date;
	device?: ISessionDevice;
	roles: string[];
	year: number;
	month: number;
	day: number;
	instanceId: string;
	sessionId: string;
	_updatedAt: Date;
	createdAt: Date;
	host: string;
	ip: string;
	loginAt: Date;
	logoutAt?: Date;
	closedAt?: Date;
	logoutBy?: string;
	count?: number;
	loginToken?: string;
}

type SessionAggregationResult = {
	year: number;
	month: number;
	day: number;
};

export type UserSessionAggregationResult = SessionAggregationResult & {
	data: UserSessionAggregation[];
};
export type DeviceSessionAggregationResult = SessionAggregationResult & {
	data: DeviceSessionAggregation[];
};
export type OSSessionAggregationResult = SessionAggregationResult & {
	data: OSSessionAggregation[];
};

export type UserSessionAggregation = Pick<ISession, '_id'> & {
	count: number;
	sessions: number;
	roles: { role: string; count: number; sessions: number; time: number }[];
};
export type DeviceSessionAggregation = Pick<ISession, '_id'> & {
	type: string;
	name: string;
	version: string;
	count: number;
	time: number;
};
export type OSSessionAggregation = Pick<ISession, '_id'> & {
	name: string;
	version: string;
	count: number;
	time: number;
};
