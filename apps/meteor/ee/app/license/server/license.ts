import { EventEmitter } from 'events';

import type { IAppStorageItem } from '@rocket.chat/apps-engine/server/storage';
import { Apps } from '@rocket.chat/core-services';
import type { ILicenseV2, ILicenseTag, ILicenseV3, Timestamp, LicenseBehavior } from '@rocket.chat/core-typings';
import { Logger } from '@rocket.chat/logger';
import { Users } from '@rocket.chat/models';

import { getInstallationSourceFromAppStorageItem } from '../../../../lib/apps/getInstallationSourceFromAppStorageItem';
import type { BundleFeature } from './bundles';
import { getBundleModules, isBundle } from './bundles';
import decrypt from './decrypt';
import { fromV2toV3 } from './fromV2toV3';
import { isUnderAppLimits } from './lib/isUnderAppLimits';

const EnterpriseLicenses = new EventEmitter();

const logger = new Logger('License');

class LicenseClass {
	private url: string | null = null;

	private encryptedLicense: string | undefined;

	private tags = new Set<ILicenseTag>();

	private modules = new Set<string>();

	private unmodifiedLicense: ILicenseV2 | ILicenseV3 | undefined;

	private license: ILicenseV3 | undefined;

	private valid: boolean | undefined;

	private inFairPolicy: boolean | undefined;

	private _isPeriodInvalid(from?: Timestamp, until?: Timestamp): boolean {
		const now = new Date();

		if (from && now < new Date(from)) {
			return true;
		}

		if (until && now > new Date(until)) {
			return true;
		}

		return false;
	}

	private _validateURL(licenseURL: string, url: string): boolean {
		licenseURL = licenseURL
			.replace(/\./g, '\\.') // convert dots to literal
			.replace(/\*/g, '.*'); // convert * to .*
		const regex = new RegExp(`^${licenseURL}$`, 'i');

		return !!regex.exec(url);
	}

	private _validModules(licenseModules: string[]): void {
		licenseModules.forEach((module) => {
			this.modules.add(module);
			EnterpriseLicenses.emit('module', { module, valid: true });
			EnterpriseLicenses.emit(`valid:${module}`);
		});
	}

	private _invalidModules(licenseModules: string[]): void {
		licenseModules.forEach((module) => {
			EnterpriseLicenses.emit('module', { module, valid: false });
			EnterpriseLicenses.emit(`invalid:${module}`);
		});
		this.modules.clear();
	}

	private _addTag(tag: ILicenseTag): void {
		// make sure to not add duplicated tag names
		for (const addedTag of this.tags) {
			if (addedTag.name.toLowerCase() === tag.name.toLowerCase()) {
				return;
			}
		}

		this.tags.add(tag);
	}

	private removeCurrentLicense(): void {
		const { license, valid } = this;

		this.license = undefined;
		this.unmodifiedLicense = undefined;
		this.valid = undefined;
		this.inFairPolicy = undefined;

		if (!license || !valid) {
			return;
		}

		this.valid = false;
		EnterpriseLicenses.emit('invalidate');
		this._invalidModules(license.grantedModules.map(({ module }) => module));
	}

	public async setLicenseV3(license: ILicenseV3): Promise<void> {
		this.removeCurrentLicense();

		this.unmodifiedLicense = license;
		this.license = license;

		return this.validate();
	}

	public async setLicenseV2(license: ILicenseV2): Promise<void> {
		this.removeCurrentLicense();

		const licenseV3 = fromV2toV3(license);

		this.unmodifiedLicense = license;
		this.license = licenseV3;

		return this.validate();
	}

	public lockLicense(encryptedLicense: string): void {
		this.encryptedLicense = encryptedLicense;
	}

	public isLicenseDuplicate(encryptedLicense: string): boolean {
		return Boolean(this.encryptedLicense && this.encryptedLicense === encryptedLicense);
	}

	public hasModule(module: string): boolean {
		return this.modules.has(module);
	}

	public hasValidLicense(): boolean {
		return Boolean(this.license && this.valid);
	}

	public getUnmodifiedLicense(): ILicenseV2 | ILicenseV3 | undefined {
		if (this.valid) {
			return this.unmodifiedLicense;
		}
	}

