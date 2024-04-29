import { css } from '@rocket.chat/css-in-js';
import { Box } from '@rocket.chat/fuselage';
import { useMergedRefs } from '@rocket.chat/fuselage-hooks';
import { HeaderContentRow, HeaderSection, HeaderSubtitle } from '@rocket.chat/ui-client';
import { usePermission, useRole, useSetting, useTranslation, useUser, useUserPreference } from '@rocket.chat/ui-contexts';
import type { MouseEventHandler, ReactElement } from 'react';
import React, { memo, useCallback, useMemo, useRef } from 'react';

import { RoomRoles } from '../../../../app/models/client';
import { isTruthy } from '../../../../lib/isTruthy';
import { CustomScrollbars } from '../../../components/CustomScrollbars';
import MarkdownText from '../../../components/MarkdownText';
import { useEmbeddedLayout } from '../../../hooks/useEmbeddedLayout';
import { useReactiveQuery } from '../../../hooks/useReactiveQuery';
import Announcement from '../Announcement';
import { BubbleDate } from '../BubbleDate';
import { RoomLeader } from '../Header/RoomLeader';
import { MessageList } from '../MessageList';
import MessageListErrorBoundary from '../MessageList/MessageListErrorBoundary';
import ComposerContainer from '../composer/ComposerContainer';
import RoomComposer from '../composer/RoomComposer/RoomComposer';
import { useChat } from '../contexts/ChatContext';
import { useRoom, useRoomSubscription, useRoomMessages } from '../contexts/RoomContext';
import { useRoomToolbox } from '../contexts/RoomToolboxContext';
import { useDateScroll } from '../hooks/useDateScroll';
import { useMessageListNavigation } from '../hooks/useMessageListNavigation';
import DropTargetOverlay from './DropTargetOverlay';
import JumpToRecentMessageButton from './JumpToRecentMessageButton';
import LoadingMessagesIndicator from './LoadingMessagesIndicator';
import RetentionPolicyWarning from './RetentionPolicyWarning';
import RoomForeword from './RoomForeword/RoomForeword';
import UnreadMessagesIndicator from './UnreadMessagesIndicator';
import UploadProgressIndicator from './UploadProgressIndicator';
import { useFileUpload } from './hooks/useFileUpload';
import { useGetMore } from './hooks/useGetMore';
import { useGoToHomeOnRemoved } from './hooks/useGoToHomeOnRemoved';
import { useHasNewMessages } from './hooks/useHasNewMessages';
import { useHeaderSection } from './hooks/useHeaderSection';
import { useListIsAtBottom } from './hooks/useListIsAtBottom';
import { useQuoteMessageByUrl } from './hooks/useQuoteMessageByUrl';
import { useReadMessageWindowEvents } from './hooks/useReadMessageWindowEvents';
import { useRestoreScrollPosition } from './hooks/useRestoreScrollPosition';
import { useRetentionPolicy } from './hooks/useRetentionPolicy';
import { useHandleUnread } from './hooks/useUnreadMessages';

