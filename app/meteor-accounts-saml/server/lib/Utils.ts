import zlib from 'zlib';

import _ from 'underscore';
// import { TAPi18n } from 'meteor/rocketchat:tap-i18n';

import { IServiceProviderOptions } from '../definition/IServiceProviderOptions';
import { ISAMLUser } from '../definition/ISAMLUser';
import { ISAMLGlobalSettings } from '../definition/ISAMLGlobalSettings';
import { IUserDataMap, IAttributeMapping } from '../definition/IAttributeMapping';


// @ts-ignore skip checking if Logger exists to avoid having to import the Logger class here (it would bring a lot of baggace with it's dependencies, affecting the unit tests)
type NullableLogger = Logger | Null;


let providerList: Array<IServiceProviderOptions> = [];
let debug = false;
let relayState: string | null = null;
let logger: NullableLogger = null;

const globalSettings: ISAMLGlobalSettings = {
	generateUsername: false,
	nameOverwrite: false,
	mailOverwrite: false,
	immutableProperty: 'EMail',
	defaultUserRole: 'user',
	roleAttributeName: '',
	roleAttributeSync: false,
	userDataFieldMap: '{"username":"username", "email":"email", "cn": "name"}',
	usernameNormalize: 'None',
};

export class SAMLUtils {
	static get isDebugging(): boolean {
		return debug;
	}

	static get globalSettings(): ISAMLGlobalSettings {
		return globalSettings;
	}

	static get serviceProviders(): Array<IServiceProviderOptions> {
		return providerList;
	}

	static get relayState(): string | null {
		return relayState;
	}

	static set relayState(value: string | null) {
		relayState = value;
	}

	static getServiceProviderOptions(providerName: string): IServiceProviderOptions | undefined {
		this.log(providerName);
		this.log(providerList);

		return _.find(providerList, (providerOptions) => providerOptions.provider === providerName);
	}

	static setServiceProvidersList(list: Array<IServiceProviderOptions>): void {
		providerList = list;
	}

	static setLoggerInstance(instance: NullableLogger): void {
		logger = instance;
	}

	// TODO: Some of those should probably not be global
	static updateGlobalSettings(samlConfigs: Record<string, any>): void {
		debug = Boolean(samlConfigs.debug);

		globalSettings.generateUsername = Boolean(samlConfigs.generateUsername);
		globalSettings.nameOverwrite = Boolean(samlConfigs.nameOverwrite);
		globalSettings.mailOverwrite = Boolean(samlConfigs.mailOverwrite);
		globalSettings.roleAttributeSync = Boolean(samlConfigs.roleAttributeSync);

		if (samlConfigs.immutableProperty && typeof samlConfigs.immutableProperty === 'string') {
			globalSettings.immutableProperty = samlConfigs.immutableProperty;
		}

		if (samlConfigs.usernameNormalize && typeof samlConfigs.usernameNormalize === 'string') {
			globalSettings.usernameNormalize = samlConfigs.usernameNormalize;
		}

		if (samlConfigs.defaultUserRole && typeof samlConfigs.defaultUserRole === 'string') {
			globalSettings.defaultUserRole = samlConfigs.defaultUserRole;
		}

		if (samlConfigs.roleAttributeName && typeof samlConfigs.roleAttributeName === 'string') {
			globalSettings.roleAttributeName = samlConfigs.roleAttributeName;
		}

		if (samlConfigs.userDataFieldMap && typeof samlConfigs.userDataFieldMap === 'string') {
			globalSettings.userDataFieldMap = samlConfigs.userDataFieldMap;
		}
	}

	static generateUniqueID(): string {
		const chars = 'abcdef0123456789';
		let uniqueID = 'id-';
		for (let i = 0; i < 20; i++) {
			uniqueID += chars.substr(Math.floor(Math.random() * 15), 1);
		}
		return uniqueID;
	}

	static generateInstant(): string {
		return new Date().toISOString();
	}

