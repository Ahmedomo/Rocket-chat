import { Button, ButtonGroup, ContextualbarIcon, Icon, Tabs, TabsItem } from '@rocket.chat/fuselage';
import { useDebouncedValue } from '@rocket.chat/fuselage-hooks';
import type { OptionProp } from '@rocket.chat/ui-client';
import { usePermission, useRouteParameter, useTranslation, useRouter, useEndpoint } from '@rocket.chat/ui-contexts';
import { useQuery } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import UserPageHeaderContentWithSeatsCap from '../../../../ee/client/views/admin/users/UserPageHeaderContentWithSeatsCap';
import { useSeatsCap } from '../../../../ee/client/views/admin/users/useSeatsCap';
import { Contextualbar, ContextualbarHeader, ContextualbarTitle, ContextualbarClose } from '../../../components/Contextualbar';
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
import type { IAdminUserTabs } from './IAdminUserTabs';
import UsersTable from './UsersTable';
import useFilteredUsers from './hooks/useFilteredUsers';
import usePendingUsersCount from './hooks/usePendingUsersCount';

export type UsersFilters = {
	text: string;
	roles: OptionProp[];
};

const AdminUsersPage = (): ReactElement => {
	const t = useTranslation();

	const seatsCap = useSeatsCap();

	const router = useRouter();
	const context = useRouteParameter('context');
	const id = useRouteParameter('id');

	const canCreateUser = usePermission('create-user');
	const canBulkCreateUser = usePermission('bulk-register-user');
	const isCreateUserDisabled = useShouldPreventAction('activeUsers');

	const [tab, setTab] = useState<IAdminUserTabs>('all');
	const [userFilters, setUserFilters] = useState<UsersFilters>({ text: '', roles: [] });

	const isRoutePrevented = context && ['new', 'invite'].includes(context) && isCreateUserDisabled;

	const getRoles = useEndpoint('GET', '/v1/roles.list');
	const { data, error } = useQuery(['roles'], async () => getRoles());

	const paginationData = usePagination();
	const sortData = useSort<'name' | 'username' | 'emails.address' | 'status'>('name');

	const searchTerm = useDebouncedValue(userFilters.text, 500);
	const prevSearchTerm = useRef('');

	const filteredUsersQueryResult = useFilteredUsers({
		searchTerm,
		prevSearchTerm,
		sortData,
		tab,
		paginationData,
		selectedRoles: useMemo(() => userFilters.roles.map((role) => role.id), [userFilters.roles]),
	});

	const pendingUsersCount = usePendingUsersCount(filteredUsersQueryResult.data?.total);

	const handleReload = (): void => {
		seatsCap?.reload();
		filteredUsersQueryResult?.refetch();
	};

	useEffect(() => {
		prevSearchTerm.current = searchTerm;
	}, [searchTerm]);

	return (
		<Page flexDirection='row'>
			<Page>
				<PageHeader title={t('Users')}>
					{seatsCap && seatsCap.maxActiveUsers < Number.POSITIVE_INFINITY ? (
						<UserPageHeaderContentWithSeatsCap {...seatsCap} />
					) : (
						<ButtonGroup>
							{canBulkCreateUser && (
								<Button icon='mail' onClick={() => router.navigate('/admin/users/invite')}>
									{t('Invite')}
								</Button>
							)}
							{canCreateUser && (
								<Button icon='user-plus' onClick={() => router.navigate('/admin/users/new')}>
									{t('New_user')}
								</Button>
							)}
						</ButtonGroup>
					)}
				</PageHeader>
				<PageContent>
					<Tabs>
						<TabsItem selected={!tab || tab === 'all'} onClick={() => setTab('all')}>
							{t('All')}
						</TabsItem>
						<TabsItem selected={tab === 'pending'} onClick={() => setTab('pending')}>
							{pendingUsersCount ? `${t('Pending')} (${pendingUsersCount})` : t('Pending')}
						</TabsItem>
						<TabsItem selected={tab === 'active'} onClick={() => setTab('active')}>
							{t('Active')}
						</TabsItem>
						<TabsItem selected={tab === 'deactivated'} onClick={() => setTab('deactivated')}>
							{t('Deactivated')}
						</TabsItem>
					</Tabs>
					<UsersTable
						filteredUsersQueryResult={filteredUsersQueryResult}
						setUserFilters={setUserFilters}
						roleData={data}
						tab={tab}
						onReload={handleReload}
						paginationData={paginationData}
						sortData={sortData}
					/>
				</PageContent>
			</Page>
			{context && (
				<Contextualbar is='aside' aria-labelledby=''>
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
			)}
		</Page>
	);
};

export default AdminUsersPage;
