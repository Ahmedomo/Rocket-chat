import type { IExternalComponent } from '@rocket.chat/apps-engine/definition/externalComponent';
import type { IAppInfo } from '@rocket.chat/apps-engine/definition/metadata';
import type { ProxiedApp } from '@rocket.chat/apps-engine/server/ProxiedApp';
import type { IAppStorageItem } from '@rocket.chat/apps-engine/server/storage';
import type { IAppsPersistenceModel } from '@rocket.chat/model-typings';

export interface IAppsService {
	triggerEvent: (event: string, ...payload: any) => Promise<any>;
	updateAppsMarketplaceInfo: (apps: Array<IAppInfo>) => Promise<ProxiedApp[] | undefined>;
	initialize: () => void;
	load: () => Promise<void>;
	unload: () => Promise<void>;
	isLoaded: () => boolean;
	isInitialized: () => boolean;
	getPersistenceModel: () => IAppsPersistenceModel;
	getMarketplaceUrl: () => string;
	getProvidedComponents: () => IExternalComponent[];
	rocketChatLoggerWarn<T>(obj: T, args?: any): void;
	rocketChatLoggerError<T>(obj: T, args?: any): void;
	rocketChatLoggerDebug(args?: any): void;
	retrieveOneFromStorage(appId: string): Promise<IAppStorageItem | null>;
	fetchAppSourceStorage(storageItem: IAppStorageItem): Promise<Buffer> | undefined;
	setStorage(value: string): void;
	setFileSystemStoragePath(value: string): void;
	// runOnAppEvent(listener: AppServerNotifier): void;
}
