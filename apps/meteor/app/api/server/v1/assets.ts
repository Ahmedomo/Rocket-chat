import { Meteor } from 'meteor/meteor';
import { Request } from 'express';
import { isAssetsUnsetAssetProps } from '@rocket.chat/rest-typings';

import { RocketChatAssets } from '../../../assets/server';
import { API } from '../api';
import { getUploadFormData } from '../lib/getUploadFormData';

API.v1.addRoute(
	'assets.setAsset',
	{ authRequired: true },
	{
		async post() {
			const { refreshAllClients, ...files } = await getUploadFormData({ request: this.request as Request });

			const assetsKeys = Object.keys(RocketChatAssets.assets);

			const [assetName] = Object.keys(files);

			const isValidAsset = assetsKeys.includes(assetName);
			if (!isValidAsset) {
				throw new Meteor.Error('error-invalid-asset', 'Invalid asset');
			}

			Meteor.runAsUser(this.userId, () => {
				const { [assetName]: asset } = files;

				Meteor.call('setAsset', asset.fileBuffer, asset.mimetype, assetName);
				if (refreshAllClients) {
					Meteor.call('refreshClients');
				}
			});

			return API.v1.success();
		},
	},
);

API.v1.addRoute(
	'assets.unsetAsset',
	{
		authRequired: true,
		validateParams: isAssetsUnsetAssetProps,
	},
	{
		post() {
			const { assetName, refreshAllClients } = this.bodyParams;
			const isValidAsset = Object.keys(RocketChatAssets.assets).includes(assetName);
			if (!isValidAsset) {
				throw new Meteor.Error('error-invalid-asset', 'Invalid asset');
			}
			Meteor.call('unsetAsset', assetName);
			if (refreshAllClients) {
				Meteor.call('refreshClients');
			}
			return API.v1.success();
		},
	},
);
