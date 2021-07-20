import { Box, Field, Margins, ButtonGroup, Button, Callout, Flex } from '@rocket.chat/fuselage';
import { useMutableCallback } from '@rocket.chat/fuselage-hooks';
import React, { useState, useRef } from 'react';

import Page from '../../../components/Page';
import RoomAutoComplete from '../../../components/RoomAutoComplete';
import UserAutoComplete from '../../../components/UserAutoComplete';
import { useRoute } from '../../../contexts/RouterContext';
import { useEndpoint } from '../../../contexts/ServerContext';
import { useToastMessageDispatch } from '../../../contexts/ToastMessagesContext';
import { useTranslation } from '../../../contexts/TranslationContext';
import UsersInRoleTableContainer from './UsersInRoleTableContainer';

const UsersInRolePage = ({ data }) => {
	const t = useTranslation();
	const dispatchToastMessage = useToastMessageDispatch();

	const reload = useRef();

	const [user, setUser] = useState();
	const [rid, setRid] = useState();

	const { _id, name, description } = data;

	const router = useRoute('admin-permissions');

	const addUser = useEndpoint('POST', 'roles.addUserToRole');

	const handleReturn = useMutableCallback(() => {
		router.push({
			context: 'edit',
			_id,
		});
	});

	const handleAdd = useMutableCallback(async () => {
		try {
			await addUser({ roleName: _id, username: user, roomId: rid });
			dispatchToastMessage({ type: 'success', message: t('User_added') });
			setUser();
			reload.current();
		} catch (error) {
			dispatchToastMessage({ type: 'error', message: error });
		}
	});

	return (
		<Page>
			<Page.Header title={`${t('Users_in_role')} "${description || name}"`}>
				<ButtonGroup>
					<Button onClick={handleReturn}>{t('Back')}</Button>
				</ButtonGroup>
			</Page.Header>
			<Page.Content>
				<Box display='flex' flexDirection='row' w='full' mi='neg-x4'>
					<Margins inline='x4'>
						<Flex.Item shrink={1}>
							{data.scope !== 'Users' && (
								<Field>
									<Field.Label>{t('Choose_a_room')}</Field.Label>
									<Field.Row>
										<RoomAutoComplete value={rid} onChange={setRid} placeholder={t('User')} />
									</Field.Row>
								</Field>
							)}
							<Field>
								<Field.Label>{t('Add_user')}</Field.Label>
								<Field.Row>
									<UserAutoComplete value={user} onChange={setUser} placeholder={t('User')} />
								</Field.Row>
							</Field>
							<Box display='flex' flexGrow={1} flexDirection='column' justifyContent='flex-end'>
								<Button primary onClick={handleAdd}>
									{t('Add')}
								</Button>
							</Box>
						</Flex.Item>
					</Margins>
				</Box>
				<Margins blockStart='x8'>
					{(data.scope === 'Users' || rid) && (
						<UsersInRoleTableContainer
							reloadRef={reload}
							scope={data.scope}
							rid={rid}
							roleId={_id}
							roleName={name}
							description={description}
						/>
					)}
					{data.scope !== 'Users' && !rid && <Callout type='info'>{t('Select_a_room')}</Callout>}
				</Margins>
			</Page.Content>
		</Page>
	);
};

export default UsersInRolePage;
