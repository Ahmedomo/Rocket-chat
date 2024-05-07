import { Box, Button, Icon, Palette } from '@rocket.chat/fuselage';
import type { TranslationKey } from '@rocket.chat/ui-contexts';
import { useTranslation } from '@rocket.chat/ui-contexts';
import type { ComponentProps } from 'react';
import { forwardRef } from 'react';

type MultiSelectCustomAnchorProps = {
	onClick?: (value: boolean) => void;
	defaultTitle: TranslationKey;
	selectedOptionsTitle: TranslationKey;
	selectedOptionsCount: number;
	maxCount: number;
} & ComponentProps<typeof Button>;

const MultiSelectCustomAnchor = forwardRef<HTMLElement, MultiSelectCustomAnchorProps>(function MultiSelectCustomAnchor(
	{ onClick, selectedOptionsCount, selectedOptionsTitle, defaultTitle, maxCount, ...props },
	ref,
) {
	const t = useTranslation();

	const isDirty = selectedOptionsCount > 0 && selectedOptionsCount !== maxCount - 1;

	return (
		<Box
			is='button'
			ref={ref}
			onClick={onClick}
			display='flex'
			justifyContent='space-between'
			alignItems='center'
			flexDirection='row'
			borderColor={Palette.stroke['stroke-light'].toString()}
			borderWidth='x1'
			borderRadius={4}
			bg={Palette.surface['surface-light'].toString()}
			h='x40'
			w='full'
			pb={10}
			pi={16}
			color={isDirty ? Palette.text['font-default'].toString() : Palette.text['font-annotation'].toString()}
			rcx-input-box
			{...props}
		>
			{isDirty ? `${t(selectedOptionsTitle)} (${selectedOptionsCount})` : t(defaultTitle)}
			<Icon name='chevron-down' fontSize='x20' color='hint' />
		</Box>
	);
});

export default MultiSelectCustomAnchor;
