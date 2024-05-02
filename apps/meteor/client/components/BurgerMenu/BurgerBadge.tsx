import { css } from '@rocket.chat/css-in-js';
import { Box, Badge } from '@rocket.chat/fuselage';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';

type BurgerBadgeProps = { children?: ReactNode };

const BurgerBadge = ({ children }: BurgerBadgeProps): ReactElement => (
	<Box
		className={css`
			position: absolute;
			z-index: 3;
			top: -5px;
			right: -5px;
		`}
	>
		<Badge variant='danger' children={children} />
	</Box>
);

export default BurgerBadge;
