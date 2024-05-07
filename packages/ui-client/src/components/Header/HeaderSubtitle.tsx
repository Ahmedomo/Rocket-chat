import { Box } from '@rocket.chat/fuselage';
import type { FC, ComponentProps } from 'react';

const HeaderSubtitle: FC<ComponentProps<typeof Box>> = (props) => (
	<Box color='hint' fontScale='p2' pb='x4' flexGrow={1} withTruncatedText {...props} />
);

export default HeaderSubtitle;