const RoomBody = (): ReactElement => {
	const chat = useChat();
	if (!chat) {
		throw new Error('No ChatContext provided');
	}

	const t = useTranslation();
	const isLayoutEmbedded = useEmbeddedLayout();
	const room = useRoom();
	const user = useUser();
	const toolbox = useRoomToolbox();
	const admin = useRole('admin');
	const subscription = useRoomSubscription();

	const retentionPolicy = useRetentionPolicy(room);

	const hideFlexTab = useUserPreference<boolean>('hideFlexTab') || undefined;
	const hideUsernames = useUserPreference<boolean>('hideUsernames');
	const displayAvatars = useUserPreference<boolean>('displayAvatars');

	const { hasMorePreviousMessages, hasMoreNextMessages, isLoadingMoreMessages } = useRoomMessages();

	const allowAnonymousRead = useSetting('Accounts_AllowAnonymousRead') as boolean | undefined;

	const canPreviewChannelRoom = usePermission('preview-c-room');

	const subscribed = !!subscription;

	const canPreview = useMemo(() => {
		if (room && room.t !== 'c') {
			return true;
		}

		if (allowAnonymousRead === true) {
			return true;
		}

		if (canPreviewChannelRoom) {
			return true;
		}

		return subscribed;
	}, [allowAnonymousRead, canPreviewChannelRoom, room, subscribed]);

	const useRealName = useSetting('UI_Use_Real_Name') as boolean;

	const innerBoxRef = useRef<HTMLDivElement | null>(null);

	const {
		wrapperRef: unreadBarWrapperRef,
		innerRef: unreadBarInnerRef,
		handleUnreadBarJumpToButtonClick,
		handleMarkAsReadButtonClick,
		counter: [unread],
	} = useHandleUnread(room, subscription);

	const { innerRef: dateScrollInnerRef, bubbleRef, listStyle, ...bubbleDate } = useDateScroll();

	const { innerRef: isAtBottomInnerRef, atBottomRef, sendToBottom, sendToBottomIfNecessary, isAtBottom } = useListIsAtBottom();

	const { innerRef: getMoreInnerRef } = useGetMore(room._id, atBottomRef);

	const { wrapperRef: leaderBannerWrapperRef, hideLeaderHeader, innerRef: leaderBannerInnerRef } = useHeaderSection();

	const {
		uploads,
		handleUploadFiles,
		handleUploadProgressClose,
		targeDrop: [fileUploadTriggerProps, fileUploadOverlayProps],
	} = useFileUpload();

	const { innerRef: restoreScrollPositionInnerRef } = useRestoreScrollPosition(room._id);

	const { messageListRef } = useMessageListNavigation();

	const { handleNewMessageButtonClick, handleJumpToRecentButtonClick, handleComposerResize, hasNewMessages, newMessagesScrollRef } =
		useHasNewMessages(room._id, user?._id, atBottomRef, {
			sendToBottom,
			sendToBottomIfNecessary,
			isAtBottom,
		});

	const innerRef = useMergedRefs(
		dateScrollInnerRef,
		innerBoxRef,
		restoreScrollPositionInnerRef,
		isAtBottomInnerRef,
		newMessagesScrollRef,
		leaderBannerInnerRef,
		unreadBarInnerRef,
		getMoreInnerRef,

		messageListRef,
	);

	const wrapperBoxRefs = useMergedRefs(unreadBarWrapperRef);

	const handleNavigateToPreviousMessage = useCallback((): void => {
		chat.messageEditing.toPreviousMessage();
	}, [chat.messageEditing]);

	const handleNavigateToNextMessage = useCallback((): void => {
		chat.messageEditing.toNextMessage();
	}, [chat.messageEditing]);

	const handleCloseFlexTab: MouseEventHandler<HTMLElement> = useCallback(
		(e): void => {
			/*
			 * check if the element is a button or anchor
			 * it considers the role as well
			 * usually, the flex tab is closed when clicking outside of it
			 * but if the user clicks on a button or anchor, we don't want to close the flex tab
			 * because the user could be actually trying to open the flex tab through those elements
			 */

			const checkElement = (element: HTMLElement | null): boolean => {
				if (!element) {
					return false;
				}
				if (element instanceof HTMLButtonElement || element.getAttribute('role') === 'button') {
					return true;
				}
				if (element instanceof HTMLAnchorElement || element.getAttribute('role') === 'link') {
					return true;
				}
				return checkElement(element.parentElement);
			};

			if (checkElement(e.target as HTMLElement)) {
				return;
			}

			toolbox.closeTab();
		},
		[toolbox],
	);

	useGoToHomeOnRemoved(room, user?._id);
	useReadMessageWindowEvents();
	useQuoteMessageByUrl();

	const { data: roomLeader } = useReactiveQuery(['rooms', room._id, 'leader', { not: user?._id }], () => {
		const leaderRoomRole = RoomRoles.findOne({
			'rid': room._id,
			'roles': 'leader',
			'u._id': { $ne: user?._id },
		});

		if (!leaderRoomRole) {
			return null;
		}

		return {
			...leaderRoomRole.u,
			name: useRealName ? leaderRoomRole.u.name || leaderRoomRole.u.username : leaderRoomRole.u.username,
		};
	});

	const wrapperStyle = css`
		position: absolute;
		width: 100%;
		z-index: 10;
		top: 0px;

		&.animated-hidden {
			top: -44px;
		}
	`;

	return (
		<>
			<Box position='relative' w='full'>
				<Box animated className={[wrapperStyle, hideLeaderHeader && 'animated-hidden'].filter(isTruthy)} ref={leaderBannerWrapperRef}>
					{(room.topic || roomLeader) && (
						<HeaderSection className='rcx-header-section'>
							<HeaderContentRow>
								<HeaderSubtitle is='h2' flexGrow={1}>
									<MarkdownText parseEmoji={true} variant='inlineWithoutBreaks' withTruncatedText content={room.topic} />
								</HeaderSubtitle>
								{roomLeader && <RoomLeader {...roomLeader} />}
							</HeaderContentRow>
						</HeaderSection>
					)}
				</Box>
			</Box>
			{!isLayoutEmbedded && room.announcement && <Announcement announcement={room.announcement} announcementDetails={undefined} />}

			<Box key={room._id} className={['main-content-flex', listStyle]}>
				<section
					role='presentation'
					className={`messages-container flex-tab-main-content ${admin ? 'admin' : ''}`}
					id={`chat-window-${room._id}`}
					onClick={hideFlexTab && handleCloseFlexTab}
				>
					<div className='messages-container-wrapper'>
						<div className='messages-container-main' ref={wrapperBoxRefs} {...fileUploadTriggerProps}>
							<DropTargetOverlay {...fileUploadOverlayProps} />
							<Box position='absolute' w='full' zIndex={12}>
								<div className={['container-bars', uploads.length && 'show'].filter(isTruthy).join(' ')}>
									{uploads.map((upload) => (
										<UploadProgressIndicator
											key={upload.id}
											id={upload.id}
											name={upload.name}
											percentage={upload.percentage}
											error={upload.error instanceof Error ? upload.error.message : undefined}
											onClose={handleUploadProgressClose}
										/>
									))}
								</div>
								{Boolean(unread) && (
									<UnreadMessagesIndicator
										count={unread}
										onJumpButtonClick={handleUnreadBarJumpToButtonClick}
										onMarkAsReadButtonClick={handleMarkAsReadButtonClick}
									/>
								)}

								<BubbleDate ref={bubbleRef} {...bubbleDate} />
							</Box>

							<div className={['messages-box'].filter(isTruthy).join(' ')}>
								<JumpToRecentMessageButton visible={hasNewMessages} onClick={handleNewMessageButtonClick} text={t('New_messages')} />
								<JumpToRecentMessageButton
									visible={hasMoreNextMessages}
									onClick={handleJumpToRecentButtonClick}
									text={t('Jump_to_recent_messages')}
								/>
								{!canPreview ? (
									<div className='content room-not-found error-color'>
										<div>{t('You_must_join_to_view_messages_in_this_channel')}</div>
									</div>
								) : null}
								<div
									className={[
										'wrapper',
										hasMoreNextMessages && 'has-more-next',
										hideUsernames && 'hide-usernames',
										!displayAvatars && 'hide-avatar',
									]
										.filter(isTruthy)
										.join(' ')}
								>
									<MessageListErrorBoundary>
										<CustomScrollbars ref={innerRef}>
											<ul className='messages-list' aria-label={t('Message_list')} aria-busy={isLoadingMoreMessages}>
												{canPreview ? (
													<>
														{hasMorePreviousMessages ? (
															<li className='load-more'>{isLoadingMoreMessages ? <LoadingMessagesIndicator /> : null}</li>
														) : (
															<li className='start color-info-font-color'>
																{retentionPolicy ? <RetentionPolicyWarning {...retentionPolicy} /> : null}
																<RoomForeword user={user} room={room} />
															</li>
														)}
													</>
												) : null}
												<MessageList rid={room._id} messageListRef={innerBoxRef} />
												{hasMoreNextMessages ? (
													<li className='load-more'>{isLoadingMoreMessages ? <LoadingMessagesIndicator /> : null}</li>
												) : null}
											</ul>
										</CustomScrollbars>
									</MessageListErrorBoundary>
								</div>
							</div>
							<RoomComposer>
								<ComposerContainer
									subscription={subscription}
									onResize={handleComposerResize}
									onNavigateToPreviousMessage={handleNavigateToPreviousMessage}
									onNavigateToNextMessage={handleNavigateToNextMessage}
									onUploadFiles={handleUploadFiles}
									// TODO: send previewUrls param
									// previewUrls={}
								/>
							</RoomComposer>
						</div>
					</div>
				</section>
			</Box>
		</>
	);
};

export default memo(RoomBody);
