import { MongoInternals } from 'meteor/mongo';

import { AnalyticsService } from './analytics/service';
import { api } from '../sdk/api';
import { AppsEngineService } from './apps-engine/service';
import { AuthorizationLivechat } from '../../app/livechat/server/roomAccessValidator.internalService';
import { BannerService } from './banner/service';
import { LDAPService } from './ldap/service';
import { MediaService } from './image/service';
import { MeteorService } from './meteor/service';
import { NPSService } from './nps/service';
import { RoomService } from './room/service';
import { SAUMonitorService } from './sauMonitor/service';
import { TeamService } from './team/service';
import { UiKitCoreApp } from './uikit-core-app/service';
import { OmnichannelService } from './omnichannel/service';
import { OmnichannelVoipService } from './omnichannel-voip/service';
import { VoipService } from './voip/service';
import { VideoConfService } from './video-conference/service';
import { isRunningMs } from '../lib/isRunningMs';
import { PushService } from './push/service';
import { DeviceManagementService } from './device-management/service';
import { UploadService } from './upload/service';
import { CloudService } from './cloud/service';
import { UserService } from './user/service';
import { FederationService } from './federation/service';
import { FetchService } from './fetch/service';
import { LivechatService } from './livechat/service';
import { MessageService } from './message/service';
import { NotificationService } from './notification/service';
import { SlashCommandService } from './slashcommand/service';

const { db } = MongoInternals.defaultRemoteCollectionDriver().mongo;

api.registerService(new AppsEngineService());
api.registerService(new AnalyticsService());
api.registerService(new AuthorizationLivechat());
api.registerService(new BannerService());
api.registerService(new CloudService());
api.registerService(new LDAPService());
api.registerService(new MediaService());
api.registerService(new MeteorService());
api.registerService(new NPSService());
api.registerService(new RoomService());
api.registerService(new SAUMonitorService());
api.registerService(new UploadService());
api.registerService(new VoipService(db));
api.registerService(new OmnichannelService());
api.registerService(new OmnichannelVoipService());
api.registerService(new TeamService());
api.registerService(new UiKitCoreApp());
api.registerService(new UserService());
api.registerService(new PushService());
api.registerService(new DeviceManagementService());
api.registerService(new VideoConfService());
api.registerService(new FederationService());
api.registerService(new FetchService());
api.registerService(new LivechatService());
api.registerService(new MessageService());
api.registerService(new NotificationService());
api.registerService(new SlashCommandService());

// if the process is running in micro services mode we don't need to register services that will run separately
if (!isRunningMs()) {
	(async (): Promise<void> => {
		const { Presence } = await import('@rocket.chat/presence');

		const { Authorization } = await import('./authorization/service');

		const { AppsOrchestratorService } = await import('../../ee/app/apps/service');
		const { AppsStatisticsService } = await import('../../ee/app/apps/statisticsService');
		const { AppsConverterService } = await import('../../ee/app/apps/converterService');
		const { AppsManagerService } = await import('../../ee/app/apps/managerService');
		const { AppsVideoManagerService } = await import('../../ee/app/apps/videoManagerService');
		const { AppsApiService } = await import('../../ee/app/apps/apiService');

		api.registerService(new Presence());
		api.registerService(new Authorization());

		api.registerService(new AppsOrchestratorService(db));
		api.registerService(new AppsStatisticsService());
		api.registerService(new AppsConverterService());
		api.registerService(new AppsManagerService());
		api.registerService(new AppsVideoManagerService());
		api.registerService(new AppsApiService());
	})();
}
