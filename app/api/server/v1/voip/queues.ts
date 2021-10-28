import { Match, check } from 'meteor/check';

import { API } from '../../api';
import { Voip } from '../../../../../server/sdk';
import { IVoipConnectorResult } from '../../../../../definition/IVoipConnectorResult';

API.v1.addRoute('voip/queues.getSummary', { authRequired: true }, {
	get() {
		const queueSummary = Promise.await(Voip.getQueueSummary()) as IVoipConnectorResult;
		this.logger.debug({ msg: 'API = voip/queues.getSummary ', result: queueSummary });
		return API.v1.success({ summary: queueSummary.result });
	},
});

API.v1.addRoute('voip/queues.getQueuedCallsForThisExtension', { authRequired: true }, {
	get() {
		check(this.requestParams(), Match.ObjectIncluding({
			extension: String,
		}));
		const membershipDetails: IVoipConnectorResult = Promise.await(Voip.getQueuedCallsForThisExtension(this.requestParams()));
		this.logger.debug({ msg: 'API = queues.getCallWaitingInQueuesForThisExtension', result: membershipDetails });
		return API.v1.success({ ...membershipDetails.result });
	},
});
