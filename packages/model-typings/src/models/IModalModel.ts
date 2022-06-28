import type { Cursor, FindOneOptions, UpdateWriteOpResult } from 'mongodb';
import type { IModal, IUser } from '@rocket.chat/core-typings';
import type { IBaseModel } from './IBaseModel';

export interface IModalModel extends IBaseModel<IModal> {
	findOneByIdAndUserId(_id: IModal['_id'], userId: IUser['_id'], options: FindOneOptions<IModal>): Promise<IModal | null>;

	findWithUserId(userId: IUser['_id'], options: FindOneOptions<IModal>): Cursor<IModal>;

	findByCreatedBy(createdBy: IUser['_id'], options: FindOneOptions<IModal>): Cursor<IModal>;

	deleteModal(_id: IModal['_id']): Promise<Pick<UpdateWriteOpResult, 'modifiedCount' | 'matchedCount'>>;
}
