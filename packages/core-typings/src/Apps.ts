import type { AppStatus } from '@rocket.chat/apps-engine/definition/AppStatus';

export type AppScreenshot = {
	id: string;
	appId: string;
	fileName: string;
	accessUrl: string;
	thumbnailUrl: string;
	createdAt: string;
	modifiedAt: string;
};

export type App = {
	id: string;
	iconFileData: string;
	name: string;
	author: {
		name: string;
		homepage: string;
		support: string;
	};
	description: string;
	detailedDescription: {
		raw: string;
		rendered: string;
	};
	categories: string[];
	version: string;
	price: number;
	purchaseType: string;
	pricingPlans: unknown[];
	iconFileContent: string;
	installed?: boolean;
	isEnterpriseOnly?: boolean;
	bundledIn: {
		bundleId: string;
		bundleName: string;
		apps: App[];
	}[];
	marketplaceVersion: string;
	latest: App;
	status?: AppStatus;
	licenseValidation?: {
		errors: { [key: string]: string };
		warnings: { [key: string]: string };
	};
	marketplace: unknown;
	modifiedAt: string;
	permissions: unknown[];
};