	public getModules(): string[] {
		return [...this.modules];
	}

	public getTags(): ILicenseTag[] {
		return [...this.tags];
	}

	public async setURL(url: string): Promise<void> {
		this.url = url.replace(/\/$/, '').replace(/^https?:\/\/(.*)$/, '$1');

		await this.validate();
	}

	private validateLicenseUrl(license: ILicenseV3, behaviorFilter: (behavior: LicenseBehavior) => boolean): LicenseBehavior[] {
		if (!behaviorFilter('invalidate_license')) {
			return [];
		}

		const {
			validation: { serverUrls },
		} = license;

		const { url: workspaceUrl } = this;

		if (!workspaceUrl) {
			logger.error('Unable to validate license URL without knowing the workspace URL.');
			return ['invalidate_license'];
		}

		return serverUrls
			.filter((url) => {
				switch (url.type) {
					case 'regex':
						// #TODO
						break;
					case 'hash':
						// #TODO
						break;
					case 'url':
						return !this._validateURL(url.value, workspaceUrl);
				}

				return false;
			})
			.map((url) => {
				logger.error({
					msg: 'Url validation failed',
					url,
					workspaceUrl,
				});
				return 'invalidate_license';
			});
	}

	private validateLicensePeriods(license: ILicenseV3, behaviorFilter: (behavior: LicenseBehavior) => boolean): LicenseBehavior[] {
		const {
			validation: { validPeriods },
		} = license;

		return validPeriods
			.filter(
				({ validFrom, validUntil, invalidBehavior }) => behaviorFilter(invalidBehavior) && this._isPeriodInvalid(validFrom, validUntil),
			)
			.map((period) => {
				logger.error({
					msg: 'Period validation failed',
					period,
				});
				return period.invalidBehavior;
			});
	}

	private async validateLicenseLimits(
		license: ILicenseV3,
		behaviorFilter: (behavior: LicenseBehavior) => boolean,
	): Promise<LicenseBehavior[]> {
		const { limits } = license;

		const limitKeys = Object.keys(limits) as (keyof ILicenseV3['limits'])[];
		return (
			await Promise.all(
				limitKeys.map(async (limitKey) => {
					// Filter the limit list before running any query in the database so we don't end up loading some value we won't use.
					const limitList = limits[limitKey]?.filter(({ behavior, max }) => max >= 0 && behaviorFilter(behavior));
					if (!limitList?.length) {
						return [];
					}

					const currentValue = await this.getCurrentValueForLicenseLimit(limitKey);
					return limitList
						.filter(({ max }) => max < currentValue)
						.map((limit) => {
							logger.error({
								msg: 'Limit validation failed',
								kind: limitKey,
								limit,
							});
							return limit.behavior;
						});
				}),
			)
		).reduce((prev, curr) => [...new Set([...prev, ...curr])], []);
	}

	private async shouldPreventAction(action: keyof ILicenseV3['limits'], newCount = 1): Promise<boolean> {
		if (!this.valid) {
			return false;
		}

		const currentValue = (await this.getCurrentValueForLicenseLimit(action)) + newCount;
		return Boolean(
			this.license?.limits[action]
				?.filter(({ behavior, max }) => behavior === 'prevent_action' && max >= 0)
				.some(({ max }) => max < currentValue),
		);
	}

	private async runValidation(license: ILicenseV3, behaviorsToValidate: LicenseBehavior[] = []): Promise<LicenseBehavior[]> {
		const shouldValidateBehavior = (behavior: LicenseBehavior) => !behaviorsToValidate?.length || behaviorsToValidate.includes(behavior);

		return [
			...new Set([
				...this.validateLicenseUrl(license, shouldValidateBehavior),
				...this.validateLicensePeriods(license, shouldValidateBehavior),
				...(await this.validateLicenseLimits(license, shouldValidateBehavior)),
			]),
		];
	}

