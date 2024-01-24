import { MessageReaction as MessageReactionTemplate, MessageReactionEmoji, MessageReactionCounter } from '@rocket.chat/fuselage';
import type { TranslationKey } from '@rocket.chat/ui-contexts';
import { useTooltipClose, useTooltipOpen, useTranslation } from '@rocket.chat/ui-contexts';
import { useQuery } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import React, { useContext, useRef } from 'react';

import { getEmojiClassNameAndDataTitle } from '../../../../lib/utils/renderEmoji';
import { useGetMessageByID } from '../../../../views/room/contextualBar/Threads/hooks/useGetMessageByID';
import MarkdownText from '../../../MarkdownText';
import { MessageListContext } from '../../list/MessageListContext';

// TODO: replace it with proper usage of i18next plurals
const getTranslationKey = (users: string[], mine: boolean): TranslationKey => {
	if (users.length === 0) {
		if (mine) {
			return 'You_reacted_with';
		}
	}

	if (users.length > 10) {
		if (mine) {
			return 'You_users_and_more_Reacted_with';
		}
		return 'Users_and_more_reacted_with';
	}

	if (mine) {
		return 'You_and_users_Reacted_with';
	}
	return 'Users_reacted_with';
};

type ReactionProps = {
	hasReacted: (name: string) => boolean;
	counter: number;
	name: string;
	names: string[];
	messageId: string;
	onClick: () => void;
};

const Reaction = ({ hasReacted, counter, name, names, messageId, ...props }: ReactionProps): ReactElement => {
	const t = useTranslation();
	const ref = useRef<HTMLDivElement>(null);
	const openTooltip = useTooltipOpen();
	const closeTooltip = useTooltipClose();
	const { showRealName, username } = useContext(MessageListContext);

	const mine = hasReacted(name);

	const key = getTranslationKey(names, mine);

	const emojiProps = getEmojiClassNameAndDataTitle(name);

	const getMessage = useGetMessageByID();

	const { refetch } = useQuery(
		['chat.getMessage', 'reactions', messageId],
		async () => {
			if (names.length === 0) {
				return [];
			}

			if (!showRealName) {
				return names;
			}

			const message = await getMessage(messageId);
			const { reactions } = message;

			if (!reactions) {
				return [];
			}

			if (!username) {
				return reactions[name].names || names;
			}

			const index = reactions[name].usernames.indexOf(username);
			if (index === -1) {
				return reactions[name].names || names;
			}
			reactions[name].names?.splice(index, 1);
			return (reactions[name].names || names).filter(Boolean);
		},
		{ enabled: false },
	);

	return (
		<MessageReactionTemplate
			ref={ref}
			key={name}
			mine={mine}
			tabIndex={0}
			role='button'
			onMouseOver={async (e) => {
				e.stopPropagation();
				e.preventDefault();

				const users = (await refetch()).data;

				ref.current &&
					openTooltip(
						<MarkdownText
							content={t(key, {
								counter: names.length > 10 ? names.length - 10 : names.length,
								users: users?.slice(0, 10).join(', ') || '',
								emoji: name,
							})}
							variant='inline'
						/>,
						ref.current,
					);
			}}
			onMouseLeave={(): void => {
				closeTooltip();
			}}
			{...props}
		>
			<MessageReactionEmoji {...emojiProps} />
			<MessageReactionCounter counter={counter} />
		</MessageReactionTemplate>
	);
};

export default Reaction;
