import { Box, Skeleton } from '@rocket.chat/fuselage';
import { useMethod, useTranslation } from '@rocket.chat/ui-contexts';
import { useQuery } from '@tanstack/react-query';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';

import CounterSet from '../../../components/dataView/CounterSet';

const useOverviewData = (): [eventCount: ReactNode, userCount: ReactNode, serverCount: ReactNode] => {
	const getFederationOverviewData = useMethod('federation:getOverviewData');

	const result = useQuery(['admin/federation-dashboard/overview'], async () => getFederationOverviewData(), {
		refetchInterval: 10_000,
	});

	if (result.isLoading) {
		return [<Skeleton key={0} variant='text' />, <Skeleton key={1} variant='text' />, <Skeleton key={2} variant='text' />];
	}

	if (result.isError) {
		return [
			<Box key={0} color='status-font-on-danger'>
				Error
			</Box>,
			<Box key={1} color='status-font-on-danger'>
				Error
			</Box>,
			<Box key={2} color='status-font-on-danger'>
				Error
			</Box>,
		];
	}

	const { data } = result.data;

	return [data[0].value, data[1].value, data[2].value];
};

function OverviewSection(): ReactElement {
	const t = useTranslation();

	const [eventCount, userCount, serverCount] = useOverviewData();

	return (
		<CounterSet
			counters={[
				{
					count: eventCount,
					description: t('Number_of_events'),
				},
				{
					count: userCount,
					description: t('Number_of_federated_users'),
				},
				{
					count: serverCount,
					description: t('Number_of_federated_servers'),
				},
			]}
		/>
	);
}

export default OverviewSection;
