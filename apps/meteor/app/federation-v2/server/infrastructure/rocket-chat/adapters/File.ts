import { Meteor } from 'meteor/meteor';
import type { IMessage, IUpload, IUser } from '@rocket.chat/core-typings';
import { Uploads } from '@rocket.chat/models';

import { FileUpload } from '../../../../../file-upload/server';
import { parseFileIntoMessageAttachments } from '../../../../../file-upload/server/methods/sendFileMessage';

export class RocketChatFileAdapter {
	public async uploadFile(
		readableStream: ReadableStream,
		internalRoomId: string,
		internalUser: IUser,
		fileRecord: Partial<IUpload>,
	): Promise<{ files: IMessage['files']; attachments: IMessage['attachments'] }> {
		return new Promise<{ files: IMessage['files']; attachments: IMessage['attachments'] }>((resolve, reject) => {
			const fileStore = FileUpload.getStore('Uploads');
			// this needs to be here due to a high coupling in the third party lib that rely on the logged in user
			Meteor.runAsUser(internalUser._id, async () => {
				const uploadedFile = fileStore.insertSync(fileRecord, readableStream);
				try {
					const { files, attachments } = await parseFileIntoMessageAttachments(uploadedFile, internalRoomId, internalUser);

					resolve({ files, attachments });
				} catch (error) {
					reject(error);
				}
			});
		});
	}

	public async getBufferFromFileRecord(fileRecord: IUpload): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			FileUpload.getBuffer(fileRecord, (err: Error, buffer: Buffer) => {
				if (err) {
					return reject(err);
				}
				resolve(buffer);
			});
		});
	}

	public async getFileRecordById(fileId: string): Promise<IUpload | undefined | null> {
		return Uploads.findOneById(fileId);
	}
}
