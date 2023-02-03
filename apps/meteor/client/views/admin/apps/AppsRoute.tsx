import { useRouteParameter, useRoute, usePermission } from '@rocket.chat/ui-contexts';
import type { ReactElement } from 'react';
import React, { useState, useEffect } from 'react';

import PageSkeleton from '../../../components/PageSkeleton';
import NotAuthorizedPage from '../../notAuthorized/NotAuthorizedPage';
import AppDetailsPage from './AppDetailsPage';
import AppInstallPage from './AppInstallPage';
import AppsPage from './AppsPage/AppsPage';
import AppsProvider from './AppsProvider';

const AppsRoute = (): ReactElement => {
	const [isLoading, setLoading] = useState(true);
	const canManageApps = usePermission('manage-apps');
	const marketplaceRoute = useRoute('admin-marketplace');

	const context = useRouteParameter('context');
	const id = useRouteParameter('id');
	const page = useRouteParameter('page');

	const isMarketplace = !context;

	useEffect(() => {
		let mounted = true;

		if (!context) {
			marketplaceRoute.replace({ context: 'all', page: 'list' });
		}

		const initialize = async (): Promise<void> => {
			if (!canManageApps) {
				return;
			}

			if (!mounted) {
				return;
			}

			setLoading(false);
		};

		initialize();

		return (): void => {
			mounted = false;
		};
	}, [canManageApps, marketplaceRoute, context]);

	if (!canManageApps) {
		return <NotAuthorizedPage />;
	}

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
