import { useRoute, useRouteParameter } from '@rocket.chat/ui-contexts';
import type { ReactElement, ReactNode } from 'react';
import React, { Suspense, useEffect } from 'react';

import { SideNav } from '../../../app/ui-utils/client';
import PageSkeleton from '../../components/PageSkeleton';

const MarketplaceRouter = ({ children }: { children?: ReactNode }): ReactElement => {
	const currentContext = useRouteParameter('context');
	const marketplaceRoute = useRoute('marketplace-all');

	useEffect(() => {
		if (!currentContext) {
			marketplaceRoute.replace({ context: 'explore', page: 'list' });
		}
	}, [currentContext, marketplaceRoute]);

	useEffect(() => {
		SideNav.setFlex('marketplaceFlex');
		SideNav.openFlex(() => undefined);
	}, []);

	return <>{children ? <Suspense fallback={<PageSkeleton />}>{children}</Suspense> : <PageSkeleton />}</>;
};

export default MarketplaceRouter;
