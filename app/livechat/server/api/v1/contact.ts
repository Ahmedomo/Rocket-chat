import { Match, check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';

import { API } from '../../../../api/server';
import { Contacts } from '../../lib/Contacts';
import { LivechatVisitors } from '../../../../models/server/index';

API.v1.addRoute(
	'omnichannel/contact',
	{ authRequired: true },
	{
		async post() {
			try {
				check(this.bodyParams, {
					_id: Match.Maybe(String),
					token: String,
					name: String,
					username: Match.Maybe(String),
					email: Match.Maybe(String),
					phone: Match.Maybe(String),
					customFields: Match.Maybe(Object),
					contactManager: Match.Maybe(Object),
				});

				const contact = Contacts.registerContact(this.bodyParams);

				return API.v1.success({ contact });
			} catch (e) {
				return API.v1.failure(e);
			}
		},
		async get() {
			check(this.queryParams, {
				contactId: String,
			});

			const contact = await LivechatVisitors.findOneById(this.queryParams.contactId);

			return API.v1.success({ contact });
		},
	},
);

API.v1.addRoute(
	'omnichannel/contact.search',
	{ authRequired: true },
	{
		async get() {
			try {
				check(this.queryParams, {
					email: Match.Maybe(String),
					phone: Match.Maybe(String),
				});

				const { email, phone } = this.queryParams;

				if (!email && !phone) {
					throw new Meteor.Error('error-invalid-params');
				}

				const query = Object.assign(
					{},
					{
						...(email && { visitorEmails: { address: email } }),
						...(phone && { phone: { phoneNumber: phone } }),
					},
				);

				const contact = await LivechatVisitors.findOne(query);
				return API.v1.success({ contact });
			} catch (e) {
				return API.v1.failure(e);
			}
		},
	},
);
