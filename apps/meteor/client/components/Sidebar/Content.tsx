import { Box } from '@rocket.chat/fuselage';
import type { ComponentProps } from 'react';
import React from 'react';

import { CustomScrollbars } from '../CustomScrollbars';

type ContentProps = ComponentProps<typeof CustomScrollbars>;

const Content = ({ children, ...props }: ContentProps) => (
	<Box display='flex' flexDirection='column' flexGrow={1} flexShrink={1} overflow='hidden'>
		<CustomScrollbars {...props}>
			<Box display='flex' flexDirection='column' w='full' h='full'>
				{children}
			</Box>
		</CustomScrollbars>
	</Box>
);

export default Content;
