import { css } from '@rocket.chat/css-in-js';
import { Box, Palette } from '@rocket.chat/fuselage';
import type { ComponentProps, ReactElement, Ref } from 'react';
import { forwardRef } from 'react';

const messageComposerInputStyle = css`
	resize: none;

	&::placeholder {
		color: ${Palette.text['font-annotation']};
	}
`;

type MessageComposerInputProps = ComponentProps<typeof Box>;

const MessageComposerInput = forwardRef(function MessageComposerInput(
	props: MessageComposerInputProps,
	ref: Ref<HTMLInputElement>,
): ReactElement {
	return (
		<Box is='label' width='full' fontSize={0}>
			<Box
				className={[messageComposerInputStyle, 'rc-message-box__textarea js-input-message']}
				{...props}
				color='default'
				width='full'
				minHeight='20px'
				maxHeight='155px'
				rows={1}
				fontScale='p2'
				ref={ref}
				mb={5}
				borderWidth={0}
			/>
		</Box>
	);
});

export default MessageComposerInput;