	static certToPEM(cert: string): string {
		const lines = cert.match(/.{1,64}/g);
		if (!lines) {
			throw new Error('Invalid Certificate');
		}

		lines.splice(0, 0, '-----BEGIN CERTIFICATE-----');
		lines.push('-----END CERTIFICATE-----');

		return lines.join('\n');
	}

	static fillTemplateData(template: string, data: Record<string, string>): string {
		let newTemplate = template;

		for (const variable in data) {
			if (variable in data) {
				newTemplate = newTemplate.replace(`__${ variable }__`, data[variable]);
			}
		}

		return newTemplate;
	}

	static log(...args: Array<any>): void {
		if (debug && logger) {
			logger.info(...args);
		}
	}

	static error(...args: Array<any>): void {
		if (logger) {
			logger.error(...args);
		}
	}

	static logUpdated(key: string): void {
		if (logger) {
			logger.updated(key);
		}
	}

	static inflateXml(base64Data: string, successCallback: (xml: string) => void, errorCallback: (err: string | object | null) => void): void {
		const buffer = new Buffer(base64Data, 'base64');
		zlib.inflateRaw(buffer, (err, decoded) => {
			if (err) {
				this.log(`Error while inflating. ${ err }`);
				return errorCallback(err);
			}

			if (!decoded) {
				return errorCallback('Failed to extract request data');
			}

			const xmlString = this.convertArrayBufferToString(decoded);
			return successCallback(xmlString);
		});
	}

	static validateStatus(doc: Document): { success: boolean; message: string; statusCode: string } {
		let successStatus = false;
		let status = null;
		let messageText = '';

		const statusNodes = doc.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:protocol', 'StatusCode');

		if (statusNodes.length) {
			const statusNode = statusNodes[0];
			const statusMessage = doc.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:protocol', 'StatusMessage')[0];

			if (statusMessage && statusMessage.firstChild && statusMessage.firstChild.textContent) {
				messageText = statusMessage.firstChild.textContent;
			}

			status = statusNode.getAttribute('Value');

			if (status === 'urn:oasis:names:tc:SAML:2.0:status:Success') {
				successStatus = true;
			}
		}
		return {
			success: successStatus,
			message: messageText,
			statusCode: status || '',
		};
	}

	static normalizeCert(cert: string): string {
		return cert.replace('-----BEGIN CERTIFICATE-----', '').replace('-----END CERTIFICATE-----', '').trim();
	}

