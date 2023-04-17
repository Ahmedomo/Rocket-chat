import type { IAppInfo } from '@rocket.chat/apps-engine/definition/metadata';
import type { ProxiedApp } from '@rocket.chat/apps-engine/server/ProxiedApp';
import type { SettingValue } from '@rocket.chat/core-typings';
import type { IAppStorageItem } from '@rocket.chat/apps-engine/server/storage';
import type { Db } from 'mongodb';
import type { IExternalComponent } from '@rocket.chat/apps-engine/definition/externalComponent';
import type { IAppsPersistenceModel } from '@rocket.chat/model-typings';
import type { IAppsService } from '@rocket.chat/core-services';
import { ServiceClass } from '@rocket.chat/core-services';

import { settings } from '../../../app/settings/server';
import type { AppServerOrchestrator } from '../../server/apps/orchestrator';
import { OrchestratorFactory } from './orchestratorFactory';

type AppsInitParams = {
	appsSourceStorageFilesystemPath: any;
	appsSourceStorageType: any;
	marketplaceUrl?: string | undefined;
};

export class AppsOrchestratorService extends ServiceClass implements IAppsService {
	protected name = 'apps';

	private apps: AppServerOrchestrator;

	private appsInitParams: AppsInitParams = {
		appsSourceStorageType: settings.get('Apps_Framework_Source_Package_Storage_Type'),
		appsSourceStorageFilesystemPath: settings.get('Apps_Framework_Source_Package_Storage_FileSystem_Path'),
		marketplaceUrl: 'https://marketplace.rocket.chat',
	};

	constructor(db: Db) {
		super();

		this.apps = OrchestratorFactory.getOrchestrator(db);
	}

	async started(): Promise<void> {
		if (!this.apps.isEnabled()) {
			return;
		}

		this.apps.load();
	}

	async triggerEvent(event: string, ...payload: any): Promise<any> {
		return this.apps.triggerEvent(event, ...payload);
	}

	async updateAppsMarketplaceInfo(apps: Array<IAppInfo>): Promise<ProxiedApp[] | undefined> {
		return this.apps.updateAppsMarketplaceInfo(apps);
	}

	initialize(): void {
		return this.apps.initialize(this.appsInitParams);
	}

	async load(): Promise<void> {
		return this.apps.load();
	}

	async unload(): Promise<void> {
		return this.apps.unload();
	}

	isLoaded(): boolean {
		return this.apps.isLoaded();
	}

	isEnabled(): SettingValue {
		return this.apps.isEnabled();
	}

	isInitialized(): boolean {
		return this.apps.isInitialized();
	}

	getPersistenceModel(): IAppsPersistenceModel {
		return this.apps.getPersistenceModel();
	}

	getMarketplaceUrl(): string {
		return this.apps.getMarketplaceUrl() as string;
	}

	rocketChatLoggerWarn<T>(obj: T, args: any[]) {
		return this.apps.getRocketChatLogger()?.warn(obj, args);
	}

	getProvidedComponents(): IExternalComponent[] {
		return this.apps.getProvidedComponents();
	}

	rocketChatLoggerError<T>(obj: T, args: any[]) {
		return this.apps.getRocketChatLogger()?.error(obj, args);
	}

	retrieveOneFromStorage(appId: string): Promise<IAppStorageItem | null> {
		return this.apps.getStorage()!.retrieveOne(appId);
	}

	fetchAppSourceStorage(storageItem: IAppStorageItem): Promise<Buffer> | undefined {
		return this.apps.getAppSourceStorage()?.fetch(storageItem);
	}

	setFrameworkEnabled(value: boolean): void {
		return this.apps.setFrameworkEnabled(value);
	}

	setDevelopmentMode(value: boolean): void {
		return this.apps.setDevelopmentMode(value);
	}

	setStorage(value: string): void {
		return this.apps.getAppSourceStorage()?.setStorage(value);
	}

	setFileSystemStoragePath(value: string): void {
		return this.apps.getAppSourceStorage()?.setFileSystemStoragePath(value);
	}

	// runOnAppEvent(listener: AppServerNotifier): void {
	// 	Object.entries(AppEvents).forEach(([key, value]) => {
	// 		this.apps.appEventsSink.on(value, (...args) => {
	// 			const method =
	// 				key.toLowerCase().split('_')[0] +
	// 				key
	// 					.toLowerCase()
	// 					.split('_')
	// 					.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
	// 					.flat()
	// 					.join('');
	// 			listener[method](...args);
	// 		});
	// 	});
	// }
}
