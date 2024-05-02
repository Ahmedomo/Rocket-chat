import type { ReactNode } from 'react';
import React from 'react';

type NavbarActionProps = JSX.IntrinsicElements['li'] & {
	children?: ReactNode;
};

export const NavbarAction = ({ children, ...props }: NavbarActionProps) => {
	return (
		<li style={{ position: 'relative' }} role='menuitem' {...props}>
			{children}
		</li>
	);
};
