import type {
	Db,
	Collection,
	IndexDescription,
	Document,
	Filter,
	FindOptions,
	UpdateFilter,
	SortDirection,
	FindCursor,
	UpdateResult,
} from 'mongodb';
import { escapeRegExp } from '@rocket.chat/string-helpers';
import { Settings } from '@rocket.chat/models';
import type {
	IOmnichannelRoom,
	RocketChatRecordDeleted,
	IOmnichannelRoomClosingInfo,
	DeepWritable,
	ISetting,
	IMessage,
	ILivechatPriority,
	IOmnichannelServiceLevelAgreements,
} from '@rocket.chat/core-typings';
import type { ILivechatRoomsModel } from '@rocket.chat/model-typings';

import { BaseRaw } from './BaseRaw';
import { getValue } from '../../../app/settings/server/raw';
import { readSecondaryPreferred } from '../../database/readSecondaryPreferred';

/**
 * @extends BaseRaw<ILivechatRoom>
 */
export class LivechatRoomsRaw extends BaseRaw<IOmnichannelRoom> implements ILivechatRoomsModel {
	constructor(db: Db, trash?: Collection<RocketChatRecordDeleted<IOmnichannelRoom>>) {
		super(db, 'room', trash);
	}

	// move indexes from constructor to here using IndexDescription as type
	protected modelIndexes(): IndexDescription[] {
		return [
			{ key: { open: 1 }, sparse: true },
			{ key: { departmentId: 1 }, sparse: true },
			{ key: { 'metrics.chatDuration': 1 }, sparse: true },
			{ key: { 'metrics.serviceTimeDuration': 1 }, sparse: true },
			{ key: { 'metrics.visitorInactivity': 1 }, sparse: true },
			{ key: { 'omnichannel.predictedVisitorAbandonmentAt': 1 }, sparse: true },
			{ key: { closedAt: 1 }, sparse: true },
			{ key: { servedBy: 1 }, sparse: true },
			{ key: { 'v.token': 1 }, sparse: true },
			{ key: { 'v.token': 1, 'email.thread': 1 }, sparse: true },
			{ key: { 'v._id': 1 }, sparse: true },
			{ key: { t: 1, departmentId: 1, closedAt: 1 }, partialFilterExpression: { closedAt: { $exists: true } } },
			{ key: { source: 1 }, sparse: true },
			{ key: { departmentAncestors: 1 }, sparse: true },
			{
				key: { 't': 1, 'open': 1, 'source.type': 1, 'v.status': 1 },
				partialFilterExpression: {
					't': { $eq: 'l' },
					'open': { $eq: true },
					'source.type': { $eq: 'widget' },
				},
			},
			{ key: { 'livechatData.$**': 1 } },
			{ key: { pdfTranscriptRequested: 1 }, sparse: true },
			{ key: { pdfTranscriptFileId: 1 }, sparse: true }, // used on statistics
			{ key: { callStatus: 1 }, sparse: true }, // used on statistics
			{ key: { priorityId: 1 }, sparse: true },
			{ key: { slaId: 1 }, sparse: true },
		];
	}

	getQueueMetrics({
		departmentId,
		agentId,
		includeOfflineAgents,
		options = {},
	}: {
		departmentId?: string;
		agentId?: string;
		includeOfflineAgents?: boolean;
		options?: { offset?: number; count?: number; sort?: { [k: string]: number } };
	}) {
		const match: Document = { $match: { t: 'l', open: true, servedBy: { $exists: true } } };
		const matchUsers: Document = { $match: {} };
		if (departmentId && departmentId !== 'undefined') {
			match.$match.departmentId = departmentId;
		}
		if (agentId) {
			matchUsers.$match['user._id'] = agentId;
		}
		if (!includeOfflineAgents) {
			matchUsers.$match['user.status'] = { $ne: 'offline' };
			matchUsers.$match['user.statusLivechat'] = { $eq: 'available' };
		}
		const departmentsLookup = {
			$lookup: {
				from: 'rocketchat_livechat_department',
				localField: 'departmentId',
				foreignField: '_id',
				as: 'departments',
			},
		};
		const departmentsUnwind = {
			$unwind: {
				path: '$departments',
				preserveNullAndEmptyArrays: true,
			},
		};
		const departmentsGroup = {
			$group: {
				_id: {
					departmentId: '$departmentId',
					name: '$departments.name',
					room: '$$ROOT',
				},
			},
		};
		const usersLookup = {
			$lookup: {
				from: 'users',
				localField: '_id.room.servedBy._id',
				foreignField: '_id',
				as: 'user',
			},
		};
		const usersUnwind = {
			$unwind: {
				path: '$user',
				preserveNullAndEmptyArrays: true,
			},
		};
		const usersGroup = {
			$group: {
				_id: {
					userId: '$user._id',
					username: '$user.username',
					status: '$user.status',
					departmentId: '$_id.departmentId',
					departmentName: '$_id.name',
				},
				chats: { $sum: 1 },
			},
		};
		const project = {
			$project: {
				_id: 0,
				user: {
					_id: '$_id.userId',
					username: '$_id.username',
					status: '$_id.status',
				},
				department: {
					_id: { $ifNull: ['$_id.departmentId', null] },
					name: { $ifNull: ['$_id.departmentName', null] },
				},
				chats: 1,
			},
		};
		const firstParams = [match, departmentsLookup, departmentsUnwind, departmentsGroup, usersLookup, usersUnwind];
		if (Object.keys(matchUsers.$match)) {
			firstParams.push(matchUsers);
		}
		const sort: Document = { $sort: options.sort || { chats: -1 } };
		const pagination = [sort];

		if (options.offset) {
			pagination.push({ $skip: options.offset });
		}
		if (options.count) {
			pagination.push({ $limit: options.count });
		}

		const facet = {
			$facet: {
				sortedResults: pagination,
				totalCount: [{ $group: { _id: null, total: { $sum: 1 } } }],
			},
		};

		const params = [...firstParams, usersGroup, project, facet];
		return this.col.aggregate(params, { readPreference: readSecondaryPreferred() }).toArray();
	}

	async findAllNumberOfAbandonedRooms({
		start,
		end,
		departmentId,
		onlyCount = false,
		options = {},
	}: {
		start: Date;
		end: Date;
		departmentId?: string;
		onlyCount?: boolean;
		options?: { offset?: number; count?: number; sort?: { [k: string]: number } };
	}) {
		const match: Document = {
			$match: {
				't': 'l',
				'metrics.visitorInactivity': {
					$gte: await getValue('Livechat_visitor_inactivity_timeout'),
				},
				'ts': { $gte: new Date(start) },
				'closedAt': { $lte: new Date(end) },
			},
		};
		const group = {
			$group: {
				_id: {
					_id: null,
					departmentId: '$departmentId',
				},
				abandonedRooms: { $sum: 1 },
			},
		};
		const project = {
			$project: {
				_id: { $ifNull: ['$_id.departmentId', null] },
				abandonedRooms: 1,
			},
		};
		if (departmentId && departmentId !== 'undefined') {
			match.$match.departmentId = departmentId;
		}
		const sort: Document = { $sort: options.sort || { name: 1 } };
		const params: Document[] = [match, group, project, sort];
		if (onlyCount) {
			params.push({ $count: 'total' });
			return this.col.aggregate(params);
		}
		if (options.offset) {
			params.push({ $skip: options.offset });
		}
		if (options.count) {
			params.push({ $limit: options.count });
		}
		return this.col.aggregate(params, { readPreference: readSecondaryPreferred() });
	}

	async findPercentageOfAbandonedRooms({
		start,
		end,
		departmentId,
		onlyCount = false,
		options = {},
	}: {
		start: Date;
		end: Date;
		departmentId?: string;
		onlyCount?: boolean;
		options?: { offset?: number; count?: number; sort?: { [k: string]: number } };
	}) {
		const match: Document = {
			$match: {
				t: 'l',
				ts: { $gte: new Date(start), $lte: new Date(end) },
			},
		};
		const group: Document = {
			$group: {
				_id: {
					_id: null,
					departmentId: '$departmentId',
				},
				rooms: { $sum: 1 },
				abandonedChats: {
					$sum: {
						$cond: [
							{
								$and: [
									{ $ifNull: ['$metrics.visitorInactivity', false] },
									{
										// TODO: move these calls to outside model
										$gte: ['$metrics.visitorInactivity', await getValue('Livechat_visitor_inactivity_timeout')],
									},
								],
							},
							1,
							0,
						],
					},
				},
			},
		};
		const project = {
			$project: {
				_id: { $ifNull: ['$_id.departmentId', null] },
				percentageOfAbandonedChats: {
					$floor: {
						$cond: [{ $eq: ['$rooms', 0] }, 0, { $divide: [{ $multiply: ['$abandonedChats', 100] }, '$rooms'] }],
					},
				},
			},
		};
		if (departmentId && departmentId !== 'undefined') {
			match.$match.departmentId = departmentId;
		}
		const sort = { $sort: options.sort || { name: 1 } };
		const params = [match, group, project, sort];
		if (onlyCount) {
			params.push({ $count: 'total' });
			return this.col.aggregate(params);
		}
		if (options.offset) {
			params.push({ $skip: options.offset });
		}
		if (options.count) {
			params.push({ $limit: options.count });
		}
		return this.col.aggregate(params, { readPreference: readSecondaryPreferred() });
	}

