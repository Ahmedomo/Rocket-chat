import { useMutableCallback } from '@rocket.chat/fuselage-hooks';
import { useTranslation } from '@rocket.chat/ui-contexts';
import React, { memo, ReactElement } from 'react';

import VerticalBar from '../../../../components/VerticalBar';
import { ToolboxContextValue } from '../../lib/Toolbox/ToolboxContext';
import KeyboardShortcutSection from './KeyboardShortcutSection';

const KeyboardShortcuts = ({ tabBar }: { tabBar: ToolboxContextValue['tabBar'] }): ReactElement => {
	const handleClose = useMutableCallback(() => tabBar?.close());
	const t = useTranslation();

	return (
		<>
			<VerticalBar.Header>
				<VerticalBar.Icon name='keyboard' />
				<VerticalBar.Text>{t('Keyboard_Shortcuts_Title')}</VerticalBar.Text>
				{handleClose && <VerticalBar.Close onClick={handleClose} />}
			</VerticalBar.Header>
			<VerticalBar.ScrollableContent>
				<KeyboardShortcutSection title={t('Keyboard_Shortcuts_Open_Channel_Slash_User_Search')} command={t('Keyboard_Shortcuts_Keys_1')} />
				<KeyboardShortcutSection title={t('Keyboard_Shortcuts_Mark_all_as_read')} command={t('Keyboard_Shortcuts_Keys_8')} />
				<KeyboardShortcutSection title={t('Keyboard_Shortcuts_Edit_Previous_Message')} command={t('Keyboard_Shortcuts_Keys_2')} />
				<KeyboardShortcutSection title={t('Keyboard_Shortcuts_Move_To_Beginning_Of_Message')} command={t('Keyboard_Shortcuts_Keys_3')} />
				<KeyboardShortcutSection title={t('Keyboard_Shortcuts_Move_To_Beginning_Of_Message')} command={t('Keyboard_Shortcuts_Keys_4')} />
				<KeyboardShortcutSection title={t('Keyboard_Shortcuts_Move_To_End_Of_Message')} command={t('Keyboard_Shortcuts_Keys_5')} />
				<KeyboardShortcutSection title={t('Keyboard_Shortcuts_Move_To_End_Of_Message')} command={t('Keyboard_Shortcuts_Keys_6')} />
				<KeyboardShortcutSection title={t('Keyboard_Shortcuts_New_Line_In_Message')} command={t('Keyboard_Shortcuts_Keys_7')} />
			</VerticalBar.ScrollableContent>
		</>
	);
};

export default memo(KeyboardShortcuts);
