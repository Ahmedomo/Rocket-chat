import { Box, MessageToolboxItem, Option, OptionDivider, OptionTitle } from '@rocket.chat/fuselage';
import { useTranslation } from '@rocket.chat/ui-contexts';
import type { ComponentProps, ReactElement } from 'react';
import React, { Fragment, useRef, useState } from 'react';

import type { MessageActionConfig } from '../../../../app/ui-utils/client/lib/MessageAction';
import { useEmbeddedLayout } from '../../../hooks/useEmbeddedLayout';
import ToolboxDropdown from './ToolboxDropdown';

type MessageActionConfigOption = Omit<MessageActionConfig, 'condition' | 'context' | 'order' | 'action'> & {
	action: (event: UIEvent) => void;
};

type MessageActionMenuProps = {
	options: MessageActionConfigOption[];
};

const MessageActionMenu = ({ options, ...props }: MessageActionMenuProps): ReactElement => {
	const ref = useRef(null);
	const t = useTranslation();
	const [visible, setVisible] = useState(false);
	const isLayoutEmbedded = useEmbeddedLayout();

	const groupOptions = options
		.map(({ type, color, ...option }) => ({
			...option,
			...(type && { type }),
			...(color === 'alert' && { variant: 'danger' as const }),
		}))
		.reduce((acc, option) => {
			const type = option.type ? option.type : '';
			acc[type] = acc[type] || [];
			if (!(isLayoutEmbedded && option.id === 'reply-directly')) acc[type].push(option);

			if (acc[type].length === 0) delete acc[type];

			return acc;
		}, {} as { [key: string]: MessageActionConfigOption[] }) as {
		[key: string]: MessageActionConfigOption[];
	};

	console.log({ groupOptions });

	return (
		<>
			<MessageToolboxItem
				ref={ref}
				icon='kebab'
				onClick={(): void => setVisible(!visible)}
				data-qa-id='menu'
				data-qa-type='message-action-menu'
				title={t('More')}
			/>
			{visible && (
				<>
					<Box position='fixed' inset={0} onClick={(): void => setVisible(!visible)} />
					<ToolboxDropdown reference={ref} {...props}>
						{Object.entries(groupOptions).map(([, options], index, arr) => (
							<Fragment key={index}>
								{options[0].type === 'apps' && <OptionTitle>Apps</OptionTitle>}
								{options.map((option) => (
									<Option
										variant={option.variant}
										key={option.id}
										id={option.id}
										icon={option.icon as ComponentProps<typeof Option>['icon']}
										label={t(option.label)}
										onClick={option.action}
										data-qa-type='message-action'
										data-qa-id={option.id}
										role={option.role ? option.role : 'button'}
									/>
								))}
								{index !== arr.length - 1 && <OptionDivider />}
							</Fragment>
						))}
					</ToolboxDropdown>
				</>
			)}
		</>
	);
};

export default MessageActionMenu;