	private async validate(): Promise<void> {
		if (this.license) {
			// #TODO: Only include 'prevent_installation' here if this is actually the initial installation of the license
			const behaviorsTriggered = await this.runValidation(this.license, [
				'invalidate_license',
				'prevent_installation',
				'start_fair_policy',
			]);

			if (behaviorsTriggered.includes('invalidate_license') || behaviorsTriggered.includes('prevent_installation')) {
				return;
			}

			this.valid = true;
			this.inFairPolicy = behaviorsTriggered.includes('start_fair_policy');

			if (this.license.information.tags) {
				for (const tag of this.license.information.tags) {
					this._addTag(tag);
				}
			}

			this._validModules(this.license.grantedModules.map(({ module }) => module));
			console.log('#### License validated:', this.license.grantedModules.map(({ module }) => module).join(', '));
		}

		EnterpriseLicenses.emit('validate');
		this.showLicense();
	}

	private async getCurrentValueForLicenseLimit(limitKey: keyof ILicenseV3['limits']): Promise<number> {
		switch (limitKey) {
			case 'activeUsers':
				return this.getCurrentActiveUsers();
			case 'guestUsers':
				return this.getCurrentGuestUsers();
			case 'privateApps':
				return this.getCurrentPrivateAppsCount();
			case 'marketplaceApps':
				return this.getCurrentMarketplaceAppsCount();
			default:
				return 0;
		}
	}

	private async getCurrentActiveUsers(): Promise<number> {
		return Users.getActiveLocalUserCount();
	}

	private async getCurrentGuestUsers(): Promise<number> {
		// #TODO: Load current count
		return 0;
	}

	private async getCurrentPrivateAppsCount(): Promise<number> {
		// #TODO: Load current count
		return 0;
	}

	private async getCurrentMarketplaceAppsCount(): Promise<number> {
		// #TODO: Load current count
		return 0;
	}

	public async canAddNewUser(userCount = 1): Promise<boolean> {
		return !(await this.shouldPreventAction('activeUsers', userCount));
	}

	public async canEnableApp(app: IAppStorageItem): Promise<boolean> {
		if (!(await Apps.isInitialized())) {
			return false;
		}

		// Migrated apps were installed before the validation was implemented
		// so they're always allowed to be enabled
		if (app.migrated) {
			return true;
		}

		return isUnderAppLimits(getAppsConfig(), getInstallationSourceFromAppStorageItem(app));
	}

	private showLicense(): void {
		if (!process.env.LICENSE_DEBUG || process.env.LICENSE_DEBUG === 'false') {
			return;
		}

		if (!this.license || !this.valid) {
			return;
		}

		const {
			validation: { serverUrls, validPeriods },
			limits,
			grantedModules,
		} = this.license;

		console.log('---- License enabled ----');
		console.log('              url ->', JSON.stringify(serverUrls));
		console.log('          periods ->', JSON.stringify(validPeriods));
		console.log('           limits ->', JSON.stringify(limits));
		console.log('          modules ->', grantedModules.map(({ module }) => module).join(', '));
		console.log('-------------------------');
	}

	public getMaxActiveUsers(): number {
		return (this.valid && this.license?.limits.activeUsers?.find(({ behavior }) => behavior === 'prevent_action')?.max) || 0;
	}

	public startedFairPolicy(): boolean {
		return Boolean(this.valid && this.inFairPolicy);
	}
}

const License = new LicenseClass();

export async function setLicense(encryptedLicense: string): Promise<boolean> {
	if (!encryptedLicense || String(encryptedLicense).trim() === '' || License.isLicenseDuplicate(encryptedLicense)) {
		return false;
	}

	console.log('### New Enterprise License');

	try {
		const decrypted = decrypt(encryptedLicense);
		if (!decrypted) {
			return false;
		}

		if (process.env.LICENSE_DEBUG && process.env.LICENSE_DEBUG !== 'false') {
			console.log('##### Raw license ->', decrypted);
		}

		// #TODO: Check license version and call setLicenseV2 or setLicenseV3
		await License.setLicenseV2(JSON.parse(decrypted));
		License.lockLicense(encryptedLicense);

		return true;
	} catch (e) {
		console.error('##### Invalid license');
		if (process.env.LICENSE_DEBUG && process.env.LICENSE_DEBUG !== 'false') {
			console.error('##### Invalid raw license ->', encryptedLicense, e);
		}
		return false;
	}
}

export function validateFormat(encryptedLicense: string): boolean {
	if (!encryptedLicense || String(encryptedLicense).trim() === '') {
		return false;
	}

	const decrypted = decrypt(encryptedLicense);
	if (!decrypted) {
		return false;
	}

	return true;
}

