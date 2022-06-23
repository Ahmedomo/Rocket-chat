import { Button, TableRow, TableCell } from '@rocket.chat/fuselage';
import { useMediaQuery } from '@rocket.chat/fuselage-hooks';
import { useTranslation } from '@rocket.chat/ui-contexts';
import React, { ReactElement } from 'react';

import { useFormatDateAndTime } from '../../../../../client/hooks/useFormatDateAndTime';
import { useDeviceLogout } from '../../admin/deviceManagement/useDeviceLogout';

type DevicesRowProps = {
	_id: string;
	deviceName?: string;
	deviceType?: string;
	deviceOSName?: string;
	deviceOSVersion?: string;
	loginAt: string;
	onReload: () => void;
};

const DeviceManagementRow = ({ _id, deviceName, deviceOSName, deviceOSVersion, loginAt, onReload }: DevicesRowProps): ReactElement => {
	const t = useTranslation();
	const formatDateAndTime = useFormatDateAndTime();
	const mediaQuery = useMediaQuery('(min-width: 1024px)');

	const handleDeviceLogout = useDeviceLogout(_id, '/v1/sessions/logout.me');

	return (
		<TableRow key={_id} action>
			<TableCell>{deviceName}</TableCell>
			<TableCell>{`${deviceOSName || ''} ${deviceOSVersion || ''}`}</TableCell>
			<TableCell>{formatDateAndTime(loginAt)}</TableCell>
			{mediaQuery && <TableCell>{_id}</TableCell>}
			<TableCell align='end'>
				<Button onClick={(): void => handleDeviceLogout(onReload)}>{t('Logout')}</Button>
			</TableCell>
		</TableRow>
	);
};

export default DeviceManagementRow;
