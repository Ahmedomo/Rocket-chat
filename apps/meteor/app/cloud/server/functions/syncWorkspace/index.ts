import { CloudWorkspaceRegistrationError } from '../../../../../lib/errors/CloudWorkspaceRegistrationError';
import { SystemLogger } from '../../../../../server/lib/logger/system';
import { CloudWorkspaceAccessTokenEmptyError, CloudWorkspaceAccessTokenError } from '../getWorkspaceAccessToken';
import { getCachedSupportedVersionsToken } from '../supportedVersionsToken/supportedVersionsToken';
import { announcementSync } from './announcementSync';
import { legacySyncWorkspace } from './legacySyncWorkspace';
import { syncCloudData } from './syncCloudData';

export async function syncWorkspace() {
	try {
		await syncCloudData();
		await announcementSync();
		await getCachedSupportedVersionsToken.reset();
	} catch (err) {
		switch (true) {
			case err instanceof CloudWorkspaceRegistrationError:
			case err instanceof CloudWorkspaceAccessTokenError:
			case err instanceof CloudWorkspaceAccessTokenEmptyError: {
				// There is no access token, so we can't sync
				SystemLogger.info('Workspace does not have a valid access token, sync aborted');
				break;
			}
			default: {
				SystemLogger.error({ msg: 'Error during workspace sync', err });
				SystemLogger.info({
					msg: 'Falling back to legacy sync',
					function: 'syncCloudData',
				});
				try {
					await legacySyncWorkspace();
					await getCachedSupportedVersionsToken.reset();
				} catch (err) {
					switch (true) {
						case err instanceof CloudWorkspaceRegistrationError:
						case err instanceof CloudWorkspaceAccessTokenError:
						case err instanceof CloudWorkspaceAccessTokenEmptyError: {
							// There is no access token, so we can't sync
							break;
						}
						default: {
							SystemLogger.error({ msg: 'Error during fallback workspace sync', err });
							throw err;
						}
					}
				}
			}
		}
	}
}
