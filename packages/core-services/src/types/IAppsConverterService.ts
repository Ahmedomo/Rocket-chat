import type { IVisitor } from '@rocket.chat/apps-engine/definition/livechat';
import type { IMessage } from '@rocket.chat/apps-engine/definition/messages';
import type { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import type { IUser } from '@rocket.chat/apps-engine/definition/users';

export interface IAppsConverterService {
	convertRoomById(id: string): Promise<IRoom>;
	convertMessageById(id: string): Promise<IMessage>;
	convertVistitorByToken(id: string): Promise<IVisitor>;
	convertUserToApp(user: any): Promise<IUser>;
	convertUserById(id: string): Promise<IUser>;
}