	findAllAverageOfChatDurationTime({
		start,
		end,
		departmentId,
		onlyCount = false,
		options = {},
	}: {
		start: Date;
		end: Date;
		departmentId?: string;
		onlyCount?: boolean;
		options?: { offset?: number; count?: number; sort?: { [k: string]: number } };
	}) {
		const match: Document = {
			$match: {
				t: 'l',
				ts: { $gte: new Date(start) },
				closedAt: { $lte: new Date(end) },
			},
		};
		const group: Document = {
			$group: {
				_id: {
					_id: null,
					departmentId: '$departmentId',
				},
				rooms: { $sum: 1 },
				chatsDuration: { $sum: '$metrics.chatDuration' },
			},
		};
		const project = {
			$project: {
				_id: { $ifNull: ['$_id.departmentId', null] },
				averageChatDurationTimeInSeconds: {
					$ceil: { $cond: [{ $eq: ['$rooms', 0] }, 0, { $divide: ['$chatsDuration', '$rooms'] }] },
				},
			},
		};
		if (departmentId && departmentId !== 'undefined') {
			match.$match.departmentId = departmentId;
		}
		const sort: Document = { $sort: options.sort || { name: 1 } };
		const params: Document[] = [match, group, project, sort];
		if (onlyCount) {
			params.push({ $count: 'total' });
			return this.col.aggregate(params);
		}
		if (options.offset) {
			params.push({ $skip: options.offset });
		}
		if (options.count) {
			params.push({ $limit: options.count });
		}
		return this.col.aggregate(params, { readPreference: readSecondaryPreferred() });
	}

	findAllAverageWaitingTime({
		start,
		end,
		departmentId,
		onlyCount = false,
		options = {},
	}: {
		start: Date;
		end: Date;
		departmentId?: string;
		onlyCount?: boolean;
		options?: { offset?: number; count?: number; sort?: { [k: string]: number } };
	}) {
		const match: Document = {
			$match: {
				t: 'l',
				ts: { $gte: new Date(start), $lte: new Date(end) },
				waitingResponse: { $ne: true },
			},
		};
		const group: Document = {
			$group: {
				_id: {
					_id: null,
					departmentId: '$departmentId',
				},
				rooms: { $sum: 1 },
				chatsFirstResponses: { $sum: '$metrics.response.ft' },
			},
		};
		const project = {
			$project: {
				_id: { $ifNull: ['$_id.departmentId', null] },
				averageWaitingTimeInSeconds: {
					$ceil: {
						$cond: [{ $eq: ['$rooms', 0] }, 0, { $divide: ['$chatsFirstResponses', '$rooms'] }],
					},
				},
			},
		};
		if (departmentId && departmentId !== 'undefined') {
			match.$match.departmentId = departmentId;
		}
		const sort: Document = { $sort: options.sort || { name: 1 } };
		const params: Document[] = [match, group, project, sort];
		if (onlyCount) {
			params.push({ $count: 'total' });
			return this.col.aggregate(params);
		}
		if (options.offset) {
			params.push({ $skip: options.offset });
		}
		if (options.count) {
			params.push({ $limit: options.count });
		}
		return this.col.aggregate(params, { readPreference: readSecondaryPreferred() });
	}

	findAllRooms({
		start,
		end,
		answered,
		departmentId,
		onlyCount = false,
		options = {},
	}: {
		start: Date;
		end: Date;
		answered?: boolean;
		departmentId?: string;
		onlyCount?: boolean;
		options?: { offset?: number; count?: number; sort?: { [k: string]: number } };
	}) {
		const match: Document = {
			$match: {
				t: 'l',
				ts: { $gte: new Date(start), $lte: new Date(end) },
			},
		};
		if (answered !== undefined) {
			match.$match.waitingResponse = { [answered ? '$ne' : '$eq']: true };
		}
		const group: Document = {
			$group: {
				_id: {
					_id: null,
					departmentId: '$departmentId',
				},
				rooms: { $sum: 1 },
			},
		};
		const project = {
			$project: {
				_id: { $ifNull: ['$_id.departmentId', null] },
				rooms: 1,
			},
		};
		if (departmentId && departmentId !== 'undefined') {
			match.$match.departmentId = departmentId;
		}
		const sort: Document = { $sort: options.sort || { name: 1 } };
		const params: Document[] = [match, group, project, sort];
		if (onlyCount) {
			params.push({ $count: 'total' });
			return this.col.aggregate(params);
		}
		if (options.offset) {
			params.push({ $skip: options.offset });
		}
		if (options.count) {
			params.push({ $limit: options.count });
		}
		return this.col.aggregate(params, { readPreference: readSecondaryPreferred() });
	}

	findAllServiceTime({
		start,
		end,
		departmentId,
		onlyCount = false,
		options = {},
	}: {
		start: Date;
		end: Date;
		departmentId?: string;
		onlyCount?: boolean;
		options?: { offset?: number; count?: number; sort?: { [k: string]: number } };
	}) {
		const match: Document = {
			$match: {
				't': 'l',
				'ts': { $gte: new Date(start) },
				'closedAt': { $lte: new Date(end) },
				'metrics.serviceTimeDuration': { $exists: true },
			},
		};
		const group = {
			$group: {
				_id: {
					_id: null,
					departmentId: '$departmentId',
				},
				rooms: { $sum: 1 },
				serviceTimeDuration: { $sum: '$metrics.serviceTimeDuration' },
			},
		};
		const project = {
			$project: {
				_id: { $ifNull: ['$_id.departmentId', null] },
				chats: '$rooms',
				serviceTimeDuration: { $ceil: '$serviceTimeDuration' },
			},
		};
		if (departmentId && departmentId !== 'undefined') {
			match.$match.departmentId = departmentId;
		}
		const sort = { $sort: options.sort || { name: 1 } };
		const params: Document[] = [match, group, project, sort];
		if (onlyCount) {
			params.push({ $count: 'total' });
			return this.col.aggregate(params);
		}
		if (options.offset) {
			params.push({ $skip: options.offset });
		}
		if (options.count) {
			params.push({ $limit: options.count });
		}
		return this.col.aggregate(params, { readPreference: readSecondaryPreferred() });
	}

