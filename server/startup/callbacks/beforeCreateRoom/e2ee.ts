import { callbacks } from '../../../../lib/callbacks';
import { settings } from '../../../../app/settings/server';
import { IRoom } from '../../../../definition/IRoom';

callbacks.add('beforeCreateRoom', ({ type, extraData }: { type: IRoom['t']; extraData: Record<string, unknown> }) => {
	if (!settings.get('E2E_Enable')) {
		delete extraData.encrypted;
		return;
	}

	if (
		(type === 'd' && settings.get('E2E_Enabled_Default_DirectRooms')) ||
		(type === 'p' && settings.get('E2E_Enabled_Default_PrivateRooms'))
	) {
		extraData.encrypted = extraData.encrypted ?? true;
	}
});
