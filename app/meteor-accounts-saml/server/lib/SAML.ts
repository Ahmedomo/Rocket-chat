import { ServerResponse } from 'http';

import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { Accounts } from 'meteor/accounts-base';
import fiber from 'fibers';
import s from 'underscore.string';

import { settings } from '../../../settings/server';
import { Users, Rooms, CredentialTokens } from '../../../models/server';
import { IUser } from '../../../../definition/IUser';
import { IIncomingMessage } from '../../../../definition/IIncomingMessage';
import { _setUsername, createRoom, generateUsernameSuggestion } from '../../../lib/server/functions';
import { SAMLServiceProvider } from './ServiceProvider';
import { IServiceProviderOptions } from '../definition/IServiceProviderOptions';
import { ISAMLAction } from '../definition/ISAMLAction';
import { ISAMLUser } from '../definition/ISAMLUser';
import { SAMLUtils } from './Utils';

const showErrorMessage = function(res: ServerResponse, err: string): void {
	res.writeHead(200, {
		'Content-Type': 'text/html',
	});
	const content = `<html><body><h2>Sorry, an annoying error occured</h2><div>${ s.escapeHTML(err) }</div></body></html>`;
	res.end(content, 'utf-8');
};

export class SAML {
	static processRequest(req: IIncomingMessage, res: ServerResponse, service: IServiceProviderOptions, samlObject: ISAMLAction): void {
		// Skip everything if there's no service set by the saml middleware
		if (!service) {
			if (samlObject.actionName === 'metadata') {
				showErrorMessage(res, `Unexpected SAML service ${ samlObject.serviceName }`);
				return;
			}

			throw new Error(`Unexpected SAML service ${ samlObject.serviceName }`);
		}

		switch (samlObject.actionName) {
			case 'metadata':
				return this.processMetadataAction(res, service);
			case 'logout':
				return this.processLogoutAction(req, res, service);
			case 'sloRedirect':
				return this.processSLORedirectAction(req, res);
			case 'authorize':
				return this.processAuthorizeAction(res, service, samlObject);
			case 'validate':
				return this.processValidateAction(req, res, service, samlObject);
			default:
				throw new Error(`Unexpected SAML action ${ samlObject.actionName }`);
		}
	}

	static processMetadataAction(res: ServerResponse, service: IServiceProviderOptions): void {
		try {
			const serviceProvider = new SAMLServiceProvider(service);

			res.writeHead(200);
			res.write(serviceProvider.generateServiceProviderMetadata());
			res.end();
		} catch (err) {
			showErrorMessage(res, err);
		}
	}

	static processLogoutAction(req: IIncomingMessage, res: ServerResponse, service: IServiceProviderOptions): void {
		// This is where we receive SAML LogoutResponse
		if (req.query.SAMLRequest) {
			return this.processLogoutRequest(req, res, service);
		}

		return this.processLogoutResponse(req, res, service);
	}

	static _logoutRemoveTokens(userId: string): void {
		SAMLUtils.log(`Found user ${ userId }`);

		Users.unsetLoginTokens(userId);
		Users.removeSamlService(userId);
	}

	static processLogoutRequest(req: IIncomingMessage, res: ServerResponse, service: IServiceProviderOptions): void {
		const serviceProvider = new SAMLServiceProvider(service);
		serviceProvider.validateLogoutRequest(req.query.SAMLRequest, (err, result) => {
			if (err) {
				console.error(err);
				throw new Meteor.Error('Unable to Validate Logout Request');
			}

			if (!result) {
				throw new Meteor.Error('Unable to process Logout Request: missing request data.');
			}

			let timeoutHandler: NodeJS.Timer | null = null;
			const redirect = (url?: string | undefined): void => {
				if (!timeoutHandler) {
					// If the handler is null, then we already ended the response;
					return;
				}

				clearTimeout(timeoutHandler);
				timeoutHandler = null;

				res.writeHead(302, {
					Location: url || Meteor.absoluteUrl(),
				});
				res.end();
			};

			// Add a timeout to end the server response
			timeoutHandler = setTimeout(() => {
				// If we couldn't get a valid IdP url, let's redirect the user to our home so the browser doesn't hang on them.
				redirect();
			}, 5000);

			fiber(() => {
				try {
					const cursor = Users.findBySAMLNameIdOrIdpSession(result.nameID, result.idpSession);
					const count = cursor.count();
					if (count > 1) {
						throw new Meteor.Error('Found multiple users matching SAML session');
					}

					if (count === 0) {
						throw new Meteor.Error('Invalid logout request: no user associated with session.');
					}

					const loggedOutUser = cursor.fetch();
					this._logoutRemoveTokens(loggedOutUser[0]._id);

					const { response } = serviceProvider.generateLogoutResponse({
						nameID: result.nameID || '',
						sessionIndex: result.idpSession || '',
					});

					serviceProvider.logoutResponseToUrl(response, (err, url) => {
						if (err) {
							console.error(err);
							return redirect();
						}

						redirect(url);
					});
				} catch (e) {
					console.error(e);
					redirect();
				}
			}).run();
		});
	}