	findAllNumberOfTransferredRooms({
		start,
		end,
		departmentId,
		options = {},
	}: {
		start: Date;
		end: Date;
		departmentId?: string;
		options?: { offset?: number; count?: number; sort?: { [k: string]: number } };
	}) {
		const match: Document = {
			$match: {
				t: 'l',
				ts: { $gte: new Date(start), $lte: new Date(end) },
			},
		};
		const departmentsLookup = {
			$lookup: {
				from: 'rocketchat_livechat_department',
				localField: 'departmentId',
				foreignField: '_id',
				as: 'departments',
			},
		};
		const departmentsUnwind = {
			$unwind: {
				path: '$departments',
				preserveNullAndEmptyArrays: true,
			},
		};
		const departmentsGroup = {
			$group: {
				_id: {
					_id: null,
					departmentId: '$departments._id',
					name: '$departments.name',
				},
				rooms: { $push: '$$ROOT' },
			},
		};
		const departmentsProject = {
			$project: {
				_id: '$_id.departmentId',
				name: '$_id.name',
				rooms: 1,
			},
		};
		const roomsUnwind = {
			$unwind: {
				path: '$rooms',
				preserveNullAndEmptyArrays: true,
			},
		};
		const messagesLookup = {
			$lookup: {
				from: 'rocketchat_message',
				localField: 'rooms._id',
				foreignField: 'rid',
				as: 'messages',
			},
		};
		const messagesProject = {
			$project: {
				_id: 1,
				name: 1,
				messages: {
					$filter: {
						input: '$messages',
						as: 'message',
						cond: {
							$and: [{ $eq: ['$$message.t', 'livechat_transfer_history'] }],
						},
					},
				},
			},
		};
		const transferProject = {
			$project: {
				name: 1,
				transfers: { $size: { $ifNull: ['$messages', []] } },
			},
		};
		const transferGroup = {
			$group: {
				_id: {
					departmentId: '$_id',
					name: '$name',
				},
				numberOfTransferredRooms: { $sum: '$transfers' },
			},
		};
		const presentationProject = {
			$project: {
				_id: { $ifNull: ['$_id.departmentId', null] },
				name: { $ifNull: ['$_id.name', null] },
				numberOfTransferredRooms: 1,
			},
		};
		const firstParams: Document[] = [match, departmentsLookup, departmentsUnwind];
		if (departmentId && departmentId !== 'undefined') {
			firstParams.push({
				$match: {
					'departments._id': departmentId,
				},
			});
		}
		const sort = { $sort: options.sort || { name: 1 } };
		const params: Document[] = [
			...firstParams,
			departmentsGroup,
			departmentsProject,
			roomsUnwind,
			messagesLookup,
			messagesProject,
			transferProject,
			transferGroup,
			presentationProject,
			sort,
		];
		if (options.offset) {
			params.push({ $skip: options.offset });
		}
		if (options.count) {
			params.push({ $limit: options.count });
		}
		return this.col.aggregate(params, { allowDiskUse: true, readPreference: readSecondaryPreferred() }).toArray();
	}

	countAllOpenChatsBetweenDate({ start, end, departmentId }: { start: Date; end: Date; departmentId?: string }) {
		const query: Filter<IOmnichannelRoom> = {
			't': 'l',
			'metrics.chatDuration': {
				$exists: false,
			},
			'$or': [
				{
					onHold: {
						$exists: false,
					},
				},
				{
					onHold: {
						$exists: true,
						$eq: false,
					},
				},
			],
			'servedBy': { $exists: true },
			'ts': { $gte: new Date(start), $lte: new Date(end) },
		};
		if (departmentId && departmentId !== 'undefined') {
			query.departmentId = departmentId;
		}
		return this.col.countDocuments(query);
	}

	countAllClosedChatsBetweenDate({ start, end, departmentId }: { start: Date; end: Date; departmentId?: string }) {
		const query: Filter<IOmnichannelRoom> = {
			't': 'l',
			'metrics.chatDuration': {
				$exists: true,
			},
			'ts': { $gte: new Date(start), $lte: new Date(end) },
		};
		if (departmentId && departmentId !== 'undefined') {
			query.departmentId = departmentId;
		}
		return this.col.countDocuments(query);
	}

	countAllQueuedChatsBetweenDate({ start, end, departmentId }: { start: Date; end: Date; departmentId?: string }) {
		const query: Filter<IOmnichannelRoom> = {
			t: 'l',
			servedBy: { $exists: false },
			open: true,
			ts: { $gte: new Date(start), $lte: new Date(end) },
		};
		if (departmentId && departmentId !== 'undefined') {
			query.departmentId = departmentId;
		}
		return this.col.countDocuments(query);
	}

	countAllOpenChatsByAgentBetweenDate({ start, end, departmentId }: { start: Date; end: Date; departmentId?: string }) {
		const match: Document = {
			$match: {
				't': 'l',
				'servedBy.username': { $exists: true },
				'open': true,
				'$or': [
					{
						onHold: {
							$exists: false,
						},
					},
					{
						onHold: {
							$exists: true,
							$eq: false,
						},
					},
				],
				'ts': { $gte: new Date(start), $lte: new Date(end) },
			},
		};
		const group = {
			$group: {
				_id: '$servedBy.username',
				chats: { $sum: 1 },
			},
		};
		if (departmentId && departmentId !== 'undefined') {
			match.$match.departmentId = departmentId;
		}
		return this.col.aggregate([match, group], { readPreference: readSecondaryPreferred() }).toArray();
	}

	countAllOnHoldChatsByAgentBetweenDate({ start, end, departmentId }: { start: Date; end: Date; departmentId?: string }) {
		const match: Document = {
			$match: {
				't': 'l',
				'servedBy.username': { $exists: true },
				'open': true,
				'onHold': {
					$exists: true,
					$eq: true,
				},
				'ts': { $gte: new Date(start), $lte: new Date(end) },
			},
		};
		const group = {
			$group: {
				_id: '$servedBy.username',
				chats: { $sum: 1 },
			},
		};
		if (departmentId && departmentId !== 'undefined') {
			match.$match.departmentId = departmentId;
		}
		return this.col.aggregate([match, group], { readPreference: readSecondaryPreferred() }).toArray();
	}

	countAllClosedChatsByAgentBetweenDate({ start, end, departmentId }: { start: Date; end: Date; departmentId?: string }) {
		const match: Document = {
			$match: {
				't': 'l',
				'open': { $exists: false },
				'servedBy.username': { $exists: true },
				'ts': { $gte: new Date(start) },
				'closedAt': { $lte: new Date(end) },
			},
		};
		const group = {
			$group: {
				_id: '$servedBy.username',
				chats: { $sum: 1 },
			},
		};
		if (departmentId && departmentId !== 'undefined') {
			match.$match.departmentId = departmentId;
		}
		return this.col.aggregate([match, group], { readPreference: readSecondaryPreferred() }).toArray();
	}

	countAllOpenChatsByDepartmentBetweenDate({ start, end, departmentId }: { start: Date; end: Date; departmentId?: string }) {
		const match: Document = {
			$match: {
				t: 'l',
				open: true,
				departmentId: { $exists: true },
				ts: { $gte: new Date(start), $lte: new Date(end) },
			},
		};
		const lookup = {
			$lookup: {
				from: 'rocketchat_livechat_department',
				localField: 'departmentId',
				foreignField: '_id',
				as: 'departments',
			},
		};
		const unwind = {
			$unwind: {
				path: '$departments',
				preserveNullAndEmptyArrays: true,
			},
		};
		const group = {
			$group: {
				_id: {
					_id: '$departments._id',
					name: '$departments.name',
				},
				chats: { $sum: 1 },
			},
		};
		const project = {
			$project: {
				_id: '$_id._id',
				name: '$_id.name',
				chats: 1,
			},
		};
		if (departmentId && departmentId !== 'undefined') {
			match.$match.departmentId = departmentId;
		}
		const params = [match, lookup, unwind, group, project];
		return this.col.aggregate(params, { readPreference: readSecondaryPreferred() }).toArray();
	}

	countAllClosedChatsByDepartmentBetweenDate({ start, end, departmentId }: { start: Date; end: Date; departmentId?: string }) {
		const match: Document = {
			$match: {
				t: 'l',
				open: { $exists: false },
				departmentId: { $exists: true },
				ts: { $gte: new Date(start), $lte: new Date(end) },
			},
		};
		const lookup = {
			$lookup: {
				from: 'rocketchat_livechat_department',
				localField: 'departmentId',
				foreignField: '_id',
				as: 'departments',
			},
		};
		const unwind = {
			$unwind: {
				path: '$departments',
				preserveNullAndEmptyArrays: true,
			},
		};
		const group = {
			$group: {
				_id: {
					_id: '$departments._id',
					name: '$departments.name',
				},
				chats: { $sum: 1 },
			},
		};
		const project = {
			$project: {
				_id: '$_id._id',
				name: '$_id.name',
				chats: 1,
			},
		};
		if (departmentId && departmentId !== 'undefined') {
			match.$match.departmentId = departmentId;
		}
		const params = [match, lookup, unwind, group, project];
		return this.col.aggregate(params, { readPreference: readSecondaryPreferred() }).toArray();
	}

	calculateResponseTimingsBetweenDates({ start, end, departmentId }: { start: Date; end: Date; departmentId?: string }) {
		const match: Document = {
			$match: {
				t: 'l',
				ts: { $gte: new Date(start), $lte: new Date(end) },
			},
		};
		const group = {
			$group: {
				_id: null,
				sumResponseAvg: {
					$sum: '$metrics.response.avg',
				},
				roomsWithResponseTime: {
					$sum: {
						$cond: [
							{
								$and: [{ $ifNull: ['$metrics.response.avg', false] }],
							},
							1,
							0,
						],
					},
				},
				maxFirstResponse: { $max: '$metrics.response.ft' },
			},
		};
		const project = {
			$project: {
				avg: {
					$trunc: {
						$cond: [{ $eq: ['$roomsWithResponseTime', 0] }, 0, { $divide: ['$sumResponseAvg', '$roomsWithResponseTime'] }],
					},
				},
				longest: '$maxFirstResponse',
			},
		};
		if (departmentId && departmentId !== 'undefined') {
			match.$match.departmentId = departmentId;
		}
		return this.col.aggregate([match, group, project], { readPreference: readSecondaryPreferred() }).toArray();
	}

