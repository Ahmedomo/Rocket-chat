import type { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { RoomType } from '@rocket.chat/apps-engine/definition/rooms';
import type { ISubscription, IUser as ICoreUser, RoomType as CoreRoomType } from '@rocket.chat/core-typings';
import { RoomBridge } from '@rocket.chat/apps-engine/server/bridges/RoomBridge';
import type { IUser } from '@rocket.chat/apps-engine/definition/users';
import type { IMessage } from '@rocket.chat/apps-engine/definition/messages';
import { Users, Subscriptions, Rooms } from '@rocket.chat/models';
import { Room } from '@rocket.chat/core-services';

import type { AppServerOrchestrator } from '../../../../ee/server/apps/orchestrator';

export class AppRoomBridge extends RoomBridge {
	// eslint-disable-next-line no-empty-function
	constructor(private readonly orch: AppServerOrchestrator) {
		super();
	}

	protected async create(room: IRoom, members: Array<string>, appId: string): Promise<string> {
		this.orch.debugLog(`The App ${appId} is creating a new room.`, room);

		const rcRoom = await this.orch.getConverters()?.get('rooms').convertAppRoom(room);
		let roomType: CoreRoomType;

		switch (room.type) {
			case RoomType.CHANNEL:
				roomType = 'c';
				break;
			case RoomType.PRIVATE_GROUP:
				roomType = 'p';
				break;
			case RoomType.DIRECT_MESSAGE:
				roomType = 'd';
				break;
			default:
				throw new Error('Only channels, private groups and direct messages can be created.');
		}

		const extraData = Object.assign({}, rcRoom);
		delete extraData.name;
		delete extraData.t;
		delete extraData.ro;
		delete extraData.customFields;

		const { _id } = await Room.create(room.creator.id, { name: rcRoom.name, type: roomType, readOnly: rcRoom.ro, extraData, members });

		return _id;
	}

	protected async getById(roomId: string, appId: string): Promise<IRoom> {
		this.orch.debugLog(`The App ${appId} is getting the roomById: "${roomId}"`);

		return this.orch.getConverters()?.get('rooms').convertById(roomId);
	}

	protected async getByName(roomName: string, appId: string): Promise<IRoom> {
		this.orch.debugLog(`The App ${appId} is getting the roomByName: "${roomName}"`);

		return this.orch.getConverters()?.get('rooms').convertByName(roomName);
	}

	protected async getCreatorById(roomId: string, appId: string): Promise<IUser | undefined> {
		this.orch.debugLog(`The App ${appId} is getting the room's creator by id: "${roomId}"`);

		const room = await Rooms.findOneById(roomId);

		if (!room || !room.u || !room.u._id) {
			return undefined;
		}

		return this.orch.getConverters()?.get('users').convertById(room.u._id);
	}

	protected async getCreatorByName(roomName: string, appId: string): Promise<IUser | undefined> {
		this.orch.debugLog(`The App ${appId} is getting the room's creator by name: "${roomName}"`);

		const room = await Rooms.findOneByName(roomName, {});

		if (!room || !room.u || !room.u._id) {
			return undefined;
		}

		return this.orch.getConverters()?.get('users').convertById(room.u._id);
	}

	protected async getMembers(roomId: string, appId: string): Promise<Array<IUser>> {
		this.orch.debugLog(`The App ${appId} is getting the room's members by room id: "${roomId}"`);
		const subscriptions = await Subscriptions.findByRoomId(roomId, {}).toArray();
		const promisedMembers = subscriptions.map(async (sub: ISubscription) =>
			this.orch.getConverters()?.get('users').convertById(sub.u?._id),
		);
		return Promise.all(promisedMembers);
	}

	protected async getDirectByUsernames(usernames: Array<string>, appId: string): Promise<IRoom | undefined> {
		this.orch.debugLog(`The App ${appId} is getting direct room by usernames: "${usernames}"`);
		const room = await Rooms.findDirectRoomContainingAllUsernames(usernames, {});
		if (!room) {
			return undefined;
		}
		return this.orch.getConverters()?.get('rooms').convertRoom(room);
	}

	protected async update(room: IRoom, members: Array<string> = [], appId: string): Promise<void> {
		this.orch.debugLog(`The App ${appId} is updating a room.`);

		if (!room.id || !(await Rooms.findOneById(room.id))) {
			throw new Error('A room must exist to update.');
		}

		const rm = await this.orch.getConverters()?.get('rooms').convertAppRoom(room);

		// @ts-ignore Circular reference on field 'value'
		await Rooms.updateOne(rm._id, rm);

		const promisedAddedUsers = members.map(async (username: string) => {
			const member = await Users.findOneByUsername(username, {});

			if (member) {
				return Room.addUserToRoom(rm._id, member);
			}
		});

		await Promise.all(promisedAddedUsers);
	}

	protected async delete(roomId: string, appId: string): Promise<void> {
		this.orch.debugLog(`The App ${appId} is deleting a room.`);
		await Rooms.removeById(roomId);
	}

	protected async createDiscussion(
		room: IRoom,
		parentMessage: IMessage | undefined = undefined,
		reply: string | undefined = '',
		members: Array<string> = [],
		appId: string,
	): Promise<string> {
		this.orch.debugLog(`The App ${appId} is creating a new discussion.`, room);

		const rcRoom = await this.orch.getConverters()?.get('rooms').convertAppRoom(room);

		let rcMessage;
		if (parentMessage) {
			rcMessage = await this.orch.getConverters()?.get('messages').convertAppMessage(parentMessage);
		}

		if (!rcRoom.prid || !(await Rooms.findOneById(rcRoom.prid))) {
			throw new Error('There must be a parent room to create a discussion.');
		}

		const discussion = {
			parentRoomId: rcRoom.prid,
			parentMessageId: rcMessage ? rcMessage._id : undefined,
			creatorId: room.creator.id,
			name: rcRoom.fname,
			members: members.length > 0 ? members : [],
			reply: reply && reply.trim() !== '' ? reply : undefined,
		};

		const { _id } = await Room.createDiscussion(discussion);

		return _id;
	}

	protected getModerators(roomId: string, appId: string): Promise<IUser[]> {
		this.orch.debugLog(`The App ${appId} is getting room moderators for room id: ${roomId}`);
		return this.getUsersByRoomIdAndSubscriptionRole(roomId, 'moderator');
	}

	protected getOwners(roomId: string, appId: string): Promise<IUser[]> {
		this.orch.debugLog(`The App ${appId} is getting room owners for room id: ${roomId}`);
		return this.getUsersByRoomIdAndSubscriptionRole(roomId, 'owner');
	}

	protected getLeaders(roomId: string, appId: string): Promise<IUser[]> {
		this.orch.debugLog(`The App ${appId} is getting room leaders for room id: ${roomId}`);
		return this.getUsersByRoomIdAndSubscriptionRole(roomId, 'leader');
	}

	private async getUsersByRoomIdAndSubscriptionRole(roomId: string, role: string): Promise<IUser[]> {
		const subs = await Subscriptions.findByRoomIdAndRoles(roomId, [role], { projection: { uid: '$u._id', _id: 0 } });
		const subsUids = subs.map((user: { uid: string }) => user.uid);
		const users = await Users.findByIds(subsUids).toArray();
		const userConverter = this.orch.getConverters()?.get('users');
		const promisedUsers = users.map(async (user: ICoreUser) => userConverter.convertToApp(user));
		return Promise.all(promisedUsers);
	}
}
