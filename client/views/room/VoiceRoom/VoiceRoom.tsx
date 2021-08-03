import { Box, Button, ButtonGroup, Icon } from '@rocket.chat/fuselage';
import { useMutableCallback } from '@rocket.chat/fuselage-hooks';
import React, { FC, ReactElement, useEffect } from 'react';

import VoiceRoomManager, {
	isMediasoupState,
	isWsState,
	useMediasoupPeers,
	useVoiceChannel,
	useWsPeers,
	useVoiceChannelMic,
	useVoiceChannelDeafen,
} from '../../../../app/voice-channel/client/VoiceChannelManager';
import { IRoom } from '../../../../definition/IRoom';
import GenericModal from '../../../components/GenericModal';
import { useSetModal } from '../../../contexts/ModalContext';
import { useTranslation } from '../../../contexts/TranslationContext';
import { useUserRoom } from '../../../contexts/UserContext';
import VoicePeersList from './VoicePeersList';

interface IVoiceRoom {
	room: IRoom;
	rid: string;
}

const VoiceRoom: FC<IVoiceRoom> = ({ rid }): ReactElement => {
	const state = useVoiceChannel();
	const mediasoupPeers = useMediasoupPeers();
	const wsPeers = useWsPeers();
	const muted = useVoiceChannelMic();
	const deafen = useVoiceChannelDeafen();
	const room = useUserRoom(rid);

	const setModal = useSetModal();
	const t = useTranslation();

	const closeModal = useMutableCallback(() => setModal(null));

	const toggleMic = (): void => {
		VoiceRoomManager.toggleMic();
	};

	const toggleDeafen = (): void => VoiceRoomManager.toggleDeafen();

	const join = (): void => VoiceRoomManager.joinRoom(rid);

	const connectVoiceRoom = (): void => {
		if (room) {
			VoiceRoomManager.connect(rid, room);
		}
	};

	const handleDisconnect = (): void => {
		VoiceRoomManager.disconnect();
		connectVoiceRoom();
	};

	const handleModalConfirm = async (): Promise<void> => {
		handleDisconnect();
		// @TODO: set correct timer OR move to await
		setTimeout(() => join(), 500);
		closeModal();
	};

	const handleJoin = (): void => {
		if (isMediasoupState(state)) {
			setModal(
				<GenericModal
					variant='warning'
					children={t('You_will_be_disconnected_from_channel', {
						roomName: state.mediasoupClient.roomName,
					})}
					confirmText={t('Disconnect')}
					cancelText={t('Cancel')}
					onClose={closeModal}
					onCancel={closeModal}
					onConfirm={handleModalConfirm}
				/>,
			);
			return;
		}

		join();
	};

	useEffect(() => {
		connectVoiceRoom();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [rid]);

	return (
		<Box display='flex' flexDirection='column' height='full' justifyContent='space-between'>
			{(isWsState(state) ||
				((isWsState(state) || isMediasoupState(state)) && state.rid !== rid)) && (
				<VoicePeersList peers={wsPeers} deafen={deafen} />
			)}

			{isMediasoupState(state) && state.rid === rid && (
				<Box display={state.rid !== rid ? 'none' : 'block'}>
					<VoicePeersList peers={mediasoupPeers} deafen={deafen} />
				</Box>
			)}

			<Box display='flex' justifyContent='center' alignItems='center' pb='x24'>
				{isMediasoupState(state) && state.rid === rid ? (
					<ButtonGroup>
						<Button square onClick={toggleMic}>
							{muted ? <Icon name='mic-off' size='x24' /> : <Icon name='mic' size='x24' />}
						</Button>
						<Button primary danger square onClick={handleDisconnect}>
							<Icon name='phone-off' size='x24' />
						</Button>
						<Button square onClick={toggleDeafen}>
							{deafen ? (
								<Icon name='headphone-off' size='x24' />
							) : (
								<Icon name='headphone' size='x24' />
							)}
						</Button>
					</ButtonGroup>
				) : (
					<Button primary success square onClick={handleJoin}>
						<Icon name='phone' size='x24' />
					</Button>
				)}
			</Box>
		</Box>
	);
};

export default VoiceRoom;
