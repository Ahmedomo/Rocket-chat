import type { Card } from '@rocket.chat/fuselage';
import { useTranslation, useRouter } from '@rocket.chat/ui-contexts';
import type { ComponentProps, ReactElement } from 'react';
import React from 'react';

import GenericCard from '../../../components/GenericCard';

const JoinRoomsCard = (props: ComponentProps<typeof Card>): ReactElement => {
	const t = useTranslation();

	const router = useRouter();
	const handleDirectory = (): void => {
		router.navigate('/directory');
	};

	return (
		<GenericCard
			title={t('Join_rooms')}
			body={t('Discover_public_channels_and_teams_in_the_workspace_directory')}
			buttons={[{ onClick: handleDirectory, label: t('Open_directory') }]}
			data-qa-id='homepage-join-rooms-card'
			{...props}
		/>
	);
};

export default JoinRoomsCard;