	static processLogoutResponse(req: IIncomingMessage, res: ServerResponse, service: IServiceProviderOptions): void {
		if (!req.query.SAMLResponse) {
			SAMLUtils.error('Invalid LogoutResponse, missing SAMLResponse', req.query);
			throw new Error('Invalid LogoutResponse received.');
		}

		const serviceProvider = new SAMLServiceProvider(service);
		serviceProvider.validateLogoutResponse(req.query.SAMLResponse, (err, inResponseTo) => {
			if (err) {
				return;
			}

			if (!inResponseTo) {
				throw new Meteor.Error('Invalid logout request: no inResponseTo value.');
			}

			const logOutUser = (inResponseTo: string): void => {
				SAMLUtils.log(`Logging Out user via inResponseTo ${ inResponseTo }`);

				const cursor = Users.findBySAMLInResponseTo(inResponseTo);
				const count = cursor.count();
				if (count > 1) {
					throw new Meteor.Error('Found multiple users matching SAML inResponseTo fields');
				}

				if (count === 0) {
					throw new Meteor.Error('Invalid logout request: no user associated with inResponseTo.');
				}

				const loggedOutUser = cursor.fetch();
				this._logoutRemoveTokens(loggedOutUser[0]._id);
			};

			try {
				fiber(() => logOutUser(inResponseTo)).run();
			} finally {
				res.writeHead(302, {
					Location: req.query.RelayState,
				});
				res.end();
			}
		});
	}

	static processSLORedirectAction(req: IIncomingMessage, res: ServerResponse): void {
		res.writeHead(302, {
			// credentialToken here is the SAML LogOut Request that we'll send back to IDP
			Location: req.query.redirect,
		});
		res.end();
	}

	static processAuthorizeAction(res: ServerResponse, service: IServiceProviderOptions, samlObject: ISAMLAction): void {
		service.id = samlObject.credentialToken;

		const serviceProvider = new SAMLServiceProvider(service);
		serviceProvider.getAuthorizeUrl((err, url) => {
			if (err) {
				throw new Error('Unable to generate authorize url');
			}
			res.writeHead(302, {
				Location: url,
			});
			res.end();
		});
	}

	static processValidateAction(req: IIncomingMessage, res: ServerResponse, service: IServiceProviderOptions, samlObject: ISAMLAction): void {
		const serviceProvider = new SAMLServiceProvider(service);
		SAMLUtils.relayState = req.body.RelayState;
		serviceProvider.validateResponse(req.body.SAMLResponse, (err, profile/* , loggedOut*/) => {
			if (err) {
				throw new Error(`Unable to validate response url: ${ err }`);
			}

			if (!profile) {
				throw new Error('No user data collected from IdP response.');
			}

			let credentialToken = (profile.inResponseToId && profile.inResponseToId.value) || profile.inResponseToId || profile.InResponseTo || samlObject.credentialToken;
			const loginResult = {
				profile,
			};

			if (!credentialToken) {
				// No credentialToken in IdP-initiated SSO
				credentialToken = Random.id();
				SAMLUtils.log('[SAML] Using random credentialToken: ', credentialToken);
			}

			this.storeCredential(credentialToken, loginResult);
			const url = `${ Meteor.absoluteUrl('home') }?saml_idp_credentialToken=${ credentialToken }`;
			res.writeHead(302, {
				Location: url,
			});
			res.end();
		});
	}

	static findUser(username: string | undefined, emailRegex: RegExp): IUser | undefined {
		const { globalSettings } = SAMLUtils;

		if (globalSettings.immutableProperty === 'Username') {
			if (username) {
				return Users.findOne({
					username,
				});
			}

			return;
		}

		return Users.findOne({
			'emails.address': emailRegex,
		});
	}

