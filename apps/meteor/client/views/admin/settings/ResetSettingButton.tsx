import { IconButton } from '@rocket.chat/fuselage';
import { useTranslation } from '@rocket.chat/ui-contexts';
import type { ComponentProps } from 'react';
import React from 'react';

type ResetSettingButtonProps = Omit<ComponentProps<typeof IconButton>, 'icon'>;

function ResetSettingButton(props: ResetSettingButtonProps) {
	const t = useTranslation();

	return <IconButton icon='undo' danger small title={t('Reset')} {...props} />;
}

export default ResetSettingButton;
