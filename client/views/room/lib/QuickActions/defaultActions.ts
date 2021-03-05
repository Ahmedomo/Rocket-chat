// import { useMemo, lazy } from 'react';

// import { usePermission } from '../../../../contexts/AuthorizationContext';

import { addAction, QuickActionsEnum } from '.';


addAction('rocket-move-to-queue', {
	groups: ['channel'],
	id: QuickActionsEnum.MoveQueue,
	title: 'Move_queue',
	icon: 'burger-arrow-left',
	order: 1,
});

addAction('rocket-chat-forward', {
	groups: ['channel'],
	id: QuickActionsEnum.ChatForward,
	title: 'Forward_chat',
	icon: 'baloon-arrow-top-right',
	order: 2,
});

addAction('rocket-transcript', {
	groups: ['channel'],
	id: QuickActionsEnum.Transcript,
	title: 'Transcript',
	icon: 'mail-arrow-top-right',
	order: 3,
});

addAction('rocket-close-chat', {
	groups: ['channel'],
	id: QuickActionsEnum.CloseChat,
	title: 'Close',
	icon: 'baloon-close-top-right',
	order: 4,
	color: 'danger',
});

// addAction('user-info', {
// 	groups: ['direct'],
// 	id: 'user-info',
// 	title: 'User_Info',
// 	icon: 'user',
// 	template: lazy(() => import('../../MemberListRouter')),
// 	order: 5,
// });

// addAction('user-info-group', {
// 	groups: ['direct_multiple'],
// 	id: 'user-info-group',
// 	title: 'Members',
// 	icon: 'team',
// 	template: lazy(() => import('../../MemberListRouter')),
// 	order: 5,
// });

// addAction('members-list', ({ room }) => {
// 	const hasPermission = usePermission('view-broadcast-member-list', room._id);
// 	return useMemo(() => (!room.broadcast || hasPermission ? {
// 		groups: ['channel', 'group'],
// 		id: 'members-list',
// 		title: 'Members',
// 		icon: 'team',
// 		template: lazy(() => import('../../MemberListRouter')),
// 		order: 5,
// 	} : null), [hasPermission, room.broadcast]);
// });

// addAction('uploaded-files-list', {
// 	groups: ['channel', 'group', 'direct', 'direct_multiple', 'live'],
// 	id: 'uploaded-files-list',
// 	title: 'Files',
// 	icon: 'clip',
// 	template: lazy(() => import('../../contextualBar/RoomFiles')),
// 	order: 6,
// });

// addAction('keyboard-shortcut-list', {
// 	groups: ['channel', 'group', 'direct', 'direct_multiple'],
// 	id: 'keyboard-shortcut-list',
// 	title: 'Keyboard_Shortcuts_Title',
// 	icon: 'keyboard',
// 	template: lazy(() => import('../../contextualBar/KeyboardShortcuts')),
// 	order: 99,
// });
