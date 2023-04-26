import type { IMessage, IUpload } from '@rocket.chat/core-typings';
import { Meteor } from 'meteor/meteor';
import { ServiceClassInternal } from '@rocket.chat/core-services';
import type { ISendFileLivechatMessageParams, ISendFileMessageParams, IUploadFileParams, IUploadService } from '@rocket.chat/core-services';

import { FileUpload } from '../../../app/file-upload/server';

export class UploadService extends ServiceClassInternal implements IUploadService {
	protected name = 'upload';

	async uploadFile({ buffer, details, userId }: IUploadFileParams): Promise<IUpload> {
		return Meteor.runAsUser(userId, async () => {
			const fileStore = FileUpload.getStore('Uploads');
			return fileStore.insert(details, buffer);
		});
	}

	async sendFileMessage({ roomId, file, userId, message }: ISendFileMessageParams): Promise<IMessage | undefined> {
		return Meteor.runAsUser(userId, () => Meteor.callAsync('sendFileMessage', roomId, null, file, message));
	}

	async sendFileLivechatMessage({ roomId, visitorToken, file, message }: ISendFileLivechatMessageParams): Promise<IMessage> {
		return Meteor.callAsync('sendFileLivechatMessage', roomId, visitorToken, file, message);
	}

	async getBuffer(cb: Function): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			FileUpload.getBuffer(cb, (error: Error, result: Buffer) => {
				if (error) {
					return reject(error);
				}

				resolve(result);
			});
		});
	}

	async getFileBuffer({ userId, file }: { userId: string; file: IUpload }): Promise<Buffer> {
		return Meteor.runAsUser(userId, () => {
			return new Promise((resolve, reject) => {
				FileUpload.getBuffer(file, (err?: Error, buffer?: false | Buffer) => {
					if (err) {
						return reject(err);
					}
					if (!(buffer instanceof Buffer)) {
						return reject(new Error('Unknown error'));
					}
					return resolve(buffer);
				});
			});
		});
	}
}
