import type { IRoom, IUser, IUserEmail } from '@rocket.chat/core-typings';
import Ajv from 'ajv';

import type { PaginatedRequest } from '../helpers/PaginatedRequest';
import type { PaginatedResult } from '../helpers/PaginatedResult';

const ajv = new Ajv({
	coerceTypes: true,
});

type DirectoryProps = PaginatedRequest;

const DirectorySchema = {
	type: 'object',
	properties: {
		query: {
			type: 'string',
			nullable: true,
		},
		count: {
			type: 'number',
			nullable: true,
		},
		offset: {
			type: 'number',
			nullable: true,
		},
		sort: {
			type: 'string',
			nullable: true,
		},
	},
	additionalProperties: false,
};

export const isDirectoryProps = ajv.compile<DirectoryProps>(DirectorySchema);

export type DirectoryEndpoint = {
	'/v1/directory': {
		GET: (params: DirectoryProps) => PaginatedResult<{
			total: number;
			result:
				| (IRoom & { belongsTo: string })[]
				| (IRoom & { roomsCount?: number })[]
				| (
						| IUser
						| {
								_id?: string;
								username?: string;
								name?: string;
								bio?: string;
								nickname?: string;
								emails?: IUserEmail[];
								federation?: unknown;
								isRemote: true;
						  }
				  )[];
		}>;
	};
};
