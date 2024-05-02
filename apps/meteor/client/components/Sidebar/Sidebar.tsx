import { Sidebar as FuselageSidebar } from '@rocket.chat/fuselage';
import type { ComponentProps } from 'react';
import React from 'react';

type SidebarProps = ComponentProps<typeof FuselageSidebar>;

const Sidebar = ({ children, ...props }: SidebarProps) => (
	<FuselageSidebar {...props} role='navigation' display='flex' flexDirection='column' h='full' children={children} />
);

export default Sidebar;