export async function setURL(url: string): Promise<void> {
	await License.setURL(url);
}

export function hasLicense(feature: string): boolean {
	return License.hasModule(feature);
}

export function isEnterprise(): boolean {
	return License.hasValidLicense();
}

export function getMaxGuestUsers(): number {
	// #TODO: Adjust any place currently using this function to stop doing so.
	return 0;
}

export function getMaxRoomsPerGuest(): number {
	// #TODO: Adjust any place currently using this function to stop doing so.
	return 0;
}

export function getMaxActiveUsers(): number {
	// #TODO: Adjust any place currently using this function to stop doing so.
	return License.getMaxActiveUsers();
}

export function getUnmodifiedLicense(): ILicenseV3 | ILicenseV2 | undefined {
	return License.getUnmodifiedLicense();
}

export function getModules(): string[] {
	return License.getModules();
}

export function getTags(): ILicenseTag[] {
	return License.getTags();
}

export function getAppsConfig(): NonNullable<ILicenseV2['apps']> {
	// #TODO: Adjust any place currently using this function to stop doing so.
	return {
		maxPrivateApps: -1,
		maxMarketplaceApps: -1,
	};
}

export async function canAddNewUser(userCount = 1): Promise<boolean> {
	return License.canAddNewUser(userCount);
}

export async function canEnableApp(app: IAppStorageItem): Promise<boolean> {
	return License.canEnableApp(app);
}

export function onLicense(feature: BundleFeature, cb: (...args: any[]) => void): void | Promise<void> {
	if (hasLicense(feature)) {
		return cb();
	}

	EnterpriseLicenses.once(`valid:${feature}`, cb);
}

function onValidFeature(feature: BundleFeature, cb: () => void): () => void {
	EnterpriseLicenses.on(`valid:${feature}`, cb);

	if (hasLicense(feature)) {
		cb();
	}

	return (): void => {
		EnterpriseLicenses.off(`valid:${feature}`, cb);
	};
}

function onInvalidFeature(feature: BundleFeature, cb: () => void): () => void {
	EnterpriseLicenses.on(`invalid:${feature}`, cb);

	if (!hasLicense(feature)) {
		cb();
	}

	return (): void => {
		EnterpriseLicenses.off(`invalid:${feature}`, cb);
	};
}

export function onToggledFeature(
	feature: BundleFeature,
	{
		up,
		down,
	}: {
		up?: () => Promise<void> | void;
		down?: () => Promise<void> | void;
	},
): () => void {
	let enabled = hasLicense(feature);

	const offValidFeature = onValidFeature(feature, () => {
		if (!enabled) {
			void up?.();
			enabled = true;
		}
	});

	const offInvalidFeature = onInvalidFeature(feature, () => {
		if (enabled) {
			void down?.();
			enabled = false;
		}
	});

	if (enabled) {
		void up?.();
	}

	return (): void => {
		offValidFeature();
		offInvalidFeature();
	};
}

export function onModule(cb: (...args: any[]) => void): void {
	EnterpriseLicenses.on('module', cb);
}

export function onValidateLicenses(cb: (...args: any[]) => void): void {
	EnterpriseLicenses.on('validate', cb);
}

export function onInvalidateLicense(cb: (...args: any[]) => void): void {
	EnterpriseLicenses.on('invalidate', cb);
}

export function flatModules(modulesAndBundles: string[]): string[] {
	const bundles = modulesAndBundles.filter(isBundle);
	const modules = modulesAndBundles.filter((x) => !isBundle(x));

	const modulesFromBundles = bundles.map(getBundleModules).flat();

	return modules.concat(modulesFromBundles);
}

interface IOverrideClassProperties {
	[key: string]: (...args: any[]) => any;
}

type Class = { new (...args: any[]): any };

export async function overwriteClassOnLicense(license: BundleFeature, original: Class, overwrite: IOverrideClassProperties): Promise<void> {
	await onLicense(license, () => {
		Object.entries(overwrite).forEach(([key, value]) => {
			const originalFn = original.prototype[key];
			original.prototype[key] = function (...args: any[]): any {
				return value.call(this, originalFn, ...args);
			};
		});
	});
}