	static getUserDataMapping(): IUserDataMap {
		const { userDataFieldMap, immutableProperty } = globalSettings;

		let map: Record<string, any>;

		try {
			map = JSON.parse(userDataFieldMap);
		} catch (e) {
			map = {};
		}

		const parsedMap: IUserDataMap = {
			customFields: new Map(),
			attributeList: new Set(),
			email: {
				fieldName: 'email',
			},
			username: {
				fieldName: 'username',
			},
			name: {
				fieldName: 'cn',
			},
			identifier: {
				type: '',
			},
		};

		let identifier = immutableProperty.toLowerCase();

		for (const spFieldName in map) {
			if (!map.hasOwnProperty(spFieldName)) {
				continue;
			}

			const attribute = map[spFieldName];
			if (typeof attribute !== 'string' && typeof attribute !== 'object') {
				throw new Error(`SAML User Map: Invalid configuration for ${ spFieldName } field.`);
			}

			if (spFieldName === '__identifier__') {
				if (typeof attribute !== 'string') {
					throw new Error('SAML User Map: Invalid identifier.');
				}

				identifier = attribute;
				continue;
			}


			let attributeMap: IAttributeMapping | null = null;

			// If it's a complex type, let's check what's in it
			if (typeof attribute === 'object') {
				// A fieldName is mandatory for complex fields. If it's missing, let's skip this one.
				if (!attribute.hasOwnProperty('fieldName') && !attribute.hasOwnProperty('fieldNames')) {
					continue;
				}

				const fieldName = attribute.fieldName || attribute.fieldNames;
				const { regex, template } = attribute;
				// let attributeName: string;

				if (Array.isArray(fieldName)) {
					if (!fieldName.length) {
						throw new Error(`SAML User Map: Invalid configuration for ${ spFieldName } field.`);
					}

					// attributeName = fieldName[0];
					for (const idpFieldName of fieldName) {
						parsedMap.attributeList.add(idpFieldName);
					}
				} else {
					// attributeName = fieldName;
					parsedMap.attributeList.add(fieldName);
				}

				if (regex && typeof regex !== 'string') {
					throw new Error('SAML User Map: Invalid RegEx');
				}

				if (template && typeof template !== 'string') {
					throw new Error('SAML User Map: Invalid Template');
				}

				attributeMap = {
					fieldName,
					...regex && { regex },
					...template && { template },
				};
			} else if (typeof attribute === 'string') {
				attributeMap = {
					fieldName: attribute,
				};
				parsedMap.attributeList.add(attribute);
			}

			if (attributeMap) {
				if (spFieldName === 'email' || spFieldName === 'username' || spFieldName === 'name') {
					parsedMap[spFieldName] = attributeMap;
				} else {
					parsedMap.customFields.set(spFieldName, attributeMap);
				}
			}
		}

		if (identifier) {
			const defaultTypes = [
				'email',
				'username',
			];

			if (defaultTypes.includes(identifier)) {
				parsedMap.identifier.type = identifier;
			} else {
				parsedMap.identifier.type = 'custom';
				parsedMap.identifier.attribute = identifier;
				parsedMap.attributeList.add(identifier);
			}
		}

		return parsedMap;
	}

	static getProfileValue(profile: Record<string, any>, mapping: IAttributeMapping): any {
		const values: Record<string, string> = {
			regex: '',
		};
		const fieldNames = this.ensureArray<string>(mapping.fieldName);

		let mainValue;
		for (const fieldName of fieldNames) {
			values[fieldName] = profile[fieldName];

			if (!mainValue) {
				mainValue = profile[fieldName];
			}
		}

		let shouldRunTemplate = false;
		if (typeof mapping.template === 'string') {
			// unless the regex result is used on the template, we process the template first
			if (mapping.template.includes('__regex__')) {
				shouldRunTemplate = true;
			} else {
				mainValue = this.fillTemplateData(mapping.template, values);
			}
		}

		if (mapping.regex && mainValue && mainValue.match) {
			let regexValue;
			const match = mainValue.match(new RegExp(mapping.regex));
			if (match && match.length) {
				if (match.length >= 2) {
					regexValue = match[1];
				} else {
					regexValue = match[0];
				}
			}

			if (regexValue) {
				values.regex = regexValue;
				if (!shouldRunTemplate) {
					mainValue = regexValue;
				}
			}
		}

		if (shouldRunTemplate && typeof mapping.template === 'string') {
			mainValue = this.fillTemplateData(mapping.template, values);
		}

		return mainValue;
	}

	static convertArrayBufferToString(buffer: ArrayBuffer, encoding = 'utf8'): string {
		return Buffer.from(buffer).toString(encoding);
	}

	static normalizeUsername(name: string): string {
		const { globalSettings } = this;

		switch (globalSettings.usernameNormalize) {
			case 'Lowercase':
				name = name.toLowerCase();
				break;
		}

		return name;
	}

	static ensureArray<T>(param: T | Array<T>): Array<T> {
		const emptyArray: Array<T> = [];
		return emptyArray.concat(param);
	}

