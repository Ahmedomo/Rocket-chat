import type { IEmailInbox, RocketChatRecordDeleted } from '@rocket.chat/core-typings';
import type { IEmailInboxModel } from '@rocket.chat/model-typings';
import type { Collection, IndexDescription } from 'mongodb';

import { BaseRaw } from './BaseRaw';

export class EmailInboxRaw extends BaseRaw<IEmailInbox> implements IEmailInboxModel {
	constructor(trash?: Collection<RocketChatRecordDeleted<IEmailInbox>>) {
		super('email_inbox', trash);
	}

	protected modelIndexes(): IndexDescription[] {
		return [{ key: { email: 1 }, unique: true }];
	}
}
