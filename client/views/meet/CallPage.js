import { Box, Flex } from '@rocket.chat/fuselage';
import React, { useEffect, useState } from 'react';

import { Notifications } from '../../../app/notifications/client';
import { WebRTC } from '../../../app/webrtc/client';
import { WEB_RTC_EVENTS } from '../../../app/webrtc/index';
import { useTranslation } from '../../contexts/TranslationContext';

function CallPage({ roomId, visitorToken, visitorId, status, setStatus }) {
	const [isAgentActive, setIsAgentActive] = useState(false);
	const t = useTranslation();
	useEffect(() => {
		if (visitorToken) {
			const webrtcInstance = WebRTC.getInstanceByRoomId(roomId, visitorId);
			Notifications.onUser(
				WEB_RTC_EVENTS.WEB_RTC,
				(type, data) => {
					if (data.room == null) {
						return;
					}
					webrtcInstance.onUserStream(type, data);
				},
				visitorId,
			);
			Notifications.onRoom(roomId, 'webrtc', (type, data) => {
				if (type === 'callStatus' && data.callStatus === 'ended') {
					webrtcInstance.stop();
					setStatus(data.callStatus);
				}
			});
			Notifications.notifyRoom(roomId, 'webrtc', 'callStatus', { callStatus: 'inProgress' });
		} else if (!isAgentActive) {
			const webrtcInstance = WebRTC.getInstanceByRoomId(roomId);
			if (status === 'inProgress') {
				webrtcInstance.startCall({
					audio: true,
					video: {
						width: { ideal: 1920 },
						height: { ideal: 1080 },
					},
				});
			}
			Notifications.onRoom(roomId, 'webrtc', (type, data) => {
				if (type === 'callStatus') {
					switch (data.callStatus) {
						case 'ended':
							webrtcInstance.stop();
							break;
						case 'inProgress':
							webrtcInstance.startCall({
								audio: true,
								video: {
									width: { ideal: 1920 },
									height: { ideal: 1080 },
								},
							});
					}
					setStatus(data.callStatus);
				}
			});
			setIsAgentActive(true);
		}
	}, [isAgentActive, status, setStatus, visitorId, roomId, visitorToken]);

	switch (status) {
		case 'ringing':
			// Todo Deepak
			return (
				<h1 style={{ color: 'white', textAlign: 'center', marginTop: 250 }}>
					Waiting for the visitor to join ...
				</h1>
			);
		case 'declined':
			return (
				<Box
					minHeight='90%'
					display='flex'
					justifyContent='center'
					alignItems='center'
					color='white'
					fontSize='s1'
				>
					{t('Call_declined')}
				</Box>
			);
		case 'inProgress':
			return (
				<Flex.Container direction='column' justifyContent='center'>
					<Box
						width='full'
						minHeight='sh'
						textAlign='center'
						backgroundColor='neutral-900'
						overflow='hidden'
						position='relative'
					>
						<Box
							position='absolute'
							zIndex='1'
							style={{
								top: '5%',
								right: '2%',
							}}
							w='x200'
						>
							<video
								id='localVideo'
								autoPlay
								playsInline
								muted
								style={{
									width: '100%',
									transform: 'scaleX(-1)',
								}}
							></video>
						</Box>
						<video
							id='remoteVideo'
							autoPlay
							playsInline
							muted
							style={{
								width: '100%',
								transform: 'scaleX(-1)',
							}}
						></video>
					</Box>
				</Flex.Container>
			);
	}
}

export default CallPage;
