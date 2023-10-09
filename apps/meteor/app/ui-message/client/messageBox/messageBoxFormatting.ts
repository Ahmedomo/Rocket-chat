import type { Keys as IconName } from '@rocket.chat/icons';
import type { TranslationKey } from '@rocket.chat/ui-contexts';

import { settings } from '../../../settings/client';

export type FormattingButton =
	| {
			label: TranslationKey;
			icon: IconName;
			pattern: string;
			// text?: () => string | undefined;
			command?: string;
			link?: string;
			condition?: () => boolean;
	  }
	| {
			label: TranslationKey;
			text: () => string | undefined;
			link: string;
			condition?: () => boolean;
	  };

export const formattingButtons: ReadonlyArray<FormattingButton> = [
	{
		label: 'Bold',
		icon: 'bold',
		pattern: '*{{text}}*',
		command: 'b',
	},
	{
		label: 'Italic',
		icon: 'italic',
		pattern: '_{{text}}_',
		command: 'i',
	},
	{
		label: 'Strike',
		icon: 'strike',
		pattern: '~{{text}}~',
	},
	{
		label: 'Inline_code',
		icon: 'code',
		pattern: '`{{text}}`',
	},
	{
		label: 'Multi_line',
		icon: 'multiline',
		pattern: '```\n{{text}}\n``` ',
	},
] as const;