	calculateReactionTimingsBetweenDates({ start, end, departmentId }: { start: Date; end: Date; departmentId?: string }) {
		const match: Document = {
			$match: {
				t: 'l',
				ts: { $gte: new Date(start), $lte: new Date(end) },
			},
		};
		const group = {
			$group: {
				_id: null,
				sumReactionFirstResponse: {
					$sum: '$metrics.reaction.ft',
				},
				roomsWithFirstReaction: {
					$sum: {
						$cond: [
							{
								$and: [{ $ifNull: ['$metrics.reaction.ft', false] }],
							},
							1,
							0,
						],
					},
				},
				maxFirstReaction: { $max: '$metrics.reaction.ft' },
			},
		};
		const project = {
			$project: {
				avg: {
					$trunc: {
						$cond: [{ $eq: ['$roomsWithFirstReaction', 0] }, 0, { $divide: ['$sumReactionFirstResponse', '$roomsWithFirstReaction'] }],
					},
				},
				longest: '$maxFirstReaction',
			},
		};
		if (departmentId && departmentId !== 'undefined') {
			match.$match.departmentId = departmentId;
		}
		return this.col.aggregate([match, group, project], { readPreference: readSecondaryPreferred() }).toArray();
	}

	calculateDurationTimingsBetweenDates({ start, end, departmentId }: { start: Date; end: Date; departmentId?: string }) {
		const match: Document = {
			$match: {
				't': 'l',
				'ts': { $gte: new Date(start), $lte: new Date(end) },
				'metrics.chatDuration': { $exists: true },
			},
		};
		const group = {
			$group: {
				_id: null,
				sumChatDuration: {
					$sum: '$metrics.chatDuration',
				},
				roomsWithChatDuration: {
					$sum: {
						$cond: [
							{
								$and: [{ $ifNull: ['$metrics.chatDuration', false] }],
							},
							1,
							0,
						],
					},
				},
				maxChatDuration: { $max: '$metrics.chatDuration' },
			},
		};
		const project = {
			$project: {
				avg: {
					$trunc: {
						$cond: [{ $eq: ['$roomsWithChatDuration', 0] }, 0, { $divide: ['$sumChatDuration', '$roomsWithChatDuration'] }],
					},
				},
				longest: '$maxChatDuration',
			},
		};
		if (departmentId && departmentId !== 'undefined') {
			match.$match.departmentId = departmentId;
		}
		return this.col.aggregate([match, group, project], { readPreference: readSecondaryPreferred() }).toArray();
	}

	findAllAverageOfServiceTime({
		start,
		end,
		departmentId,
		onlyCount = false,
		options = {},
	}: {
		start: Date;
		end: Date;
		departmentId?: string;
		onlyCount?: boolean;
		options?: { offset?: number; count?: number; sort?: { [k: string]: number } };
	}) {
		const match: Document = {
			$match: {
				't': 'l',
				'ts': { $gte: new Date(start), $lte: new Date(end) },
				'responseBy.lastMessageTs': { $exists: true },
				'servedBy.ts': { $exists: true },
			},
		};
		const group = {
			$group: {
				_id: {
					_id: null,
					departmentId: '$departmentId',
				},
				rooms: { $sum: 1 },
				allServiceTime: {
					$sum: { $divide: [{ $subtract: ['$responseBy.lastMessageTs', '$servedBy.ts'] }, 1000] },
				},
			},
		};
		const project = {
			$project: {
				_id: { $ifNull: ['$_id.departmentId', null] },
				averageServiceTimeInSeconds: {
					$ceil: { $cond: [{ $eq: ['$rooms', 0] }, 0, { $divide: ['$allServiceTime', '$rooms'] }] },
				},
			},
		};
		if (departmentId && departmentId !== 'undefined') {
			match.$match.departmentId = departmentId;
		}
		const sort = { $sort: options.sort || { name: 1 } };
		const params: Document[] = [match, group, project, sort];
		if (onlyCount) {
			params.push({ $count: 'total' });
			return this.col.aggregate(params);
		}
		if (options.offset) {
			params.push({ $skip: options.offset });
		}
		if (options.count) {
			params.push({ $limit: options.count });
		}
		return this.col.aggregate(params, { readPreference: readSecondaryPreferred() });
	}

	findByVisitorId(visitorId: string, options: FindOptions<IOmnichannelRoom>, extraQuery: Filter<IOmnichannelRoom> = {}) {
		const query: Filter<IOmnichannelRoom> = {
			't': 'l',
			'v._id': visitorId,
			...extraQuery,
		};
		return this.find(query, options);
	}

	findPaginatedByVisitorId(visitorId: string, options: FindOptions<IOmnichannelRoom>, extraQuery: Filter<IOmnichannelRoom> = {}) {
		const query: Filter<IOmnichannelRoom> = {
			't': 'l',
			'v._id': visitorId,
			...extraQuery,
		};
		return this.findPaginated(query, options);
	}

	findRoomsByVisitorIdAndMessageWithCriteria({
		visitorId,
		searchText,
		open,
		served,
		onlyCount = false,
		source,
		options = {},
	}: {
		visitorId: string;
		searchText?: string;
		open?: boolean;
		served?: boolean;
		onlyCount?: boolean;
		source?: string;
		options?: { sort?: { [k: string]: number }; skip?: number; limit?: number };
	}) {
		const match: Document = {
			$match: {
				'v._id': visitorId,
				...(open !== undefined && { open: { $exists: open } }),
				...(served !== undefined && { servedBy: { $exists: served } }),
				...(source && {
					$or: [{ 'source.type': new RegExp(escapeRegExp(source), 'i') }, { 'source.alias': new RegExp(escapeRegExp(source), 'i') }],
				}),
			},
		};
		const lookup = {
			$lookup: {
				from: 'rocketchat_message',
				localField: '_id',
				foreignField: 'rid',
				as: 'messages',
			},
		};
		const matchMessages = searchText && {
			$match: { 'messages.msg': { $regex: `.*${escapeRegExp(searchText)}.*` } },
		};

		const params: Document[] = [match, lookup];

		if (matchMessages) {
			params.push(matchMessages);
		}

		const project = {
			$project: {
				fname: 1,
				ts: 1,
				v: 1,
				msgs: 1,
				servedBy: 1,
				closedAt: 1,
				closedBy: 1,
				closer: 1,
				tags: 1,
				closingMessage: {
					$filter: {
						input: '$messages',
						as: 'messages',
						cond: { $eq: ['$$messages.t', 'livechat-close'] },
					},
				},
			},
		};

		const unwindClosingMsg = {
			$unwind: { path: '$closingMessage', preserveNullAndEmptyArrays: true },
		};
		const sort = { $sort: options.sort || { ts: -1 } };

		params.push(project, unwindClosingMsg, sort);

		if (onlyCount) {
			params.push({ $count: 'count' });
			return this.col.aggregate(params);
		}

		if (options.skip) {
			params.push({ $skip: options.skip });
		}

		if (options.limit) {
			params.push({ $limit: options.limit });
		}

		return this.col.aggregate(params, { readPreference: readSecondaryPreferred() });
	}

