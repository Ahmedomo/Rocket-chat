import { css } from '@rocket.chat/css-in-js';
import { Box } from '@rocket.chat/fuselage';
import type { ReactNode, ReactElement } from 'react';

const backdropStyle = css`
	position: fixed;
	top: 0;
	right: 0;
	min-width: 276px;
`;

const VideoConfPopupBackdrop = ({ children }: { children: ReactNode }): ReactElement => (
	<Box m='x40' className={backdropStyle}>
		{children}
	</Box>
);

export default VideoConfPopupBackdrop;
