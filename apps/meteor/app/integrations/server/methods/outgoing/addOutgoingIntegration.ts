import type { INewOutgoingIntegration, IOutgoingIntegration } from '@rocket.chat/core-typings';
import { Integrations } from '@rocket.chat/models';
import type { ServerMethods } from '@rocket.chat/ui-contexts';
import { Match, check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';

import { hasPermissionAsync } from '../../../../authorization/server/functions/hasPermission';
import { broadcastOnIntegrationChanges } from '../../../../lib/server/lib/notifyListener';
import { validateOutgoingIntegration } from '../../lib/validateOutgoingIntegration';
import { validateScriptEngine } from '../../lib/validateScriptEngine';

declare module '@rocket.chat/ui-contexts' {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	interface ServerMethods {
		addOutgoingIntegration(integration: INewOutgoingIntegration): Promise<IOutgoingIntegration>;
	}
}

export const addOutgoingIntegration = async (userId: string, integration: INewOutgoingIntegration): Promise<IOutgoingIntegration> => {
	check(
		integration,
		Match.ObjectIncluding({
			type: String,
			name: String,
			enabled: Boolean,
			username: String,
			channel: String,
			alias: Match.Maybe(String),
			emoji: Match.Maybe(String),
			scriptEnabled: Boolean,
			script: Match.Maybe(String),
			scriptEngine: Match.Maybe(String),
			urls: Match.Maybe([String]),
			event: Match.Maybe(String),
			triggerWords: Match.Maybe([String]),
			avatar: Match.Maybe(String),
			token: Match.Maybe(String),
			impersonateUser: Match.Maybe(Boolean),
			retryCount: Match.Maybe(Number),
			retryDelay: Match.Maybe(String),
			retryFailedCalls: Match.Maybe(Boolean),
			runOnEdits: Match.Maybe(Boolean),
			targetRoom: Match.Maybe(String),
			triggerWordAnywhere: Match.Maybe(Boolean),
		}),
	);

	if (
		!userId ||
		(!(await hasPermissionAsync(userId, 'manage-outgoing-integrations')) &&
			!(await hasPermissionAsync(userId, 'manage-own-outgoing-integrations')))
	) {
		throw new Meteor.Error('not_authorized');
	}

	if (integration.script?.trim()) {
		validateScriptEngine(integration.scriptEngine ?? 'isolated-vm');
	}

	const integrationData = await validateOutgoingIntegration(integration, userId);

	const result = await Integrations.insertOne(integrationData);

	if (result.insertedId) {
		void broadcastOnIntegrationChanges(result.insertedId, 'inserted');
	}

	integrationData._id = result.insertedId;

	return integrationData;
};

Meteor.methods<ServerMethods>({
	async addOutgoingIntegration(integration: INewOutgoingIntegration): Promise<IOutgoingIntegration> {
		const { userId } = this;
		if (!userId) {
			throw new Meteor.Error('Invalid User');
		}

		return addOutgoingIntegration(userId, integration);
	},
});
