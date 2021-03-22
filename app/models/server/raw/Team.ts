import { Collection, FindOneOptions, Cursor, UpdateWriteOpResult, DeleteWriteOpResultObject } from 'mongodb';

import { BaseRaw } from './BaseRaw';
import { ITeam } from '../../../../definition/ITeam';

type T = ITeam;
export class TeamRaw extends BaseRaw<T> {
	constructor(
		public readonly col: Collection<T>,
		public readonly trash?: Collection<T>,
	) {
		super(col, trash);

		this.col.createIndex({ name: 1 }, { unique: true });

		// this.col.createIndexes([
		// 	{ key: { status: 1, expireAt: 1 } },
		// ]);
	}

	findByIds(ids: Array<string>, options?: FindOneOptions<T>): Cursor<T> {
		return this.col.find({ _id: { $in: ids } }, options);
	}

	findByIdsAndType(ids: Array<string>, type: number, options?: FindOneOptions<T>): Cursor<T> {
		return this.col.find({ _id: { $in: ids }, type }, options);
	}

	findByNameAndTeamIds(name: string | RegExp, teamIds: Array<string>, options?: FindOneOptions<T>): Cursor<T> {
		return this.col.find({
			name,
			$or: [{
				type: 0,
			}, {
				_id: {
					$in: teamIds,
				},
			}],
		}, options);
	}

	findOneByName(name: string, options?: FindOneOptions<T>): Promise<T | null> {
		return this.col.findOne({ name }, options);
	}

	findOneByMainRoomId(roomId: string, options?: FindOneOptions<T>): Promise<T | null> {
		return this.col.findOne({ roomId }, options);
	}

	updateMainRoomForTeam(id: string, roomId: string): Promise<UpdateWriteOpResult> {
		return this.col.updateOne({
			_id: id,
		}, {
			$set: {
				roomId,
			},
		});
	}

	deleteOneById(id: string): Promise<DeleteWriteOpResultObject> {
		return this.col.deleteOne({
			_id: id,
		});
	}

	deleteOneByName(name: string): Promise<DeleteWriteOpResultObject> {
		return this.col.deleteOne({ name });
	}
}
