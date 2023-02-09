import { isE2EEMessage, isOTRMessage } from '@rocket.chat/core-typings';
import type { Root } from '@rocket.chat/message-parser';
import { parse } from '@rocket.chat/message-parser';

import { callbacks } from '../../../lib/callbacks';
import { SystemLogger } from '../../lib/logger/system';
import { settings } from '../../../app/settings/server';

if (process.env.DISABLE_MESSAGE_PARSER !== 'true') {
	callbacks.add(
		'beforeSaveMessage',
		(message) => {
			if (isE2EEMessage(message) || isOTRMessage(message)) {
				return message;
			}
			try {
				if (message.msg) {
					message.md = messageTextToAstMarkdown(message.msg);
				}

				if (message.attachments?.[0]?.description !== undefined) {
					message.attachments[0].descriptionMd = messageTextToAstMarkdown(message.attachments[0].description);
				}
			} catch (e) {
				SystemLogger.error(e); // errors logged while the parser is at experimental stage
			}

			return message;
		},
		callbacks.priority.MEDIUM,
		'markdownParser',
	);
}

const messageTextToAstMarkdown = (messageText: string): Root => {
	return parse(messageText, {
		colors: settings.get('HexColorPreview_Enabled'),
		emoticons: true,
		...(settings.get('Katex_Enabled') && {
			katex: {
				dollarSyntax: settings.get('Katex_Dollar_Syntax'),
				parenthesisSyntax: settings.get('Katex_Parenthesis_Syntax'),
			},
		}),
	});
};
