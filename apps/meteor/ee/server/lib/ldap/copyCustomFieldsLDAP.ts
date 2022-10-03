import type { IImportUser, ILDAPEntry } from '@rocket.chat/core-typings';

import type { Logger } from '../../../../app/logger/server';
import { templateVarHandler } from '../../../../app/utils/lib/templateVarHandler';
import { getNestedProp } from './getNestedProp';
import { replacesNestedValues } from './replacesNestedValues';

export const copyCustomFieldsLDAP = (
	{
		ldapUser,
		userData,
		customFieldsSettings,
		customFieldsMap,
		syncCustomFields,
	}: {
		ldapUser: ILDAPEntry;
		userData: IImportUser;
		syncCustomFields: boolean;
		customFieldsSettings: string;
		customFieldsMap: string;
	},
	logger: Logger,
): void => {
	if (!syncCustomFields) {
		return;
	}

	if (!customFieldsMap || !customFieldsSettings) {
		if (customFieldsMap) {
			logger.debug('Skipping LDAP custom fields because there are no custom fields configured.');
		}
		return;
	}

	const map: Record<string, string> = (() => {
		try {
			return JSON.parse(customFieldsMap);
		} catch (e) {
			logger.error('Error parsing LDAP custom fields map.');
			logger.error(e);
		}
	})();

	if (!map) {
		return;
	}

	let customFields: Record<string, any>;
	try {
		customFields = JSON.parse(customFieldsSettings) as Record<string, any>;
	} catch (error) {
		logger.error('Failed to parse Custom Fields');
		logger.error(error);
		return;
	}

	Object.entries(map).forEach(([userField, ldapField]) => {
		if (!getNestedProp(customFields, userField)) {
			logger.debug(`User attribute does not exist: ${userField}`);
			return;
		}

		const value = templateVarHandler(ldapField, ldapUser);

		if (!value) {
			return;
		}

		userData.customFields = replacesNestedValues({ ...userData.customFields }, userField, value);
	});
};