	findRoomsWithCriteria({
		agents,
		roomName,
		departmentId,
		open,
		served,
		createdAt,
		closedAt,
		tags,
		customFields,
		visitorId,
		roomIds,
		onhold,
		options = {},
		extraQuery = {},
	}: {
		agents?: string[];
		roomName?: string;
		departmentId?: string;
		open?: boolean;
		served?: boolean;
		createdAt?: { start?: Date; end?: Date };
		closedAt?: { start?: Date; end?: Date };
		tags?: string[];
		customFields?: Record<string, string>;
		visitorId?: string;
		roomIds?: string[];
		onhold?: boolean;
		options?: { offset?: number; count?: number; sort?: { [k: string]: SortDirection } };
		extraQuery?: Filter<IOmnichannelRoom>;
	}) {
		const query: Filter<IOmnichannelRoom> = {
			t: 'l',
			...extraQuery,
			...(agents && {
				$or: [{ 'servedBy._id': { $in: agents } }, { 'servedBy.username': { $in: agents } }],
			}),
			...(roomName && { fname: new RegExp(escapeRegExp(roomName), 'i') }),
			...(departmentId && departmentId !== 'undefined' && { departmentId }),
			...(open !== undefined && { open: { $exists: open }, onHold: { $ne: true } }),
			...(served !== undefined && { servedBy: { $exists: served } }),
			...(visitorId && visitorId !== 'undefined' && { 'v._id': visitorId }),
		};

		if (createdAt) {
			query.ts = {};
			if (createdAt.start) {
				query.ts.$gte = new Date(createdAt.start);
			}
			if (createdAt.end) {
				query.ts.$lte = new Date(createdAt.end);
			}
		}
		if (closedAt) {
			query.closedAt = {};
			if (closedAt.start) {
				query.closedAt.$gte = new Date(closedAt.start);
			}
			if (closedAt.end) {
				query.closedAt.$lte = new Date(closedAt.end);
			}
		}
		if (tags) {
			query.tags = { $in: tags };
		}
		if (customFields && Object.keys(customFields).length) {
			query.$and = Object.keys(customFields).map((key) => ({
				[`livechatData.${key}`]: new RegExp(customFields[key], 'i'),
			}));
		}

		if (roomIds) {
			query._id = { $in: roomIds };
		}

		if (onhold) {
			query.onHold = {
				$exists: true,
				$eq: onhold,
			};
		}

		return this.findPaginated(query, {
			sort: options.sort || { name: 1 },
			skip: options.offset,
			limit: options.count,
		});
	}

	getOnHoldConversationsBetweenDate(from: Date, to: Date, departmentId?: string) {
		const query: Filter<IOmnichannelRoom> = {
			onHold: {
				$exists: true,
				$eq: true,
			},
			ts: {
				$gte: new Date(from), // ISO Date, ts >= date.gte
				$lt: new Date(to), // ISODate, ts < date.lt
			},
		};

		if (departmentId && departmentId !== 'undefined') {
			query.departmentId = departmentId;
		}

		return this.col.countDocuments(query);
	}

	findAllServiceTimeByAgent({
		start,
		end,
		onlyCount = false,
		options = {},
	}: {
		start: Date;
		end: Date;
		onlyCount?: boolean;
		options?: { sort?: { [key: string]: number }; offset?: number; count?: number };
	}) {
		const match: Document = {
			$match: {
				't': 'l',
				'servedBy._id': { $exists: true },
				'metrics.serviceTimeDuration': { $exists: true },
				'ts': {
					$gte: start,
					$lte: end,
				},
			},
		};
		const group = {
			$group: {
				_id: { _id: '$servedBy._id', username: '$servedBy.username' },
				chats: { $sum: 1 },
				serviceTimeDuration: { $sum: '$metrics.serviceTimeDuration' },
			},
		};
		const project = {
			$project: {
				_id: '$_id._id',
				username: '$_id.username',
				chats: 1,
				serviceTimeDuration: { $ceil: '$serviceTimeDuration' },
			},
		};
		const sort = { $sort: options.sort || { username: 1 } };
		const params: Document[] = [match, group, project, sort];
		if (onlyCount) {
			params.push({ $count: 'total' });
			return this.col.aggregate(params);
		}
		if (options.offset) {
			params.push({ $skip: options.offset });
		}
		if (options.count) {
			params.push({ $limit: options.count });
		}
		return this.col.aggregate(params, { readPreference: readSecondaryPreferred() });
	}

	findAllAverageServiceTimeByAgents({
		start,
		end,
		onlyCount = false,
		options = {},
	}: {
		start: Date;
		end: Date;
		onlyCount?: boolean;
		options?: { sort?: { [key: string]: number }; offset?: number; count?: number };
	}) {
		const match: Document = {
			$match: {
				't': 'l',
				'servedBy._id': { $exists: true },
				'metrics.serviceTimeDuration': { $exists: true },
				'ts': {
					$gte: start,
					$lte: end,
				},
			},
		};
		const group = {
			$group: {
				_id: { _id: '$servedBy._id', username: '$servedBy.username' },
				chats: { $sum: 1 },
				serviceTimeDuration: { $sum: '$metrics.serviceTimeDuration' },
			},
		};
		const project = {
			$project: {
				_id: '$_id._id',
				username: '$_id.username',
				name: '$_id.name',
				active: '$_id.active',
				averageServiceTimeInSeconds: {
					$ceil: {
						$cond: [{ $eq: ['$chats', 0] }, 0, { $divide: ['$serviceTimeDuration', '$chats'] }],
					},
				},
			},
		};
		const sort = { $sort: options.sort || { username: 1 } };
		const params: Document[] = [match, group, project, sort];
		if (onlyCount) {
			params.push({ $count: 'total' });
			return this.col.aggregate(params);
		}
		if (options.offset) {
			params.push({ $skip: options.offset });
		}
		if (options.count) {
			params.push({ $limit: options.count });
		}
		return this.col.aggregate(params, { readPreference: readSecondaryPreferred() });
	}

	setDepartmentByRoomId(roomId: string, departmentId: string) {
		return this.updateOne({ _id: roomId }, { $set: { departmentId } });
	}

	findOpen(extraQuery = {}) {
		return this.find({ t: 'l', open: true, ...extraQuery });
	}

	setAutoTransferOngoingById(roomId: string) {
		const query = {
			_id: roomId,
		};
		const update = {
			$set: {
				autoTransferOngoing: true,
			},
		};

		return this.updateOne(query, update);
	}

	unsetAutoTransferOngoingById(roomId: string) {
		const query = {
			_id: roomId,
		};
		const update = {
			$unset: {
				autoTransferOngoing: 1,
			},
		};

		return this.updateOne(query, update);
	}

	setAutoTransferredAtById(roomId: string) {
		const query = {
			_id: roomId,
		};
		const update = {
			$set: {
				autoTransferredAt: new Date(),
			},
		};

		return this.updateOne(query, update);
	}

	findAvailableSources() {
		return this.col.aggregate([
			{
				$group: {
					_id: 0,
					types: {
						$addToSet: {
							$cond: {
								if: {
									$eq: ['$source.type', 'app'],
								},
								then: '$$REMOVE',
								else: { type: '$source.type' },
							},
						},
					},
					apps: {
						$addToSet: {
							$cond: {
								if: {
									$eq: ['$source.type', 'app'],
								},
								else: '$$REMOVE',
								then: {
									type: '$source.type',
									id: '$source.id',
									alias: '$source.alias',
									sidebarIcon: '$source.sidebarIcon',
									defaultIcon: '$source.defaultIcon',
								},
							},
						},
					},
				},
			},
			{
				$project: {
					_id: 0,
					fullTypes: { $setUnion: ['$types', '$apps'] },
				},
			},
		]);
	}

	// These 3 methods shouldn't be here :( but current EE model has a meteor dependency
	// And refactoring it could take time
	setTranscriptRequestedPdfById(rid: string) {
		return this.updateOne(
			{
				_id: rid,
			},
			{
				$set: { pdfTranscriptRequested: true },
			},
			{},
			// @ts-expect-error - extra arg not on base types
			{
				bypassUnits: true,
			},
		);
	}

	unsetTranscriptRequestedPdfById(rid: string) {
		return this.updateOne(
			{
				_id: rid,
			},
			{
				$unset: { pdfTranscriptRequested: 1 },
			},
			{},
			// @ts-expect-error - extra arg not on base types
			{
				bypassUnits: true,
			},
		);
	}

	setPdfTranscriptFileIdById(rid: string, fileId: string) {
		return this.updateOne(
			{
				_id: rid,
			},
			{
				$set: { pdfTranscriptFileId: fileId },
			},
			{},
			// @ts-expect-error - extra arg not on base types
			{
				bypassUnits: true,
			},
		);
	}

	setEmailTranscriptRequestedByRoomId(roomId: string, transcriptInfo: NonNullable<IOmnichannelRoom['transcriptRequest']>) {
		const { requestedAt, requestedBy, email, subject } = transcriptInfo;

		return this.updateOne(
			{
				_id: roomId,
				t: 'l',
			},
			{
				$set: {
					transcriptRequest: {
						requestedAt,
						requestedBy,
						email,
						subject,
					},
				},
			},
		);
	}

