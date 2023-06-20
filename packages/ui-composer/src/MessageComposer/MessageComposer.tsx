import { Box } from '@rocket.chat/fuselage';
import type { HTMLAttributes, ReactElement, ReactNode } from 'react';
import { forwardRef } from 'react';

type MessageComposerProps = Omit<HTMLAttributes<HTMLElement>, 'is'> & {
	children: ReactNode;
	is?: React.ElementType<any>;
	variant?: 'default' | 'error' | 'editing';
};

const MessageComposer = forwardRef<HTMLElement, MessageComposerProps>(function MessageComposer({ variant, ...props }, ref): ReactElement {
	return (
		<Box
			rcx-input-box__wrapper
			bg={variant === 'editing' ? 'status-background-warning-2' : undefined}
			ref={ref}
			role='group'
			display='flex'
			flexDirection='column'
			overflow='hidden'
			p={0}
			{...props}
		/>
	);
});

export default MessageComposer;
