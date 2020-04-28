import React, { useCallback } from 'react';
import { Tabs, ButtonGroup, Button, Icon } from '@rocket.chat/fuselage';

import { Page } from '../../components/basic/Page';
import VerticalBar from '../../components/basic/VerticalBar';
import { useTranslation } from '../../contexts/TranslationContext';
import { useRouteParameter, useRoute } from '../../contexts/RouterContext';
import { EditRoomContextBar } from '../rooms/edit/EditRoom';
import { UserInfoWithData } from '../users/UserInfo';
import { EditUserWithData } from '../users/EditUser';
import { AddUser } from '../users/AddUser';
import { InviteUsers } from '../users/InviteUsers';

export function UsersAndRoomsTab({ route, tab, children, switchTab, ...props }) {
	const t = useTranslation();

	const context = useRouteParameter('context');
	const id = useRouteParameter('id');

	const router = useRoute(route);
	const handleHeaderButtonClick = useCallback((context) => () => router.push({
		context,
	}), [router]);

	const handleVerticalBarCloseButtonClick = () => {
		router.push({});
	};

	return <Page {...props} flexDirection='row'>
		<Page name='admin-user-and-room'>
			<Page.Header title={t('Users_and_rooms')}>
				{ tab === 'users' && <ButtonGroup>
					<Button small onClick={handleHeaderButtonClick('new')} aria-label={t('New')}>
						<Icon name='plus'/>
					</Button>
					<Button small onClick={handleHeaderButtonClick('invite')} aria-label={t('Invite')}>
						<Icon name='send'/>
					</Button>
				</ButtonGroup>
				}
			</Page.Header>
			<Tabs>
				<Tabs.Item selected={tab === 'users'} onClick={switchTab && switchTab.users}>{t('Users')}</Tabs.Item>
				<Tabs.Item selected={tab === 'rooms'} onClick={switchTab && switchTab.rooms}>{t('Rooms')}</Tabs.Item>
			</Tabs>
			<Page.Content>
				{children}
			</Page.Content>
		</Page>
		{ context
			&& <VerticalBar>
				<VerticalBar.Header>
					{tab === 'rooms' && t('Room_Info')}
					{tab === 'users' && context === 'info' && t('User_Info')}
					{tab === 'users' && context === 'edit' && t('Edit_User')}
					{tab === 'users' && context === 'new' && t('Add_User')}
					{tab === 'users' && context === 'invite' && t('Invite_Users')}
					<VerticalBar.Close onClick={handleVerticalBarCloseButtonClick} />
				</VerticalBar.Header>
				<VerticalBar.Content>
					{ tab === 'rooms' && <EditRoomContextBar rid={id}/> }
					{ tab === 'users' && context === 'info' && <UserInfoWithData userId={id}/> }
					{ tab === 'users' && context === 'edit' && <EditUserWithData userId={id}/> }
					{ tab === 'users' && context === 'new' && <AddUser/> }
					{ tab === 'users' && context === 'invite' && <InviteUsers/> }
				</VerticalBar.Content>
			</VerticalBar>}
	</Page>;
}