	unsetEmailTranscriptRequestedByRoomId(roomId: string) {
		return this.updateOne(
			{
				_id: roomId,
				t: 'l',
			},
			{
				$unset: {
					transcriptRequest: 1,
				},
			},
		);
	}

	closeRoomById(roomId: string, closeInfo: IOmnichannelRoomClosingInfo) {
		const { closer, closedBy, closedAt, chatDuration, serviceTimeDuration, tags } = closeInfo;

		return this.updateOne(
			{
				_id: roomId,
				t: 'l',
			},
			{
				$set: {
					closedAt,
					'metrics.chatDuration': chatDuration,
					'metrics.serviceTimeDuration': serviceTimeDuration,
					'v.status': 'offline',
					...(closer && { closer }),
					...(closedBy && { closedBy }),
					...(tags && { tags }),
				},
				$unset: {
					open: 1,
				},
			},
		);
	}

	bulkRemoveDepartmentAndUnitsFromRooms(departmentId: string) {
		return this.updateMany({ departmentId }, { $unset: { departmentId: 1, departmentAncestors: 1 } });
	}

	findOneByIdOrName(_idOrName: string, options: FindOptions<IOmnichannelRoom>) {
		const query: Filter<IOmnichannelRoom> = {
			t: 'l',
			$or: [
				{
					_id: _idOrName,
				},
				{
					name: _idOrName,
				},
			],
		};

		return this.findOne(query, options);
	}

	updateSurveyFeedbackById(_id: string, surveyFeedback: string) {
		const query: Filter<IOmnichannelRoom> = {
			_id,
		};

		const update = {
			$set: {
				surveyFeedback,
			},
		};

		return this.updateOne(query, update);
	}

	async updateDataByToken(token: string, key: string, value: any, overwrite = true) {
		const query: Filter<IOmnichannelRoom> = {
			'v.token': token,
			'open': true,
		};

		if (!overwrite) {
			const room = await this.findOne(query, { projection: { livechatData: 1 } });
			if (!room) {
				return false;
			}
			if (room.livechatData && typeof room.livechatData[key] !== 'undefined') {
				return true;
			}
		}

		const update = {
			$set: {
				[`livechatData.${key}`]: value,
			},
		};

		return this.updateMany(query, update);
	}

	async saveRoomById({
		_id,
		topic,
		tags,
		livechatData,
		...extra
	}: {
		_id: string;
		topic?: string;
		tags?: string[];
		livechatData?: Record<string, any>;
	} & Record<string, any>) {
		const setData: DeepWritable<UpdateFilter<IOmnichannelRoom>['$set']> = { ...extra };
		const unsetData: DeepWritable<UpdateFilter<IOmnichannelRoom>['$unset']> = {};

		if (topic != null) {
			const trimmedTopic = topic.trim();
			if (trimmedTopic.length) {
				setData.topic = trimmedTopic;
			} else {
				unsetData.topic = 1;
			}
		}

		if (Array.isArray(tags) && tags.length > 0) {
			setData.tags = tags;
		} else {
			unsetData.tags = 1;
		}

		if (extra.priorityId === '') {
			unsetData.priorityId = 1;
			delete setData.priorityId;
		}
		if (extra.slaId === '') {
			unsetData.slaId = 1;
			delete setData.slaId;
		}

		if (livechatData) {
			Object.keys(livechatData).forEach((key) => {
				const value = livechatData[key].trim();
				if (value) {
					setData[`livechatData.${key}`] = value;
				} else {
					unsetData[`livechatData.${key}`] = 1;
				}
			});
		}

		const update: UpdateFilter<IOmnichannelRoom> = {};

		if (Object.keys(setData).length > 0) {
			update.$set = setData;
		}

		if (Object.keys(unsetData).length > 0) {
			update.$unset = unsetData;
		}

		if (Object.keys(update).length === 0) {
			return;
		}

		return this.updateOne({ _id }, update);
	}

	findById(_id: string, fields: FindOptions<IOmnichannelRoom>['projection']) {
		const options: FindOptions<IOmnichannelRoom> = {};

		if (fields) {
			options.projection = fields;
		}

		const query: Filter<IOmnichannelRoom> = {
			t: 'l',
			_id,
		};

		return this.find(query, options);
	}

	findByIds(ids: string[], fields: FindOptions<IOmnichannelRoom>['projection'], extraQuery: Filter<IOmnichannelRoom> = {}) {
		const options: FindOptions<IOmnichannelRoom> = {};

		if (fields) {
			options.projection = fields;
		}

		const query: Filter<IOmnichannelRoom> = {
			t: 'l',
			_id: { $in: ids },
			...extraQuery,
		};

		return this.find(query, options);
	}

	findOneByIdAndVisitorToken(_id: string, visitorToken: string, fields: FindOptions<IOmnichannelRoom>['projection']) {
		const options: FindOptions<IOmnichannelRoom> = {};

		if (fields) {
			options.projection = fields;
		}

		const query: Filter<IOmnichannelRoom> = {
			't': 'l',
			_id,
			'v.token': visitorToken,
		};

		return this.findOne(query, options);
	}

	findOneByVisitorTokenAndEmailThread(visitorToken: string, emailThread: string[], options: FindOptions<IOmnichannelRoom>) {
		const query: Filter<IOmnichannelRoom> = {
			't': 'l',
			'v.token': visitorToken,
			'$or': [{ 'email.thread': { $elemMatch: { $in: emailThread } } }, { 'email.thread': new RegExp(emailThread.join('|')) }],
		};

		return this.findOne(query, options);
	}

	findOneByVisitorTokenAndEmailThreadAndDepartment(
		visitorToken: string,
		emailThread: string[],
		departmentId: string,
		options: FindOptions<IOmnichannelRoom>,
	) {
		const query: Filter<IOmnichannelRoom> = {
			't': 'l',
			'v.token': visitorToken,
			'$or': [
				{ 'email.thread': { $elemMatch: { $in: emailThread } } },
				{ 'email.thread': new RegExp(emailThread.map((t) => `"${t}"`).join('|')) },
			],
			...(departmentId && { departmentId }),
		};

		return this.findOne(query, options);
	}

	findOneOpenByVisitorTokenAndEmailThread(visitorToken: string, emailThread: string[], options: FindOptions<IOmnichannelRoom>) {
		const query: Filter<IOmnichannelRoom> = {
			't': 'l',
			'open': true,
			'v.token': visitorToken,
			'$or': [{ 'email.thread': { $elemMatch: { $in: emailThread } } }, { 'email.thread': new RegExp(emailThread.join('|')) }],
		};

		return this.findOne(query, options);
	}

	updateEmailThreadByRoomId(roomId: string, threadIds: string[]) {
		const query: Filter<IOmnichannelRoom> = {
			$addToSet: {
				'email.thread': threadIds,
			},
		};

		return this.updateOne({ _id: roomId }, query);
	}

	findOneLastServedAndClosedByVisitorToken(visitorToken: string, options: FindOptions<IOmnichannelRoom> = {}) {
		const query: Filter<IOmnichannelRoom> = {
			't': 'l',
			'v.token': visitorToken,
			'closedAt': { $exists: true },
			'servedBy': { $exists: true },
		};

		options.sort = { closedAt: -1 };
		return this.findOne(query, options);
	}

	findOneByVisitorToken(visitorToken: string, fields: FindOptions<IOmnichannelRoom>['projection']) {
		const options: FindOptions<IOmnichannelRoom> = {};

		if (fields) {
			options.projection = fields;
		}

		const query: Filter<IOmnichannelRoom> = {
			't': 'l',
			'v.token': visitorToken,
		};

		return this.findOne(query, options);
	}

	async updateRoomCount() {
		const query: Filter<ISetting> = {
			_id: 'Livechat_Room_Count',
		};

		const update: UpdateFilter<ISetting> = {
			$inc: {
				// @ts-expect-error - Caused by `OnlyFieldsOfType` on mongo which excludes `SettingValue` from $inc
				value: 1,
			},
		};

		const livechatCount = await Settings.findOneAndUpdate(query, update, { returnDocument: 'after' });
		return livechatCount.value;
	}

	findOpenByVisitorToken(visitorToken: string, options: FindOptions<IOmnichannelRoom> = {}, extraQuery: Filter<IOmnichannelRoom> = {}) {
		const query: Filter<IOmnichannelRoom> = {
			't': 'l',
			'open': true,
			'v.token': visitorToken,
			...extraQuery,
		};

		return this.find(query, options);
	}

