import { useMutableCallback } from '@rocket.chat/fuselage-hooks';
import React, { useEffect, useMemo, useCallback, useState } from 'react';

import { OTR as ORTInstance } from '../../../../../app/otr/client/rocketchat.otr';
import { useSetModal } from '../../../../contexts/ModalContext';
import { usePresence } from '../../../../hooks/usePresence';
import { useReactiveValue } from '../../../../hooks/useReactiveValue';
import OTR from './OTR';
import OTRModal from './OTRModal';

const OTRWithData = ({ rid, tabBar }) => {
	const onClickClose = useMutableCallback(() => tabBar && tabBar.close());

	const setModal = useSetModal();
	const closeModal = useMutableCallback(() => setModal());
	const otr = useMemo(() => ORTInstance.getInstanceByRoomId(rid), [rid]);
    
    const [timedOut, setTimedOut] = useState(false);

	const [isEstablished, isEstablishing] = useReactiveValue(
		useCallback(() => (otr ? [otr.established.get(), otr.establishing.get()] : [false, false]), [otr]),
	);

	const declined = useReactiveValue(
		useCallback(() => (otr ? otr.declined.get() : false), [otr]),
	);

	useEffect(() => {
		console.log("toggle decline = ", declined);
	}, [declined]);

	const userStatus = usePresence(otr.peerId)?.status;

	const isOnline = !['offline', 'loading'].includes(userStatus);

	const handleStart = () => {
		otr.handshake();
	};

	const handleEnd = () => otr?.end();

	const handleReset = () => {
		otr.reset();
		otr.handshake(true);
	};

	useEffect(() => {
		if (isEstablished) {
			return closeModal();
		}

		if (!isEstablishing) {
			return;
		}

		const timeout = setTimeout(() => {
            setTimedOut(true);
			otr.establishing.set(false);
            console.log(isTimedOut)
			setModal(<OTRModal onConfirm={closeModal} onCancel={closeModal} />);
		}, 10000);

		return () => clearTimeout(timeout);
	}, [closeModal, isEstablished, isEstablishing, setModal, otr, setTimedOut]);

	return (
		<OTR
			isOnline={isOnline}
			isDeclined={declined}
			isEstablishing={isEstablishing}
			isEstablished={isEstablished}
            isTimedOut={timedOut}
			onClickClose={onClickClose}
			onClickStart={handleStart}
			onClickEnd={handleEnd}
			onClickRefresh={handleReset}
			OTR={otr}
		/>
	);
};

export default OTRWithData;
