import {
	SAMLUtils,
	defaultIdentifierFormat,
	defaultLogoutRequestTemplate,
} from '../Utils';
import { IServiceProviderOptions } from '../../definition/IServiceProviderOptions';

/*
	A Logout Request is used when the user is logged out of Rocket.Chat and the Service Provider is configured to also logout from the Identity Provider.
*/
export class LogoutRequest {
	static generate(serviceProviderOptions: IServiceProviderOptions, nameID: string, sessionIndex: string): { id: string; request: string} {
		const data = this.getDataForNewRequest(serviceProviderOptions, nameID, sessionIndex);
		const request = SAMLUtils.fillTemplateData(serviceProviderOptions.logoutRequestTemplate || defaultLogoutRequestTemplate, data);

		SAMLUtils.log('------- SAML Logout request -----------');
		SAMLUtils.log(request);

		return {
			request,
			id: data.uniqueId,
		};
	}

	static getDataForNewRequest(serviceProviderOptions: IServiceProviderOptions, nameID: string, sessionIndex: string): Record<string, any> {
		// nameId: <nameId as submitted during SAML SSO>
		// sessionIndex: sessionIndex
		// --- NO SAMLsettings: <Meteor.setting.saml  entry for the provider you want to SLO from

		const id = `_${ SAMLUtils.generateUniqueID() }`;
		const instant = SAMLUtils.generateInstant();

		return {
			uniqueId: id,
			instant,
			idpSLORedirectURL: serviceProviderOptions.idpSLORedirectURL,
			issuer: serviceProviderOptions.issuer,
			identifierFormat: serviceProviderOptions.identifierFormat || defaultIdentifierFormat,
			nameID,
			sessionIndex,
		};
	}
}