	static guessNameFromUsername(username: string): string {
		return username
			.replace(/\W/g, ' ')
			.replace(/\s(.)/g, (u) => u.toUpperCase())
			.replace(/^(.)/, (u) => u.toLowerCase())
			.replace(/^\w/, (u) => u.toUpperCase());
	}

	static subscribeToSAMLChannels(channels: Array<string>, user: IUser): void {
		try {
			for (let roomName of channels) {
				roomName = roomName.trim();
				if (!roomName) {
					continue;
				}

				const room = Rooms.findOneByNameAndType(roomName, 'c', {});
				if (!room) {
					createRoom('c', roomName, user.username);
				}
			}
		} catch (err) {
			console.error(err);
		}
	}

	static hasCredential(credentialToken: string): boolean {
		return CredentialTokens.findOneById(credentialToken) != null;
	}

	static retrieveCredential(credentialToken: string): Record<string, any> | undefined {
		// The credentialToken in all these functions corresponds to SAMLs inResponseTo field and is mandatory to check.
		const data = CredentialTokens.findOneById(credentialToken);
		if (data) {
			return data.userInfo;
		}
	}

	static storeCredential(credentialToken: string, loginResult: object): void {
		CredentialTokens.create(credentialToken, loginResult);
	}

	static insertOrUpdateSAMLUser(userObject: ISAMLUser): {userId: string; token: string} {
		// @ts-ignore RegExp.escape is a meteor method
		const escapeRegexp = (email: string): string => RegExp.escape(email);
		const { roleAttributeSync, generateUsername, immutableProperty, nameOverwrite, mailOverwrite } = SAMLUtils.globalSettings;

		let eppnMatch = false;
		let user = null;

		// First, try searching by eppn
		if (userObject.eppn) {
			user = Users.findOne({
				eppn: userObject.eppn,
			});

			if (user) {
				eppnMatch = true;
			}
		}

		// Second, try searching by username or email (according to the setting)
		if (!user) {
			const expression = userObject.emailList.map((email) => `^${ escapeRegexp(email) }$`).join('|');
			const emailRegex = new RegExp(expression, 'i');

			user = SAML.findUser(userObject.username, emailRegex);
		}

		const emails = userObject.emailList.map((email) => ({
			address: email,
			verified: settings.get('Accounts_Verify_Email_For_External_Accounts'),
		}));
		const globalRoles = userObject.roles;

		let { username } = userObject;

		if (!user) {
			const newUser: Record<string, any> = {
				name: userObject.fullName,
				active: true,
				eppn: userObject.eppn,
				globalRoles,
				emails,
				services: {},
			};

			if (generateUsername === true) {
				username = generateUsernameSuggestion(newUser);
			}

			if (username) {
				newUser.username = username;
				newUser.name = newUser.name || SAML.guessNameFromUsername(username);
			}

			if (userObject.language) {
				newUser.language = userObject.language;
			}

			const userId = Accounts.insertUserDoc({}, newUser);
			user = Users.findOne(userId);

			if (userObject.channels) {
				SAML.subscribeToSAMLChannels(userObject.channels, user);
			}
		}

		// If the user was not found through the eppn property, then update it
		if (eppnMatch === false) {
			Users.update({
				_id: user._id,
			}, {
				$set: {
					eppn: userObject.eppn,
				},
			});
		}

		// creating the token and adding to the user
		const stampedToken = Accounts._generateStampedLoginToken();
		Users.addPersonalAccessTokenToUser({
			userId: user._id,
			loginTokenObject: stampedToken,
		});

		const updateData: Record<string, any> = {
			// TBD this should be pushed, otherwise we're only able to SSO into a single IDP at a time
			'services.saml': userObject.samlLogin,
		};

		for (const [customField, value] of userObject.customFields) {
			updateData[`customFields.${ customField }`] = value;
		}

		// Overwrite mail if needed
		if (mailOverwrite === true && (eppnMatch === true || immutableProperty !== 'EMail')) {
			updateData.emails = emails;
		}

		// Overwrite fullname if needed
		if (nameOverwrite === true) {
			updateData.name = userObject.fullName;
		}

		if (roleAttributeSync) {
			updateData.roles = globalRoles;
		}

		Users.update({
			_id: user._id,
		}, {
			$set: updateData,
		});

		if (username) {
			_setUsername(user._id, username);
		}

		// sending token along with the userId
		return {
			userId: user._id,
			token: stampedToken.token,
		};
	}
}
