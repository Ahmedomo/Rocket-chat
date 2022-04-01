import { MessageToolboxWrapper } from '@rocket.chat/fuselage';
import React, { FC, memo, useRef } from 'react';

import { IMessage } from '../../../../../../definition/IMessage';
import { useIsVisible } from '../../../hooks/useIsVisible';
import Toolbox from './Toolbox';

export const ToolboxWrapper: FC<{ message: IMessage }> = (props) => {
	const ref = useRef(null);

	const [isVisible] = useIsVisible(ref);

	return (
		<MessageToolboxWrapper ref={ref} data-type='message-action-menu-wrapper'>
			{isVisible && <Toolbox {...props} />}
		</MessageToolboxWrapper>
	);
};

export default memo(ToolboxWrapper);
