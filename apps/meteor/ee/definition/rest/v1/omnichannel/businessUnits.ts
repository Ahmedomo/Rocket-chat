import type { ILivechatMonitor } from '@rocket.chat/core-typings';
import type { IOmnichannelBusinessUnit } from '@rocket.chat/core-typings';
import { PaginatedResult } from '../../../../../definition/rest/helpers/PaginatedResult';

export type OmnichannelBusinessUnitsEndpoints = {
	'livechat/units.list': {
		GET: (params: { text: string }) => PaginatedResult & {
			units: IOmnichannelBusinessUnit[];
		};
	};
	'livechat/units.getOne': {
		GET: (params: { unitId: string }) => IOmnichannelBusinessUnit;
	};
	'livechat/unitMonitors.list': {
		GET: (params: { unitId: string }) => { monitors: ILivechatMonitor[] };
	};
	'livechat/units': {
		GET: (params: { text: string }) => PaginatedResult & { units: IOmnichannelBusinessUnit[] };
		POST: (params: { unitData: string; unitMonitors: string; unitDepartments: string }) => IOmnichannelBusinessUnit;
	};
	'livechat/units/:id': {
		GET: () => IOmnichannelBusinessUnit;
		POST: (params: { unitData: string; unitMonitors: string; unitDepartments: string }) => IOmnichannelBusinessUnit;
		DELETE: () => number;
	};
};
