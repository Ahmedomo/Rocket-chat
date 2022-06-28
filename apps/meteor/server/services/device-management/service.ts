import { IDeviceManagementService } from '../../sdk/types/IDeviceManagementService';
import { deviceManagementEvents } from './events';
import { ServiceClassInternal } from '../../sdk/types/ServiceClass';

export class DeviceManagementService extends ServiceClassInternal implements IDeviceManagementService {
	protected name = 'device-management';

	constructor() {
		super();

		this.onEvent('accounts.login', async (data) => {
			deviceManagementEvents.emit('device-login', data);
		});
	}
}
