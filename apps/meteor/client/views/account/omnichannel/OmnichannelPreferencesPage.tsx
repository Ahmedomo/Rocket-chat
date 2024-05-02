import { ButtonGroup, Button, Box, Accordion } from '@rocket.chat/fuselage';
import { useToastMessageDispatch, useTranslation, useEndpoint, useUserPreference } from '@rocket.chat/ui-contexts';
import type { ReactElement } from 'react';
import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';

import { Page, PageHeader, PageScrollableContentWithShadow, PageFooter } from '../../../components/Page';
import PreferencesConversationTranscript from './PreferencesConversationTranscript';
import { PreferencesGeneral } from './PreferencesGeneral';

export type OmnichannelPreferencesPageFields = {
	omnichannelTranscriptPDF: boolean;
	omnichannelTranscriptEmail: boolean;
	omnichannelHideConversationAfterClosing: boolean;
};

const OmnichannelPreferencesPage = (): ReactElement => {
	const t = useTranslation();
	const dispatchToastMessage = useToastMessageDispatch();

	const omnichannelTranscriptPDF = useUserPreference<boolean>('omnichannelTranscriptPDF') ?? false;
	const omnichannelTranscriptEmail = useUserPreference<boolean>('omnichannelTranscriptEmail') ?? false;
	const omnichannelHideConversationAfterClosing = useUserPreference<boolean>('omnichannelHideConversationAfterClosing') ?? true;

	const form = useForm<OmnichannelPreferencesPageFields>({
		defaultValues: { omnichannelTranscriptPDF, omnichannelTranscriptEmail, omnichannelHideConversationAfterClosing },
	});

	const {
		handleSubmit,
		formState: { isDirty },
		reset,
	} = form;

	const saveFn = useEndpoint('POST', '/v1/users.setPreferences');

	const handleSave = async (data: OmnichannelPreferencesPageFields) => {
		try {
			await saveFn({ data });
			reset(data);
			dispatchToastMessage({ type: 'success', message: t('Preferences_saved') });
		} catch (error) {
			dispatchToastMessage({ type: 'error', message: error });
		}
	};

	return (
		<Page>
			<PageHeader title={t('Omnichannel')} />
			<PageScrollableContentWithShadow is='form' onSubmit={handleSubmit(handleSave)}>
				<Box maxWidth='x600' w='full' alignSelf='center'>
					<Accordion>
						<FormProvider {...form}>
							<PreferencesGeneral />
							<PreferencesConversationTranscript />
						</FormProvider>
					</Accordion>
				</Box>
			</PageScrollableContentWithShadow>
			<PageFooter isDirty={isDirty}>
				<ButtonGroup>
					<Button onClick={() => reset({ omnichannelTranscriptPDF, omnichannelTranscriptEmail })}>{t('Cancel')}</Button>
					<Button primary disabled={!isDirty} onClick={handleSubmit(handleSave)}>
						{t('Save_changes')}
					</Button>
				</ButtonGroup>
			</PageFooter>
		</Page>
	);
};

export default OmnichannelPreferencesPage;
