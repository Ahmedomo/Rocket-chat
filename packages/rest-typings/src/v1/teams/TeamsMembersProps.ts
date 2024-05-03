import { UserStatus } from '@rocket.chat/core-typings';

import { ajv } from '../Ajv';

export type TeamsMembersProps = ({ teamId: string } | { teamName: string }) & {
	status?: UserStatus[];
	username?: string;
	name?: string;
	count?: number;
	offset?: number;
};

const teamsMembersPropsSchema = {
	type: 'object',
	properties: {
		teamId: { type: 'string' },
		teamName: { type: 'string' },
		username: { type: 'string' },
		status: { type: 'array', items: { type: 'string', enum: Object.values(UserStatus) } },
		name: { type: 'string' },
		count: { type: 'number' },
		offset: { type: 'number' },
	},
	oneOf: [{ required: ['teamId'] }, { required: ['teamName'] }],
	additionalProperties: false,
};

export const isTeamsMembersProps = ajv.compile<TeamsMembersProps>(teamsMembersPropsSchema);