	findOneOpenByVisitorToken(visitorToken: string, options: FindOptions<IOmnichannelRoom> = {}) {
		const query: Filter<IOmnichannelRoom> = {
			't': 'l',
			'open': true,
			'v.token': visitorToken,
		};

		return this.findOne(query, options);
	}

	findOneOpenByVisitorTokenAndDepartmentIdAndSource(
		visitorToken: string,
		departmentId: string,
		source?: string,
		options: FindOptions<IOmnichannelRoom> = {},
	) {
		const query: Filter<IOmnichannelRoom> = {
			't': 'l',
			'open': true,
			'v.token': visitorToken,
			departmentId,
			...(source && { 'source.type': source }),
		};

		return this.findOne(query, options);
	}

	findOpenByVisitorTokenAndDepartmentId(
		visitorToken: string,
		departmentId: string,
		options: FindOptions<IOmnichannelRoom> = {},
		extraQuery: Filter<IOmnichannelRoom> = {},
	) {
		const query: Filter<IOmnichannelRoom> = {
			't': 'l',
			'open': true,
			'v.token': visitorToken,
			departmentId,
			...extraQuery,
		};

		return this.find(query, options);
	}

	findByVisitorToken(visitorToken: string, extraQuery: Filter<IOmnichannelRoom> = {}) {
		const query: Filter<IOmnichannelRoom> = {
			't': 'l',
			'v.token': visitorToken,
			...extraQuery,
		};

		return this.find(query);
	}

	findByVisitorIdAndAgentId(
		visitorId?: string,
		agentId?: string,
		options: FindOptions<IOmnichannelRoom> = {},
		extraQuery: Filter<IOmnichannelRoom> = {},
	) {
		const query: Filter<IOmnichannelRoom> = {
			t: 'l',
			...(visitorId && { 'v._id': visitorId }),
			...(agentId && { 'servedBy._id': agentId }),
			...extraQuery,
		};

		return this.find(query, options);
	}

	findOneOpenByRoomIdAndVisitorToken(roomId: string, visitorToken: string, options: FindOptions<IOmnichannelRoom> = {}) {
		const query: Filter<IOmnichannelRoom> = {
			't': 'l',
			'_id': roomId,
			'open': true,
			'v.token': visitorToken,
		};

		return this.findOne(query, options);
	}

	findClosedRooms(departmentIds?: string[], options: FindOptions<IOmnichannelRoom> = {}, extraQuery: Filter<IOmnichannelRoom> = {}) {
		const query: Filter<IOmnichannelRoom> = {
			t: 'l',
			open: { $exists: false },
			closedAt: { $exists: true },
			...(Array.isArray(departmentIds) && departmentIds.length > 0 && { departmentId: { $in: departmentIds } }),
			...extraQuery,
		};

		return this.find(query, options);
	}

	setResponseByRoomId(roomId: string, response: { user: { _id: string; username: string } }) {
		return this.updateOne(
			{
				_id: roomId,
				t: 'l',
			},
			{
				$set: {
					responseBy: {
						_id: response.user._id,
						username: response.user.username,
						lastMessageTs: new Date(),
					},
				},
				$unset: {
					waitingResponse: 1,
				},
			},
		);
	}

	setNotResponseByRoomId(roomId: string) {
		return this.updateOne(
			{
				_id: roomId,
				t: 'l',
			},
			{
				$set: {
					waitingResponse: true,
				},
				$unset: {
					responseBy: 1,
				},
			},
		);
	}

	setAgentLastMessageTs(roomId: string) {
		return this.updateOne(
			{
				_id: roomId,
				t: 'l',
			},
			{
				$set: {
					'responseBy.lastMessageTs': new Date(),
				},
			},
		);
	}

	saveAnalyticsDataByRoomId(room: IOmnichannelRoom, message: IMessage, analyticsData: Record<string, string | number | Date>) {
		const update: DeepWritable<UpdateFilter<IOmnichannelRoom>> = {
			$set: {
				...(analyticsData && {
					'metrics.response.avg': analyticsData.avgResponseTime,
				}),
				...(analyticsData?.firstResponseTime && {
					'metrics.reaction.fd': analyticsData.firstReactionDate,
					'metrics.reaction.ft': analyticsData.firstReactionTime,
					'metrics.response.fd': analyticsData.firstResponseDate,
					'metrics.response.ft': analyticsData.firstResponseTime,
				}),
			},
			$inc: {
				...(analyticsData && {
					'metrics.response.total': 1,
					'metrics.response.tt': analyticsData.responseTime as number,
					'metrics.reaction.tt': analyticsData.reactionTime as number,
				}),
			},
		};

		// livechat analytics : update last message timestamps
		const visitorLastQuery = room.metrics?.v ? room.metrics.v.lq : room.ts;
		const agentLastReply = room.metrics?.servedBy ? room.metrics.servedBy.lr : room.ts;

		if (message.token) {
			// update visitor timestamp, only if its new inquiry and not continuing message
			if (agentLastReply >= visitorLastQuery) {
				// if first query, not continuing query from visitor
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				update.$set!['metrics.v.lq'] = message.ts;
			}
		} else if (visitorLastQuery > agentLastReply) {
			// update agent timestamp, if first response, not continuing
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			update.$set!['metrics.servedBy.lr'] = message.ts;
		}

		return this.updateOne(
			{
				_id: room._id,
				t: 'l',
			},
			update,
		);
	}

	getTotalConversationsBetweenDate(t: 'l', date: { gte: Date; lt: Date }, { departmentId }: { departmentId?: string } = {}) {
		const query: Filter<IOmnichannelRoom> = {
			t,
			ts: {
				$gte: new Date(date.gte), // ISO Date, ts >= date.gte
				$lt: new Date(date.lt), // ISODate, ts < date.lt
			},
			...(departmentId && departmentId !== 'undefined' && { departmentId }),
		};

		return this.col.countDocuments(query);
	}

	getAnalyticsMetricsBetweenDate(
		t: 'l',
		date: { gte: Date; lt: Date },
		{ departmentId }: { departmentId?: string } = {},
		extraQuery: Document = {},
	) {
		const query: Filter<IOmnichannelRoom> = {
			t,
			ts: {
				$gte: new Date(date.gte), // ISO Date, ts >= date.gte
				$lt: new Date(date.lt), // ISODate, ts < date.lt
			},
			...(departmentId && departmentId !== 'undefined' && { departmentId }),
			...extraQuery,
		};

		return this.find(query, {
			projection: { ts: 1, departmentId: 1, open: 1, servedBy: 1, metrics: 1, msgs: 1 },
		});
	}

	getAnalyticsMetricsBetweenDateWithMessages(
		t: string,
		date: { gte: Date; lt: Date },
		{ departmentId }: { departmentId?: string } = {},
		extraQuery: Document = {},
		extraMatchers: Document = {},
	) {
		return this.col.aggregate<Pick<IOmnichannelRoom, '_id' | 'ts' | 'departmentId' | 'open' | 'servedBy' | 'metrics' | 'msgs'>>(
			[
				{
					$match: {
						t,
						ts: {
							$gte: new Date(date.gte), // ISO Date, ts >= date.gte
							$lt: new Date(date.lt), // ISODate, ts < date.lt
						},
						...(departmentId && departmentId !== 'undefined' && { departmentId }),
						...extraMatchers,
					},
				},
				{ $addFields: { roomId: '$_id' } },
				{
					$lookup: {
						from: 'rocketchat_message',
						// mongo doesn't like _id as variable name here :(
						let: { roomId: '$roomId' },
						pipeline: [
							{
								$match: {
									$expr: {
										$and: [
											{
												$eq: ['$$roomId', '$rid'],
											},
											{
												// this is similar to do { $exists: false }
												$lte: ['$t', null],
											},
											...(extraQuery ? [extraQuery] : []),
										],
									},
								},
							},
						],
						as: 'messages',
					},
				},
				{
					$unwind: {
						path: '$messages',
						preserveNullAndEmptyArrays: true,
					},
				},
				{
					$group: {
						_id: {
							_id: '$_id',
							ts: '$ts',
							departmentId: '$departmentId',
							open: '$open',
							servedBy: '$servedBy',
							metrics: '$metrics',
						},
						messagesCount: {
							$sum: 1,
						},
					},
				},
				{
					$project: {
						_id: '$_id._id',
						ts: '$_id.ts',
						departmentId: '$_id.departmentId',
						open: '$_id.open',
						servedBy: '$_id.servedBy',
						metrics: '$_id.metrics',
						msgs: '$messagesCount',
					},
				},
			],
			{ readPreference: readSecondaryPreferred() },
		);
	}

