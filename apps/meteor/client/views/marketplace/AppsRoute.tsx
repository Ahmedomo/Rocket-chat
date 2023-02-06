import { useRouteParameter, useRoute } from '@rocket.chat/ui-contexts';
import type { ReactElement } from 'react';
import React, { useState, useEffect } from 'react';

import PageSkeleton from '../../components/PageSkeleton';
import AppDetailsPage from './AppDetailsPage';
import AppInstallPage from './AppInstallPage';
import AppsPage from './AppsPage/AppsPage';
import AppsProvider from './AppsProvider';

const AppsRoute = (): ReactElement => {
	const [isLoading, setLoading] = useState(true);
	const marketplaceRoute = useRoute('marketplace');

	const context = useRouteParameter('context');
	const id = useRouteParameter('id');
	const page = useRouteParameter('page');

	const isMarketplace = context === 'explore';

	useEffect(() => {
		let mounted = true;

		const initialize = async (): Promise<void> => {
			if (!mounted) {
				return;
			}

			setLoading(false);
		};

		initialize();

		return (): void => {
			mounted = false;
		};
	}, [marketplaceRoute, context]);

	if (isLoading) {
		return <PageSkeleton />;
	}

	return (
		<AppsProvider>
			{(page === 'list' && <AppsPage isMarketplace={isMarketplace} />) ||
				(id && page === 'info' && <AppDetailsPage id={id} />) ||
				(page === 'install' && <AppInstallPage />)}
		</AppsProvider>
	);
};

export default AppsRoute;
