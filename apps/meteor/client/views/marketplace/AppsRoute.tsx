import { useRouteParameter, useRoute, usePermission } from '@rocket.chat/ui-contexts';
import type { ReactElement } from 'react';
import React, { useState, useEffect } from 'react';

import PageSkeleton from '../../components/PageSkeleton';
import NotAuthorizedPage from '../notAuthorized/NotAuthorizedPage';
import AppDetailsPage from './AppDetailsPage';
import AppInstallPage from './AppInstallPage';
import AppsPage from './AppsPage';
import AppsProvider from './AppsProvider';
import BannerEnterpriseTrialEnded from './components/BannerEnterpriseTrialEnded';

const AppsRoute = (): ReactElement => {
	const [isLoading, setLoading] = useState(true);
	const marketplaceRoute = useRoute('marketplace');

	const context = useRouteParameter('context') || 'explore';
	const id = useRouteParameter('id');
	const page = useRouteParameter('page');

	const isAdminUser = usePermission('manage-apps');
	const hasAccessMarketplacePermission = usePermission('access-marketplace');

	if (!page) marketplaceRoute.push({ context, page: 'list' });

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

	if (!hasAccessMarketplacePermission) {
		return <NotAuthorizedPage />;
	}

	if ((context === 'requested' || page === 'install') && !isAdminUser) return <NotAuthorizedPage />;

	if (isLoading) {
		return <PageSkeleton />;
	}

	return (
		<AppsProvider>
			<BannerEnterpriseTrialEnded />
			{(page === 'list' && <AppsPage />) ||
				(id && page === 'info' && <AppDetailsPage id={id} />) ||
				(page === 'install' && <AppInstallPage />)}
		</AppsProvider>
	);
};

export default AppsRoute;
