import React, { useMemo } from 'react';
import { Field, TextInput, Button, Margins, Box, MultiSelect, Icon, Select } from '@rocket.chat/fuselage';
import { useMutableCallback } from '@rocket.chat/fuselage-hooks';

import { useMethod } from '../../contexts/ServerContext';
import { useToastMessageDispatch } from '../../contexts/ToastMessagesContext';
import { useTranslation } from '../../contexts/TranslationContext';
import VerticalBar from '../../components/basic/VerticalBar';
import { UserInfo } from '../../components/basic/UserInfo';
import { useEndpointDataExperimental, ENDPOINT_STATES } from '../../hooks/useEndpointDataExperimental';
import { FormSkeleton } from './Skeleton';
import { useForm } from '../../hooks/useForm';
import { getUserEmailAddress } from '../../helpers/getUserEmailAddress';
import { useRoute } from '../../contexts/RouterContext';


export default function AgentEditWithData({ uid, reload }) {
	const t = useTranslation();
	const { data, state, error } = useEndpointDataExperimental(`livechat/users/agent/${ uid }`);
	const { data: userDepartments, state: userDepartmentsState, error: userDepartmentsError } = useEndpointDataExperimental(`livechat/agents/${ uid }/departments`);
	const { data: availableDepartments, state: availableDepartmentsState, error: availableDepartmentsError } = useEndpointDataExperimental('livechat/department');

	if ([state, availableDepartmentsState, userDepartmentsState].includes(ENDPOINT_STATES.LOADING)) {
		return <FormSkeleton/>;
	}

	if (error || userDepartmentsError || availableDepartmentsError) {
		return <Box mbs='x16'>{t('User_not_found')}</Box>;
	}

	return <AgentEdit uid={uid} data={data} userDepartments={userDepartments} availableDepartments={availableDepartments} reset={reload}/>;
}

export function AgentEdit({ data, userDepartments, availableDepartments, uid, reset, ...props }) {
	const t = useTranslation();
	const agentsRoute = useRoute('omnichannel-agents');

	const { user } = data || { user: {} };
	const {
		name,
		username,
		statusLivechat,
	} = user;

	const email = getUserEmailAddress(user);
	const options = useMemo(() => (availableDepartments && availableDepartments.departments ? availableDepartments.departments.map(({ _id, name }) => [_id, name || _id]) : []), [availableDepartments]);
	const initialDepartmentValue = useMemo(() => (userDepartments && userDepartments.departments ? userDepartments.departments.map(({ departmentId }) => departmentId) : []), [userDepartments]);

	const { values, handlers, hasUnsavedChanges } = useForm({ departments: initialDepartmentValue, status: statusLivechat });

	const {
		handleDepartments,
		handleStatus,
	} = handlers;
	const {
		departments,
		status,
	} = values;

	const saveAgentInfo = useMethod('livechat:saveAgentInfo');
	const saveAgentStatus = useMethod('livechat:changeLivechatStatus');

	const dispatchToastMessage = useToastMessageDispatch();

	const handleSave = useMutableCallback(async () => {
		try {
			await saveAgentInfo(uid, {}, departments);
			await saveAgentStatus({ status, agentId: uid });
			dispatchToastMessage({ type: 'success', message: t('saved') });
			agentsRoute.push({});
		} catch (error) {
			dispatchToastMessage({ type: 'error', message: error });
			console.log(error);
		}
		reset();
	});

	return <VerticalBar.ScrollableContent is='form' { ...props }>
		<UserInfo.Avatar margin='auto' size={'x332'} title={username} username={username}/>
		<Field>
			<Field.Label>{t('Name')}</Field.Label>
			<Field.Row>
				<TextInput flexGrow={1} value={name} disabled/>
			</Field.Row>
		</Field>
		<Field>
			<Field.Label>{t('Username')}</Field.Label>
			<Field.Row>
				<TextInput flexGrow={1} value={username} disabled addon={<Icon name='at' size='x20'/>}/>
			</Field.Row>
		</Field>
		<Field>
			<Field.Label>{t('Email')}</Field.Label>
			<Field.Row>
				<TextInput flexGrow={1} value={email} disabled addon={<Icon name='mail' size='x20'/>}/>
			</Field.Row>
		</Field>
		<Field>
			<Field.Label>{t('Departments')}</Field.Label>
			<Field.Row>
				<MultiSelect options={options} value={departments} placeholder={t('Select_an_option')} onChange={handleDepartments} flexGrow={1}/>
			</Field.Row>
		</Field>
		<Field>
			<Field.Label>{t('Status')}</Field.Label>
			<Field.Row>
				<Select options={[['available', t('Available')], ['not-available', t('Not_Available')]]} value={status} placeholder={t('Select_an_option')} onChange={handleStatus} flexGrow={1}/>
			</Field.Row>
		</Field>


		<Field.Row>
			<Box display='flex' flexDirection='row' justifyContent='space-between' w='full'>
				<Margins inlineEnd='x4'>
					<Button flexGrow={1} type='reset' disabled={!hasUnsavedChanges} onClick={reset}>{t('Reset')}</Button>
					<Button mie='none' flexGrow={1} disabled={!hasUnsavedChanges} onClick={handleSave}>{t('Save')}</Button>
				</Margins>
			</Box>
		</Field.Row>
	</VerticalBar.ScrollableContent>;
}
