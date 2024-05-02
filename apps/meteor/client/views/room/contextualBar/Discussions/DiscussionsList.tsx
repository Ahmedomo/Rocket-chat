import type { IDiscussionMessage, IUser } from '@rocket.chat/core-typings';
import { Box, Icon, TextInput, Callout, Throbber } from '@rocket.chat/fuselage';
import { useResizeObserver, useAutoFocus } from '@rocket.chat/fuselage-hooks';
import { useSetting, useTranslation } from '@rocket.chat/ui-contexts';
import type { FormEventHandler, MouseEvent, RefObject } from 'react';
import React, { useCallback } from 'react';
import { Virtuoso } from 'react-virtuoso';

import {
	ContextualbarHeader,
	ContextualbarIcon,
	ContextualbarContent,
	ContextualbarClose,
	ContextualbarEmptyContent,
	ContextualbarTitle,
} from '../../../../components/Contextualbar';
import { VirtuosoScrollbars } from '../../../../components/CustomScrollbars';
import { goToRoomById } from '../../../../lib/utils/goToRoomById';
import DiscussionsListRow from './DiscussionsListRow';

type DiscussionsListProps = {
	total: number;
	discussions: Array<IDiscussionMessage>;
	loadMoreItems: (start: number, end: number) => void;
	loading: boolean;
	onClose: () => void;
	error: unknown;
	userId: IUser['_id'];
	text: string;
	onChangeFilter: FormEventHandler<HTMLInputElement>;
};

function DiscussionsList({
	total = 10,
	discussions = [],
	loadMoreItems,
	loading,
	onClose,
	error,
	userId,
	text,
	onChangeFilter,
}: DiscussionsListProps) {
	const t = useTranslation();
	const showRealNames = useSetting<boolean>('UI_Use_Real_Name') || false;
	const inputRef = useAutoFocus(true);

	const onClick = useCallback((e: MouseEvent<HTMLElement>) => {
		const { drid } = e.currentTarget.dataset;
		if (!drid) throw new Error('missing discussion ID');
		goToRoomById(drid);
	}, []);

	const { ref, contentBoxSize: { inlineSize = 378, blockSize = 1 } = {} } = useResizeObserver<HTMLElement>({
		debounceDelay: 200,
	});

	return (
		<>
			<ContextualbarHeader>
				<ContextualbarIcon name='discussion' />
				<ContextualbarTitle>{t('Discussions')}</ContextualbarTitle>
				<ContextualbarClose onClick={onClose} />
			</ContextualbarHeader>
			<ContextualbarContent paddingInline={0} ref={ref}>
				<Box
					display='flex'
					flexDirection='row'
					p={24}
					borderBlockEndWidth='default'
					borderBlockEndStyle='solid'
					borderBlockEndColor='extra-light'
					flexShrink={0}
				>
					<TextInput
						placeholder={t('Search_Messages')}
						value={text}
						onChange={onChangeFilter}
						ref={inputRef as RefObject<HTMLInputElement>}
						addon={<Icon name='magnifier' size='x20' />}
					/>
				</Box>

				{loading && (
					<Box pi={24} pb={12}>
						<Throbber size='x12' />
					</Box>
				)}

				{error instanceof Error && (
					<Callout mi={24} type='danger'>
						{error.toString()}
					</Callout>
				)}

				{!loading && total === 0 && <ContextualbarEmptyContent title={t('No_Discussions_found')} />}

				<Box flexGrow={1} flexShrink={1} overflow='hidden' display='flex'>
					{!error && total > 0 && discussions.length > 0 && (
						<Virtuoso
							style={{
								height: blockSize,
								width: inlineSize,
								overflow: 'hidden',
							}}
							totalCount={total}
							endReached={loading ? () => undefined : (start) => loadMoreItems(start, Math.min(50, total - start))}
							overscan={25}
							data={discussions}
							components={{ Scroller: VirtuosoScrollbars }}
							itemContent={(_, data) => (
								<DiscussionsListRow discussion={data} showRealNames={showRealNames} userId={userId} onClick={onClick} />
							)}
						/>
					)}
				</Box>
			</ContextualbarContent>
		</>
	);
}

export default DiscussionsList;
