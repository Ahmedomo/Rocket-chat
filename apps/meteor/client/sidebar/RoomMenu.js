import { Option, Menu } from '@rocket.chat/fuselage';
import { useMutableCallback } from '@rocket.chat/fuselage-hooks';
import React, { memo, useMemo } from 'react';

import { RoomManager } from '../../app/ui-utils/client/lib/RoomManager';
import { UiTextContext } from '../../definition/IRoomTypeConfig';
import { GenericModalDoNotAskAgain } from '../components/GenericModal';
import { usePermission } from '../contexts/AuthorizationContext';
import { useSetModal } from '../contexts/ModalContext';
import { useRoute } from '../contexts/RouterContext';
import { useMethod, useEndpoint } from '../contexts/ServerContext';
import { useSetting } from '../contexts/SettingsContext';
import { useToastMessageDispatch } from '../contexts/ToastMessagesContext';
import { useTranslation } from '../contexts/TranslationContext';
import { useUserSubscription } from '../contexts/UserContext';
import { useDontAskAgain } from '../hooks/useDontAskAgain';
import { roomCoordinator } from '../lib/rooms/roomCoordinator';
import WarningModal from '../views/admin/apps/WarningModal';

const fields = {
	f: 1,
	t: 1,
	name: 1,
};

const RoomMenu = ({ rid, unread, threadUnread, alert, roomOpen, type, cl, name = '' }) => {
	const t = useTranslation();
	const dispatchToastMessage = useToastMessageDispatch();
	const setModal = useSetModal();

	const closeModal = useMutableCallback(() => setModal());

	const router = useRoute('home');

	const subscription = useUserSubscription(rid, fields);
	const canFavorite = useSetting('Favorite_Rooms');
	const isFavorite = (subscription != null ? subscription.f : undefined) != null && subscription.f;
	const getThreadsList = useEndpoint('GET', 'chat.getThreadsList');

	const dontAskHideRoom = useDontAskAgain('hideRoom');

	const hideRoom = useMethod('hideRoom');
	const readMessages = useMethod('readMessages');
	const unreadMessages = useMethod('unreadMessages');
	const toggleFavorite = useMethod('toggleFavorite');
	const leaveRoom = useMethod('leaveRoom');
	const readThreads = useMethod('readThreads');

	const isUnread = alert || unread || threadUnread;

	const canLeaveChannel = usePermission('leave-c');
	const canLeavePrivate = usePermission('leave-p');

	const canLeave = (() => {
		if (type === 'c' && !canLeaveChannel) {
			return false;
		}
		if (type === 'p' && !canLeavePrivate) {
			return false;
		}
		return !((cl != null && !cl) || ['d', 'l'].includes(type));
	})();

	const handleLeave = useMutableCallback(() => {
		const leave = async () => {
			try {
				await leaveRoom(rid);
				if (roomOpen) {
					router.push({});
				}
				RoomManager.close(rid);
			} catch (error) {
				dispatchToastMessage({ type: 'error', message: error });
			}
			closeModal();
		};

		const warnText = roomCoordinator.getRoomDirectives(type)?.getUiText(UiTextContext.LEAVE_WARNING);

		setModal(
			<WarningModal
				text={t(warnText, name)}
				confirmText={t('Leave_room')}
				close={closeModal}
				cancel={closeModal}
				cancelText={t('Cancel')}
				confirm={leave}
			/>,
		);
	});

	const handleHide = useMutableCallback(async () => {
		const hide = async () => {
			try {
				await hideRoom(rid);
			} catch (error) {
				dispatchToastMessage({ type: 'error', message: error });
			}
			closeModal();
		};

		const warnText = roomCoordinator.getRoomDirectives(type)?.getUiText(UiTextContext.HIDE_WARNING);

		if (dontAskHideRoom) {
			return hide();
		}

		setModal(
			<GenericModalDoNotAskAgain
				variant='danger'
				confirmText={t('Yes_hide_it')}
				cancelText={t('Cancel')}
				onClose={closeModal}
				onCancel={closeModal}
				onConfirm={hide}
				dontAskAgain={{
					action: 'hideRoom',
					label: t('Hide_room'),
				}}
			>
				{t(warnText, name)}
			</GenericModalDoNotAskAgain>,
		);
	});

	const handleToggleRead = useMutableCallback(async () => {
		try {
			if (isUnread) {
				await readMessages(rid);
				return;
			}
			await unreadMessages(null, rid);
			if (subscription == null) {
				return;
			}
			RoomManager.close(subscription.t + subscription.name);

			router.push({});
		} catch (error) {
			dispatchToastMessage({ type: 'error', message: error });
		}
	});

	const handleThreadsToBeRead = useMutableCallback(async () => {
		try {
			if (threadUnread) {
				const { threads } = await getThreadsList({
					rid,
					type: 'unread',
				});
				const promises = [];
				for (const thread of threads) {
					promises.push(readThreads(thread?._id));
				}
				await Promise.all(promises);
			}
		} catch (error) {
			dispatchToastMessage({ type: 'error', message: error });
		}
	});

	const handleToggleFavorite = useMutableCallback(async () => {
		try {
			await toggleFavorite(rid, !isFavorite);
		} catch (error) {
			dispatchToastMessage({ type: 'error', message: error });
		}
	});

	const menuOptions = useMemo(
		() => ({
			hideRoom: {
				label: { label: t('Hide'), icon: 'eye-off' },
				action: handleHide,
			},
			toggleRead: {
				label: { label: isUnread ? t('Mark_read') : t('Mark_unread'), icon: 'flag' },
				action: handleToggleRead,
			},
			...(threadUnread && {
				threadsToRead: {
					label: {
						label: t('Mark_threads_read'),
						icon: 'thread',
					},
					action: handleThreadsToBeRead,
				},
			}),
			...(canFavorite && {
				toggleFavorite: {
					label: {
						label: isFavorite ? t('Unfavorite') : t('Favorite'),
						icon: isFavorite ? 'star-filled' : 'star',
					},
					action: handleToggleFavorite,
				},
			}),
			...(canLeave && {
				leaveRoom: {
					label: { label: t('Leave_room'), icon: 'sign-out' },
					action: handleLeave,
				},
			}),
		}),
		[
			t,
			handleHide,
			isUnread,
			handleToggleRead,
			threadUnread,
			handleThreadsToBeRead,
			canFavorite,
			isFavorite,
			handleToggleFavorite,
			canLeave,
			handleLeave,
		],
	);

	return (
		<Menu
			rcx-sidebar-item__menu
			title={t('Options')}
			mini
			aria-keyshortcuts='alt'
			tabIndex={-1}
			options={menuOptions}
			renderItem={({ label: { label, icon }, ...props }) => <Option label={label} title={label} icon={icon} {...props} />}
		/>
	);
};

export default memo(RoomMenu);
