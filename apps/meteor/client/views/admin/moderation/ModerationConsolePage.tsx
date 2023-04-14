import { useTranslation, useRouteParameter, useToastMessageDispatch } from '@rocket.chat/ui-contexts';
import React, { useRef } from 'react';

import { MessageAction } from '../../../../app/ui-utils/client';
import Page from '../../../components/Page';
import VerticalBar from '../../../components/VerticalBar';
import MessageReportInfo from './MessageReportInfo';
import ModerationConsoleTable from './ModerationConsoleTable';
import UserMessages from './UserMessages';

const ModerationConsolePage = () => {
	const t = useTranslation();
	const context = useRouteParameter('context');
	const id = useRouteParameter('id');
	const dispatchToastMessage = useToastMessageDispatch();

	const reloadRef = useRef(() => null);

	const handleReload = (): void => {
		reloadRef.current();
	};

	const handleRedirect = async (mid: string) => {
		try {
			const permalink = await MessageAction.getPermaLink(mid);
			window.open(permalink, '_blank', 'noreferrer,noopener');
		} catch (error) {
			dispatchToastMessage({ type: 'error', message: error });
		}
	};

	return (
		<Page flexDirection='row'>
			<Page>
				<Page.Header title={t('Moderation_Console')} />
				<Page.Content>
					<ModerationConsoleTable reload={reloadRef} onReload={handleReload} />
				</Page.Content>
			</Page>
			{context && (
				<VerticalBar>
					{context === 'info' && id && <UserMessages userId={id} reload={reloadRef.current} onRedirect={handleRedirect} />}
					{context === 'reports' && id && <MessageReportInfo msgId={id} />}
				</VerticalBar>
			)}
		</Page>
	);
};

export default ModerationConsolePage;
