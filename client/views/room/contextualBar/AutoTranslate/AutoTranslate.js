import { FieldGroup, Field, ToggleSwitch, Select } from '@rocket.chat/fuselage';
import { useMutableCallback } from '@rocket.chat/fuselage-hooks';
import React, { useMemo, useEffect, useState, memo } from 'react';

import VerticalBar from '../../../../components/VerticalBar';
import { useLanguage, useTranslation } from '../../../../contexts/TranslationContext';
import { useUserSubscription } from '../../../../contexts/UserContext';
import { useEndpointActionExperimental } from '../../../../hooks/useEndpointAction';
import { useEndpointData } from '../../../../hooks/useEndpointData';
import { useTabBarClose } from '../../providers/ToolboxProvider';

export const AutoTranslate = ({
	language,
	languages,
	handleSwitch,
	translateEnable,
	handleChangeLanguage,
	handleClose,
}) => {
	const t = useTranslation();

	return (
		<>
			<VerticalBar.Header>
				<VerticalBar.Icon name='language' />
				<VerticalBar.Text>{t('Auto_Translate')}</VerticalBar.Text>
				{handleClose && <VerticalBar.Close onClick={handleClose} />}
			</VerticalBar.Header>
			<VerticalBar.Content>
				<FieldGroup>
					<Field.Label htmlFor='automatic-translation'>{t('Automatic_Translation')}</Field.Label>
					<Field.Row>
						<ToggleSwitch
							id='automatic-translation'
							onChange={handleSwitch}
							defaultChecked={translateEnable}
						/>
					</Field.Row>

					<Field.Label htmlFor='language'>{t('Language')}</Field.Label>
					<Field.Row verticalAlign='middle'>
						<Select
							id='language'
							value={language}
							disabled={!translateEnable}
							onChange={handleChangeLanguage}
							options={languages}
						/>
					</Field.Row>
				</FieldGroup>
			</VerticalBar.Content>
		</>
	);
};

export default memo(({ rid }) => {
	const close = useTabBarClose();
	const userLanguage = useLanguage();
	const subscription = useUserSubscription(rid);

	const { value: data } = useEndpointData(
		'autotranslate.getSupportedLanguages',
		useMemo(() => ({ targetLanguage: userLanguage }), [userLanguage]),
	);

	const [currentLanguage, setCurrentLanguage] = useState(subscription.autoTranslateLanguage);

	const saveSettings = useEndpointActionExperimental('POST', 'autotranslate.saveSettings');

	const handleChangeLanguage = useMutableCallback((value) => {
		setCurrentLanguage(value);

		saveSettings({
			roomId: rid,
			field: 'autoTranslateLanguage',
			value,
		});
	});

	const handleSwitch = useMutableCallback((event) => {
		saveSettings({
			roomId: rid,
			field: 'autoTranslate',
			value: event.target.checked,
		});
	});

	useEffect(() => {
		if (!subscription.autoTranslate) {
			return;
		}

		if (!subscription.autoTranslateLanguage) {
			handleChangeLanguage(userLanguage);
		}
	}, [
		subscription.autoTranslate,
		subscription.autoTranslateLanguage,
		handleChangeLanguage,
		userLanguage,
	]);

	return (
		<AutoTranslate
			language={currentLanguage}
			languages={data ? data.languages.map((value) => [value.language, value.name]) : []}
			handleSwitch={handleSwitch}
			handleChangeLanguage={handleChangeLanguage}
			translateEnable={!!subscription.autoTranslate}
			handleClose={close}
		/>
	);
});