	static mapProfileToUserObject(profile: Record<string, any>): ISAMLUser {
		const userDataMap = this.getUserDataMapping();
		const { defaultUserRole = 'user', roleAttributeName } = this.globalSettings;

		if (userDataMap.identifier.type === 'custom') {
			if (!userDataMap.identifier.attribute) {
				throw new Error('SAML User Data Map: invalid Identifier configuration received.');
			}
			if (!profile[userDataMap.identifier.attribute]) {
				throw new Error(`SAML Profile did not have the expected identifier (${ userDataMap.identifier.attribute }).`);
			}
		}

		const attributeList = new Map();
		for (const attributeName of userDataMap.attributeList) {
			if (profile[attributeName] === undefined) {
				this.log(`SAML user profile is missing the attribute ${ attributeName }.`);
				continue;
			}
			attributeList.set(attributeName, profile[attributeName]);
		}

		const email = this.getProfileValue(profile, userDataMap.email);
		const profileUsername = this.getProfileValue(profile, userDataMap.username);
		const name = this.getProfileValue(profile, userDataMap.name);

		// Even if we're not using the email to identify the user, it is still mandatory because it's a mandatory information on Rocket.Chat
		if (!email) {
			throw new Error('SAML Profile did not contain an email address');
		}

		const userObject: ISAMLUser = {
			customFields: new Map(),
			samlLogin: {
				provider: this.relayState,
				idp: profile.issuer,
				idpSession: profile.sessionIndex,
				nameID: profile.nameID,
			},
			emailList: this.ensureArray<string>(email),
			fullName: name || profile.displayName || profile.username,
			roles: this.ensureArray<string>(defaultUserRole.split(',')),
			eppn: profile.eppn,
			attributeList,
			identifier: userDataMap.identifier,
		};

		if (profileUsername) {
			userObject.username = this.normalizeUsername(profileUsername);
		}

		if (roleAttributeName && profile[roleAttributeName]) {
			userObject.roles = this.ensureArray<string>((profile[roleAttributeName] || '').split(','));
		}

		// const languages = TAPi18n.getLanguages();
		// if (languages[profile.language]) {
		// 	userObject.language = profile.language;
		// }

		if (profile.channels) {
			userObject.channels = profile.channels.split(',');
		}

		for (const [fieldName, customField] of userDataMap.customFields) {
			const value = this.getProfileValue(profile, customField);
			if (value) {
				userObject.customFields.set(fieldName, value);
			}
		}

		return userObject;
	}
}

export const defaultAuthnContextTemplate = `<samlp:RequestedAuthnContext xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" Comparison="__authnContextComparison__">
	<saml:AuthnContextClassRef xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
		__authnContext__
	</saml:AuthnContextClassRef>
</samlp:RequestedAuthnContext>`;

export const defaultAuthRequestTemplate = `<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ID="__uniqueId__" Version="2.0" IssueInstant="__instant__" ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" AssertionConsumerServiceURL="__callbackUrl__" Destination="__entryPoint__">
	<saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">__issuer__</saml:Issuer>
	__identifierFormatTag__
	__authnContextTag__
</samlp:AuthnRequest>`;

export const defaultLogoutResponseTemplate = `<samlp:LogoutResponse xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ID="__uniqueId__" Version="2.0" IssueInstant="__instant__" Destination="__idpSLORedirectURL__">
	<saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">__issuer__</saml:Issuer>
	<samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
</samlp:LogoutResponse>`;

export const defaultLogoutRequestTemplate = `<samlp:LogoutRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ID="__uniqueId__" Version="2.0" IssueInstant="__instant__" Destination="__idpSLORedirectURL__">
	<saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">__issuer__</saml:Issuer>
	<saml:NameID xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" NameQualifier="http://id.init8.net:8080/openam" SPNameQualifier="__issuer__" Format="__identifierFormat__">__nameID__</saml:NameID>
	<samlp:SessionIndex xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol">__sessionIndex__</samlp:SessionIndex>
</samlp:LogoutRequest>`;

export const defaultNameIDTemplate = '<samlp:NameIDPolicy xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" Format="__identifierFormat__" AllowCreate="true"></samlp:NameIDPolicy>';
export const defaultIdentifierFormat = 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress';
export const defaultAuthnContext = 'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport';
