import { UserStatus as Status, isUserFederated } from '@rocket.chat/core-typings';
import type { IRole, IUser } from '@rocket.chat/core-typings';
import { Box, Button, Menu, Option } from '@rocket.chat/fuselage';
import { useMutableCallback } from '@rocket.chat/fuselage-hooks';
import { useTranslation } from '@rocket.chat/ui-contexts';
import type { useQuery } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import React from 'react';

import { Roles } from '../../../../../app/models/client';
import { GenericTableRow, GenericTableCell } from '../../../../components/GenericTable';
import { UserStatus } from '../../../../components/UserStatus';
import UserAvatar from '../../../../components/avatar/UserAvatar';
import { dispatchToastMessage } from '../../../../lib/toast';
import { useChangeAdminStatusAction } from '../hooks/useChangeAdminStatusAction';
import { useChangeUserStatusAction } from '../hooks/useChangeUserStatusAction';
import { useDeleteUserAction } from '../hooks/useDeleteUserAction';
import { useResetE2EEKeyAction } from '../hooks/useResetE2EEKeyAction';
import { useResetTOTPAction } from '../hooks/useResetTOTPAction';

type UsersTableRowProps = {
	user: Pick<IUser, '_id' | 'username' | 'name' | 'status' | 'emails' | 'active' | 'avatarETag' | 'roles'>;
	onClick: (id: IUser['_id'], e: React.MouseEvent<HTMLElement, MouseEvent> | React.KeyboardEvent<HTMLElement>) => void;
	mediaQuery: boolean;
	refetchUsers: ReturnType<typeof useQuery>['refetch'];
	onReload: () => void;
	tab: string;
};

const UsersTableRow = ({ user, onClick, mediaQuery, refetchUsers, onReload, tab }: UsersTableRowProps): ReactElement => {
	const t = useTranslation();
	const { _id, emails, username, name, status, roles, active, avatarETag } = user;
	const registrationStatusText = active ? t('Active') : t('Deactivated');

	const roleNames = (roles || [])
		.map((roleId) => (Roles.findOne(roleId, { fields: { name: 1 } }) as IRole | undefined)?.name)
		.filter((roleName): roleName is string => !!roleName)
		.join(', ');

	const userId = user._id;
	const isAdmin = user.roles?.includes('admin');
	const isActive = user.active;
	const isFederatedUser = isUserFederated(user);

	const onChange = useMutableCallback(() => {
		onReload();
		refetchUsers();
	});

	const changeAdminStatusAction = useChangeAdminStatusAction(userId, isAdmin, onChange);
	const changeUserStatusAction = useChangeUserStatusAction(userId, isActive, onChange);
	const deleteUserAction = useDeleteUserAction(userId, onChange, onReload);
	const resetTOTPAction = useResetTOTPAction(userId);
	const resetE2EKeyAction = useResetE2EEKeyAction(userId);

	const menuOptions = {
		...(tab !== 'pending' &&
			changeAdminStatusAction &&
			!isFederatedUser && {
				makeAdmin: {
					label: { label: changeAdminStatusAction.label, icon: changeAdminStatusAction.icon },
					action: changeAdminStatusAction.action,
				},
			}),
		...(tab !== 'pending' &&
			resetE2EKeyAction &&
			!isFederatedUser && {
				resetE2EKey: { label: { label: resetE2EKeyAction.label, icon: resetE2EKeyAction.icon }, action: resetE2EKeyAction.action },
			}),
		...(tab !== 'pending' &&
			resetTOTPAction &&
			!isFederatedUser && {
				resetTOTP: { label: { label: resetTOTPAction.label, icon: resetTOTPAction.icon }, action: resetTOTPAction.action },
			}),
		...(changeUserStatusAction &&
			!isFederatedUser && {
				changeActiveStatus: {
					label: { label: changeUserStatusAction.label, icon: changeUserStatusAction.icon },
					action: changeUserStatusAction.action,
				},
			}),
		...(deleteUserAction && {
			delete: { label: { label: deleteUserAction.label, icon: deleteUserAction.icon }, action: deleteUserAction.action },
		}),
	};

	// TODO: create action for this?
	// TODO: implement logic
	const handleResendWelcomeEmail = () => {
		console.log('Welcome email resent');
		dispatchToastMessage({ type: 'success', message: t('Welcome_email_resent') });
	};

	const checkPendingButton = (): ReactElement => {
		if (active) {
			return (
				<Button small secondary mie={8} onClick={handleResendWelcomeEmail}>
					{t('Resend_welcome_email')}
				</Button>
			);
		}
		return (
			<Button small primary mie={8} onClick={changeUserStatusAction?.action}>
				{t('Activate')}
			</Button>
		);
	};

	return (
		<GenericTableRow
			onKeyDown={(e): void => onClick(_id, e)}
			onClick={(e): void => onClick(_id, e)}
			tabIndex={0}
			role='link'
			action
			qa-user-id={_id}
		>
			<GenericTableCell withTruncatedText>
				<Box display='flex' alignItems='center'>
					{username && <UserAvatar size={mediaQuery ? 'x28' : 'x40'} username={username} etag={avatarETag} />}
					<Box display='flex' mi={8} withTruncatedText>
						<Box display='flex' flexDirection='column' alignSelf='center' withTruncatedText>
							<Box fontScale='p2m' color='default' withTruncatedText>
								<Box display='inline' mie='x8'>
									<UserStatus status={status || Status.OFFLINE} />
								</Box>
								{name || username}
							</Box>
							{!mediaQuery && name && (
								<Box fontScale='p2' color='hint' withTruncatedText>
									{`@${username}`}
								</Box>
							)}
						</Box>
					</Box>
				</Box>
			</GenericTableCell>
			{mediaQuery && (
				<GenericTableCell>
					<Box fontScale='p2m' color='hint' withTruncatedText>
						{username}
					</Box>
					<Box mi={4} />
				</GenericTableCell>
			)}

			<GenericTableCell withTruncatedText>{emails?.length && emails[0].address}</GenericTableCell>
			{mediaQuery && <GenericTableCell withTruncatedText>{roleNames}</GenericTableCell>}
			{tab === 'all' && (
				<GenericTableCell fontScale='p2' color='hint' withTruncatedText>
					{registrationStatusText}
				</GenericTableCell>
			)}
			{tab === 'pending' && (
				<GenericTableCell fontScale='p2' color='hint' withTruncatedText>
					<Box display='flex' flexDirection='row' alignContent='flex-end'>
						{active ? t('User_first_log_in') : t('Activation')}
					</Box>
				</GenericTableCell>
			)}

			<GenericTableCell
				display='flex'
				justifyContent='flex-end'
				onClick={(e): void => {
					e.stopPropagation();
				}}
			>
				{tab === 'pending' && checkPendingButton()}

				<Menu
					mi={4}
					placement='bottom-start'
					flexShrink={0}
					key='menu'
					renderItem={({ label: { label, icon }, ...props }): ReactElement =>
						label === 'Delete' ? (
							<Option label={label} title={label} icon={icon} variant='danger' {...props} />
						) : (
							<Option label={label} title={label} icon={icon} {...props} />
						)
					}
					options={menuOptions}
				/>
			</GenericTableCell>
		</GenericTableRow>
	);
};

export default UsersTableRow;
