import { useSetModal, useUser } from '@rocket.chat/ui-contexts';
import React from 'react';

import EditStatusModal from '../EditStatusModal';

/**
 * @deprecated Moved to NavBar
 * @description duplicated in apps/meteor/client/NavBar/UserMenu/hooks/useCustomStatusModalHandler.tsx until feature is ready
 * @memberof newNavigation
 */
export const useCustomStatusModalHandler = () => {
	const user = useUser();
	const setModal = useSetModal();

	return () => {
		const handleModalClose = () => setModal(null);
		setModal(<EditStatusModal userStatus={user?.status} userStatusText={user?.statusText} onClose={handleModalClose} />);
	};
};