	getAnalyticsBetweenDate(date: { gte: Date; lt: Date }, { departmentId }: { departmentId?: string } = {}) {
		return this.col.aggregate<Pick<IOmnichannelRoom, 'ts' | 'departmentId' | 'open' | 'servedBy' | 'metrics' | 'msgs' | 'onHold'>>(
			[
				{
					$match: {
						t: 'l',
						ts: {
							$gte: new Date(date.gte), // ISO Date, ts >= date.gte
							$lt: new Date(date.lt), // ISODate, ts < date.lt
						},
						...(departmentId && departmentId !== 'undefined' && { departmentId }),
					},
				},
				{ $addFields: { roomId: '$_id' } },
				{
					$lookup: {
						from: 'rocketchat_message',
						// mongo doesn't like _id as variable name here :(
						let: { roomId: '$roomId' },
						pipeline: [
							{
								$match: {
									$expr: {
										$and: [
											{
												$eq: ['$$roomId', '$rid'],
											},
											{
												// this is similar to do { $exists: false }
												$lte: ['$t', null],
											},
										],
									},
								},
							},
						],
						as: 'messages',
					},
				},
				{
					$unwind: {
						path: '$messages',
						preserveNullAndEmptyArrays: true,
					},
				},
				{
					$group: {
						_id: {
							_id: '$_id',
							ts: '$ts',
							departmentId: '$departmentId',
							open: '$open',
							servedBy: '$servedBy',
							metrics: '$metrics',
							onHold: '$onHold',
						},
						messagesCount: {
							$sum: 1,
						},
					},
				},
				{
					$project: {
						_id: '$_id._id',
						ts: '$_id.ts',
						departmentId: '$_id.departmentId',
						open: '$_id.open',
						servedBy: '$_id.servedBy',
						metrics: '$_id.metrics',
						msgs: '$messagesCount',
						onHold: '$_id.onHold',
					},
				},
			],
			{ readPreference: readSecondaryPreferred() },
		);
	}

	findOpenByAgent(userId: string, extraQuery: Filter<IOmnichannelRoom> = {}) {
		const query: Filter<IOmnichannelRoom> = {
			't': 'l',
			'open': true,
			'servedBy._id': userId,
			...extraQuery,
		};

		return this.find(query);
	}

	changeAgentByRoomId(roomId: string, newAgent: { agentId: string; username: string; ts?: Date }) {
		const query: Filter<IOmnichannelRoom> = {
			_id: roomId,
			t: 'l',
		};
		const update = {
			$set: {
				servedBy: {
					_id: newAgent.agentId,
					username: newAgent.username,
					ts: new Date(),
				},
			},
		};

		if (newAgent.ts) {
			update.$set.servedBy.ts = newAgent.ts;
		}

		return this.updateOne(query, update);
	}

	changeDepartmentIdByRoomId(roomId: string, departmentId: string) {
		const query: Filter<IOmnichannelRoom> = {
			_id: roomId,
			t: 'l',
		};
		const update = {
			$set: {
				departmentId,
			},
		};

		return this.updateOne(query, update);
	}

	saveCRMDataByRoomId(roomId: string, crmData: unknown) {
		const query: Filter<IOmnichannelRoom> = {
			_id: roomId,
			t: 'l',
		};
		const update = {
			$set: {
				crmData,
			},
		};

		return this.updateOne(query, update);
	}

	updateVisitorStatus(token: string, status: 'online' | 'busy' | 'away' | 'offline') {
		const query: Filter<IOmnichannelRoom> = {
			'v.token': token,
			'open': true,
			't': 'l',
		};

		const update: UpdateFilter<IOmnichannelRoom> = {
			$set: {
				'v.status': status,
			},
		};

		return this.updateMany(query, update);
	}

	removeAgentByRoomId(roomId: string) {
		const query: Filter<IOmnichannelRoom> = {
			_id: roomId,
			t: 'l',
		};
		const update = {
			$set: { queuedAt: new Date() },
			$unset: { servedBy: 1 },
		};

		return this.updateOne(query, update);
	}

	removeByVisitorToken(token: string) {
		const query: Filter<IOmnichannelRoom> = {
			't': 'l',
			'v.token': token,
		};

		return this.deleteMany(query);
	}

	removeById(_id: string) {
		const query: Filter<IOmnichannelRoom> = {
			_id,
			t: 'l',
		};

		return this.deleteOne(query);
	}

	setVisitorLastMessageTimestampByRoomId(roomId: string, lastMessageTs: Date) {
		const query = {
			_id: roomId,
		};
		const update = {
			$set: {
				'v.lastMessageTs': lastMessageTs,
			},
		};

		return this.updateOne(query, update);
	}

	setVisitorInactivityInSecondsById(roomId: string, visitorInactivity: number) {
		const query = {
			_id: roomId,
		};
		const update = {
			$set: {
				'metrics.visitorInactivity': visitorInactivity,
			},
		};

		return this.updateOne(query, update);
	}

	changeVisitorByRoomId(roomId: string, { _id, username, token }: { _id: string; username: string; token: string }) {
		const query: Filter<IOmnichannelRoom> = {
			_id: roomId,
			t: 'l',
		};
		const update = {
			$set: {
				'v._id': _id,
				'v.username': username,
				'v.token': token,
			},
		};

		return this.updateOne(query, update);
	}

	unarchiveOneById(roomId: string) {
		const query: Filter<IOmnichannelRoom> = {
			_id: roomId,
			t: 'l',
		};
		const update = {
			$set: {
				open: true,
			},
			$unset: {
				servedBy: 1,
				closedAt: 1,
				closedBy: 1,
				closer: 1,
			},
		};

		return this.updateOne(query, update);
	}

	async unsetAllPredictedVisitorAbandonment(): Promise<void> {
		throw new Error('Method not implemented.');
	}

	setOnHoldByRoomId(_roomId: string): Promise<UpdateResult> {
		throw new Error('Method not implemented.');
	}

	unsetOnHoldByRoomId(_roomId: string): Promise<UpdateResult> {
		throw new Error('Method not implemented.');
	}

	unsetOnHoldAndPredictedVisitorAbandonmentByRoomId(_roomId: string): Promise<UpdateResult> {
		throw new Error('Method not implemented.');
	}

	setSlaForRoomById(
		_roomId: string,
		_sla: Pick<IOmnichannelServiceLevelAgreements, '_id' | 'dueTimeInMinutes'>,
	): Promise<UpdateResult | Document> {
		throw new Error('Method not implemented.');
	}

	removeSlaFromRoomById(_roomId: string): Promise<UpdateResult | Document> {
		throw new Error('Method not implemented.');
	}

	bulkRemoveSlaFromRoomsById(_slaId: string): Promise<UpdateResult | Document> {
		throw new Error('Method not implemented.');
	}

	findOpenBySlaId(_slaId: string, _options: FindOptions<IOmnichannelRoom>): FindCursor<IOmnichannelRoom> {
		throw new Error('Method not implemented.');
	}

	async setPriorityByRoomId(_roomId: string, _priority: Pick<ILivechatPriority, '_id' | 'sortItem'>): Promise<UpdateResult> {
		throw new Error('Method not implemented.');
	}

	async unsetPriorityByRoomId(_roomId: string): Promise<UpdateResult> {
		throw new Error('Method not implemented.');
	}

	findOpenRoomsByPriorityId(_priorityId: string): FindCursor<IOmnichannelRoom> {
		throw new Error('Method not implemented.');
	}

	setPredictedVisitorAbandonmentByRoomId(_rid: string, _willBeAbandonedAt: Date): Promise<UpdateResult> {
		throw new Error('Method not implemented.');
	}

	findAbandonedOpenRooms(_date: Date): FindCursor<IOmnichannelRoom> {
		throw new Error('Method not implemented.');
	}

	async unsetPredictedVisitorAbandonmentByRoomId(_roomId: string): Promise<UpdateResult> {
		throw new Error('Method not implemented.');
	}

	async associateRoomsWithDepartmentToUnit(_departments: string[], _unitId: string): Promise<void> {
		throw new Error('Method not implemented.');
	}

	async removeUnitAssociationFromRooms(_unitId: string): Promise<void> {
		throw new Error('Method not implemented.');
	}

	async updateDepartmentAncestorsById(_rid: string, _departmentAncestors?: string[]): Promise<UpdateResult> {
		throw new Error('Method not implemented.');
	}
}
