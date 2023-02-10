import { EssentialAppDisabledException } from '@rocket.chat/apps-engine/definition/exceptions';
import { AppInterface } from '@rocket.chat/apps-engine/definition/metadata';
import { AppManager } from '@rocket.chat/apps-engine/server/AppManager';
import { Apps as AppsModel, AppsLogs as AppsLogsModel, AppsPersistence as AppsPersistenceModel } from '@rocket.chat/models';

import { Logger } from '../../../server/lib/logger/Logger';
import { RealAppBridges } from './bridges';
import { AppMethods, AppServerNotifier, AppsRestApi, AppUIKitInteractionApi } from '../../../app/apps/server/communication';
import {
	AppMessagesConverter,
	AppRoomsConverter,
	AppSettingsConverter,
	AppUsersConverter,
	AppVideoConferencesConverter,
} from './converters';
import { AppDepartmentsConverter } from './converters/departments';
import { AppUploadsConverter } from './converters/uploads';
import { AppVisitorsConverter } from './converters/visitors';
import { AppRealLogsStorage, AppRealStorage, ConfigurableAppSourceStorage } from './storage';
import { MeteorError } from '../../../server/sdk/errors';

function isTesting() {
	return process.env.TEST_MODE === 'true';
}

export class AppServerOrchestrator {
	constructor(db) {
		this.db = db;
		this._isInitialized = false;
	}

	initialize({ marketplaceUrl = 'https://marketplace.rocket.chat', appsSourceStorageType, appsSourceStorageFilesystemPath }) {
		if (this._isInitialized) {
			return;
		}

		this._rocketchatLogger = new Logger('Rocket.Chat Apps');

		this.developmentMode = false;
		this.frameworkEnabled = true;

		this._marketplaceUrl = marketplaceUrl;

		this._model = AppsModel;
		this._logModel = AppsLogsModel;
		this._persistModel = AppsPersistenceModel;
		this._storage = new AppRealStorage(this._model);
		this._logStorage = new AppRealLogsStorage(this._logModel);
		this._appSourceStorage = new ConfigurableAppSourceStorage(appsSourceStorageType, appsSourceStorageFilesystemPath, this.db);

		this._converters = new Map();
		this._converters.set('messages', new AppMessagesConverter(this));
		this._converters.set('rooms', new AppRoomsConverter(this));
		this._converters.set('settings', new AppSettingsConverter(this));
		this._converters.set('users', new AppUsersConverter(this));
		this._converters.set('visitors', new AppVisitorsConverter(this));
		this._converters.set('departments', new AppDepartmentsConverter(this));
		this._converters.set('uploads', new AppUploadsConverter(this));
		this._converters.set('videoConferences', new AppVideoConferencesConverter());

		this._bridges = new RealAppBridges(this);

		this._manager = new AppManager({
			metadataStorage: this._storage,
			logStorage: this._logStorage,
			bridges: this._bridges,
			sourceStorage: this._appSourceStorage,
		});

		this._communicators = new Map();
		this._communicators.set('methods', new AppMethods(this));
		this._communicators.set('notifier', new AppServerNotifier(this));
		this._communicators.set('restapi', new AppsRestApi(this, this._manager));
		this._communicators.set('uikit', new AppUIKitInteractionApi(this));

		this._isInitialized = true;
	}

	getModel() {
		return this._model;
	}

	/**
	 * @returns {AppsPersistenceModel}
	 */
	getPersistenceModel() {
		return this._persistModel;
	}

	getStorage() {
		return this._storage;
	}

	getLogStorage() {
		return this._logStorage;
	}

	getConverters() {
		return this._converters;
	}

	getBridges() {
		return this._bridges;
	}

	getNotifier() {
		return this._communicators.get('notifier');
	}

	getManager() {
		return this._manager;
	}

	getProvidedComponents() {
		return this._manager.getExternalComponentManager().getProvidedComponents();
	}

	getAppSourceStorage() {
		return this._appSourceStorage;
	}

	isInitialized() {
		return this._isInitialized;
	}

	isEnabled() {
		return this.frameworkEnabled;
	}

	isLoaded() {
		return this.getManager().areAppsLoaded();
	}

	isDebugging() {
		return this.developmentMode && !isTesting();
	}

	/**
	 * @returns {Logger}
	 */
	getRocketChatLogger() {
		return this._rocketchatLogger;
	}

	debugLog(...args) {
		if (this.isDebugging()) {
			this.getRocketChatLogger().debug(...args);
		}
	}

	getMarketplaceUrl() {
		return this._marketplaceUrl;
	}

	async load() {
		// Don't try to load it again if it has
		// already been loaded
		if (this.isLoaded()) {
			return;
		}

		return this._manager
			.load()
			.then((affs) => console.log(`Loaded the Apps Framework and loaded a total of ${affs.length} Apps!`))
			.catch((err) => console.warn('Failed to load the Apps Framework and Apps!', err))
			.then(() => this.getBridges().getSchedulerBridge().startScheduler());
	}

	async unload() {
		// Don't try to unload it if it's already been
		// unlaoded or wasn't unloaded to start with
		if (!this.isLoaded()) {
			return;
		}

		return this._manager
			.unload()
			.then(() => console.log('Unloaded the Apps Framework.'))
			.catch((err) => console.warn('Failed to unload the Apps Framework!', err));
	}

	async updateAppsMarketplaceInfo(apps = []) {
		if (!this.isLoaded()) {
			return;
		}

		return this._manager.updateAppsMarketplaceInfo(apps).then(() => this._manager.get());
	}

	async triggerEvent(event, ...payload) {
		if (!this.isLoaded()) {
			return;
		}

		return this.getBridges()
			.getListenerBridge()
			.handleEvent(event, ...payload)
			.catch((error) => {
				if (error instanceof EssentialAppDisabledException) {
					throw new MeteorError('error-app-essential-disabled');
				}

				throw error;
			});
	}

	setDevelopmentMode(isEnabled) {
		this.developmentMode = isEnabled;
	}

	setFrameworkEnabled(isEnabled) {
		this.frameworkEnabled = isEnabled;
	}
}

export const AppEvents = AppInterface;
