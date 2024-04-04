import type { IAdminUserTabs } from '@rocket.chat/core-typings';
import { Button, ButtonGroup, Callout, ContextualbarIcon, Icon, Tabs, TabsItem } from '@rocket.chat/fuselage';
import { useDebouncedValue } from '@rocket.chat/fuselage-hooks';
import type { OptionProp } from '@rocket.chat/ui-client';
import { usePermission, useRouteParameter, useTranslation, useRouter, useEndpoint } from '@rocket.chat/ui-contexts';
import { useQuery } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import UserPageHeaderContentWithSeatsCap from '../../../../ee/client/views/admin/users/UserPageHeaderContentWithSeatsCap';
import { useSeatsCap } from '../../../../ee/client/views/admin/users/useSeatsCap';
import {
	Contextualbar,
	ContextualbarHeader,
	ContextualbarTitle,
	ContextualbarClose,
	ContextualbarDialog,
} from '../../../components/Contextualbar';
import { usePagination } from '../../../components/GenericTable/hooks/usePagination';
import { useSort } from '../../../components/GenericTable/hooks/useSort';
import { Page, PageHeader, PageContent } from '../../../components/Page';
import { useShouldPreventAction } from '../../../hooks/useShouldPreventAction';
import AdminInviteUsers from './AdminInviteUsers';
import AdminUserCreated from './AdminUserCreated';
import AdminUserForm from './AdminUserForm';
import AdminUserFormWithData from './AdminUserFormWithData';
import AdminUserInfoWithData from './AdminUserInfoWithData';
import AdminUserUpgrade from './AdminUserUpgrade';
import UsersTable from './UsersTable';
import useFilteredUsers from './hooks/useFilteredUsers';
import usePendingUsersCount from './hooks/usePendingUsersCount';

export type UsersFilters = {
	text: string;
	roles: OptionProp[];
};

export type UsersTableSortingOptions = 'name' | 'username' | 'emails.address' | 'status' | 'active';

const AdminUsersPage = (): ReactElement => {
	const t = useTranslation();

	const seatsCap = useSeatsCap();

	const isSeatsCapExceeded = useMemo(() => !!seatsCap && seatsCap.activeUsers >= seatsCap.maxActiveUsers, [seatsCap]);

	const router = useRouter();
	const context = useRouteParameter('context');
	const id = useRouteParameter('id');

	const canCreateUser = usePermission('create-user');
	const canBulkCreateUser = usePermission('bulk-register-user');

	const isCreateUserDisabled = useShouldPreventAction('activeUsers');

	const getRoles = useEndpoint('GET', '/v1/roles.list');
	const { data, error } = useQuery(['roles'], async () => getRoles());

	const paginationData = usePagination();
	const sortData = useSort<UsersTableSortingOptions>('name');

	const [tab, setTab] = useState<IAdminUserTabs>('all');
	const [userFilters, setUserFilters] = useState<UsersFilters>({ text: '', roles: [] });

	const searchTerm = useDebouncedValue(userFilters.text, 500);
	const prevSearchTerm = useRef('');

	const filteredUsersQueryResult = useFilteredUsers({
		searchTerm,
		prevSearchTerm,
		sortData,
		paginationData,
		tab,
		selectedRoles: useMemo(() => userFilters.roles.map((role) => role.id), [userFilters.roles]),
	});

	const pendingUsersCount = usePendingUsersCount(filteredUsersQueryResult.data?.users);

	const handleReload = (): void => {
		seatsCap?.reload();
		filteredUsersQueryResult?.refetch();
	};

	const handleTabChangeAndSort = (tab: IAdminUserTabs) => {
		setTab(tab);

		sortData.setSort(tab === 'pending' ? 'active' : 'name', 'asc');
	};

	useEffect(() => {
		prevSearchTerm.current = searchTerm;
	}, [searchTerm]);

	const isRoutePrevented = useMemo(
		() => context && ['new', 'invite'].includes(context) && isCreateUserDisabled,
		[context, isCreateUserDisabled],
	);

	return (
		<Page flexDirection='row'>
			<Page>
				<PageHeader title={t('Users')}>
					{seatsCap && seatsCap.maxActiveUsers < Number.POSITIVE_INFINITY ? (
						<UserPageHeaderContentWithSeatsCap isSeatsCapExceeded={isSeatsCapExceeded} {...seatsCap} />
					) : (
						<ButtonGroup>
							{canBulkCreateUser && (
								<Button icon='mail' onClick={() => router.navigate('/admin/users/invite')} disabled={isSeatsCapExceeded}>
									{t('Invite')}
								</Button>
							)}
							{canCreateUser && (
								<Button icon='user-plus' onClick={() => router.navigate('/admin/users/new')} disabled={isSeatsCapExceeded}>
									{t('New_user')}
								</Button>
							)}
						</ButtonGroup>
					)}
				</PageHeader>
				<PageContent>
					{isSeatsCapExceeded && (
						<Callout title={t('Service_disruptions_occurring')} type='danger' mbe={19}>
							{t('Your_workspace_exceeded_the_seat_license_limit')}
						</Callout>
					)}
					<Tabs>
						<TabsItem selected={!tab || tab === 'all'} onClick={() => handleTabChangeAndSort('all')}>
							{t('All')}
						</TabsItem>
						<TabsItem selected={tab === 'pending'} onClick={() => handleTabChangeAndSort('pending')}>
							{`${t('Pending')} (${pendingUsersCount || 0})`}
						</TabsItem>
						<TabsItem selected={tab === 'active'} onClick={() => handleTabChangeAndSort('active')}>
							{t('Active')}
						</TabsItem>
						<TabsItem selected={tab === 'deactivated'} onClick={() => handleTabChangeAndSort('deactivated')}>
							{t('Deactivated')}
						</TabsItem>
					</Tabs>
					<UsersTable
						filteredUsersQueryResult={filteredUsersQueryResult}
						setUserFilters={setUserFilters}
						onReload={handleReload}
						paginationData={paginationData}
						sortData={sortData}
						tab={tab}
						isSeatsCapExceeded={isSeatsCapExceeded}
						roleData={data}
					/>
				</PageContent>
			</Page>
			{context && (
				<ContextualbarDialog>
					<Contextualbar>
						<ContextualbarHeader>
							{context === 'upgrade' && <ContextualbarIcon name='user-plus' />}
							<ContextualbarTitle>
								{context === 'info' && t('User_Info')}
								{context === 'edit' && t('Edit_User')}
								{(context === 'new' || context === 'created') && (
									<>
										<Icon name='user-plus' size={20} /> {t('New_user')}
									</>
								)}
								{context === 'invite' && t('Invite_Users')}
							</ContextualbarTitle>
							<ContextualbarClose onClick={() => router.navigate('/admin/users')} />
						</ContextualbarHeader>
						{context === 'info' && id && <AdminUserInfoWithData uid={id} onReload={handleReload} tab={tab} />}
						{context === 'edit' && id && (
							<AdminUserFormWithData uid={id} onReload={handleReload} context={context} roleData={data} roleError={error} />
						)}
						{!isRoutePrevented && context === 'new' && (
							<AdminUserForm onReload={handleReload} context={context} roleData={data} roleError={error} />
						)}
						{!isRoutePrevented && context === 'created' && id && <AdminUserCreated uid={id} />}
						{!isRoutePrevented && context === 'invite' && <AdminInviteUsers />}
						{isRoutePrevented && <AdminUserUpgrade />}
					</Contextualbar>
				</ContextualbarDialog>
			)}
		</Page>
	);
};

export default AdminUsersPage;
