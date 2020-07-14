import { Meteor } from 'meteor/meteor';

import { settings } from '../../../../settings/server';
import { Messages } from '../../../../models/server';
import { IScreenSharingProvider } from './IScreenSharingProvider';
import { screenSharingStreamer } from '../stream/screenSharingStream';
import { Users } from '../../../../models';

export class ScreenSharingManager {
	providerName = '';

	private providers = new Map<string, IScreenSharingProvider>();

	private screenShareProvider: IScreenSharingProvider | any = null;

	activeSessions: string[] = [];

	pendingSessions: string[] = [];

	urls = new Map<string, string>();

	enabled(): any {
		return settings.get('Livechat_screen_sharing_enabled');
	}

	setProviderName(name: string): void {
		this.providerName = name;
	}

	registerProvider(name: string, Provider: IScreenSharingProvider): void {
		this.providers.set(name, Provider);
		if (name === this.providerName) {
			this.setProvider();
		}
	}

	getProvider(): IScreenSharingProvider | any {
		if (!this.providers.has(this.providerName)) {
			throw new Meteor.Error('error-screensharing-provider-not-available');
		}
		return this.providers.get(this.providerName);
	}

	setProvider(): void {
		this.screenShareProvider = this.getProvider();
	}

	getConfig(): any {
		return { enabled: this.enabled(), ...this.screenShareProvider.config } || {};
	}

	getProviderInfo(): any {
		return this.screenShareProvider.getInfo();
	}

	requestScreenSharing(roomId: string, user: any): void {
		Messages.createWithTypeRoomIdMessageAndUser('request_screen_sharing_access', roomId, '', user, {});
		this.pendingSessions = this.pendingSessions.filter((id) => id !== roomId);
		this.pendingSessions.push(roomId);
		screenSharingStreamer.emit('pending-sessions-modified', { sessions: this.pendingSessions });
	}

	screenSharingRequestRejected(roomId: string, visitor: any): void {
		Messages.createWithTypeRoomIdMessageAndUser('screen_sharing_request_rejected', roomId, '', visitor, {});
		this.pendingSessions = this.pendingSessions.filter((id) => id !== roomId);
		screenSharingStreamer.emit('pending-sessions-modified', { sessions: this.pendingSessions });
	}

	screenSharingRequestAccepted(roomId: string, visitor: any, agent: any): void {
		Messages.createWithTypeRoomIdMessageAndUser('screen_sharing_request_accepted', roomId, '', visitor, {});
		this.pendingSessions = this.pendingSessions.filter((id) => id !== roomId);
		screenSharingStreamer.emit('pending-sessions-modified', { sessions: this.pendingSessions });
		const user = Users.findOneByUsernameIgnoringCase(agent.username);
		this.addActiveScreenSharing(roomId, user);
	}

	endScreenSharingSession(roomId: string, user: any): void {
		Messages.createWithTypeRoomIdMessageAndUser('end_screen_sharing_session', roomId, '', user, {});
		this.removeActiveScreenSharing(roomId);
	}

	addActiveScreenSharing(roomId: string, agent: any): void {
		this.activeSessions = this.activeSessions.filter((id) => id !== roomId);
		this.activeSessions.push(roomId);
		if (this.urls.has(roomId)) {
			this.urls.delete(roomId);
		}
		const sessionUrl = this.screenShareProvider.getURL(roomId, agent);
		this.urls.set(roomId, sessionUrl);
		console.log(this.activeSessions);
		screenSharingStreamer.emit('active-sessions-modified', { sessions: this.activeSessions });
	}

	removeActiveScreenSharing(roomId: string): void {
		this.activeSessions = this.activeSessions.filter((id) => id !== roomId);
		this.urls.delete(roomId);
		console.log(this.activeSessions);
		screenSharingStreamer.emit('active-sessions-modified', { sessions: this.activeSessions });
	}

	getActiveSessions(): string[] {
		return this.activeSessions;
	}

	getSessionUrl(roomId: string): any {
		return this.urls.get(roomId);
	}
}

export const ScreensharingManager = new ScreenSharingManager();

settings.get('Livechat_screen_sharing_provider', function(key, value) {
	ScreensharingManager.setProviderName(value);
});
