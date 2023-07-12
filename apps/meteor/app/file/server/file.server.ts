import stream from 'stream';
import type { ReadStream } from 'fs';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

import { MongoInternals } from 'meteor/mongo';
import mkdirp from 'mkdirp';
import type { GridFSBucketReadStream } from 'mongodb';
import { GridFSBucket } from 'mongodb';
import type { ObjectId } from 'bson';

const { db } = MongoInternals.defaultRemoteCollectionDriver().mongo;

type IFile = {
	buffer: Buffer;
	contentType?: string;
	length: number;
	uploadDate?: Date;
};

interface IRocketChatFileStore {
	remove(fileId: string): Promise<void>;

	createWriteStream(fileName: string, contentType: string): void;

	createReadStream(fileName: string): void;

	getFileWithReadStream(fileName: string): Promise<
		| {
				readStream: GridFSBucketReadStream | ReadStream;
				contentType?: string;
				length: number;
				uploadDate?: Date;
		  }
		| undefined
	>;

	getFile(fileName: string): Promise<IFile | undefined>;

	deleteFile(fileName: string): Promise<void>;
}

class GridFS implements IRocketChatFileStore {
	private name: string;

	private bucket: GridFSBucket;

	constructor({ name = 'file' } = {}) {
		this.name = name;

		this.bucket = new GridFSBucket(db, { bucketName: this.name });
	}

	private async findOne(filename: string) {
		const file = await this.bucket.find({ filename }).limit(1).toArray();
		if (!file) {
			return;
		}
		return file[0];
	}

	async remove(fileId: string) {
		await this.bucket.delete(fileId as unknown as ObjectId);
	}

	createWriteStream(fileName: string, contentType: string) {
		const ws = this.bucket.openUploadStream(fileName, {
			contentType,
		});

		ws.on('close', function () {
			return ws.emit('end');
		});
		return ws;
	}

	createReadStream(fileName: string) {
		return this.bucket.openDownloadStreamByName(fileName);
	}

	async getFileWithReadStream(fileName: string) {
		const file = await this.findOne(fileName);
		if (!file) {
			return;
		}
		const rs = this.createReadStream(fileName);
		return {
			readStream: rs,
			contentType: file.contentType,
			length: file.length,
			uploadDate: file.uploadDate,
		};
	}

	async getFile(fileName: string) {
		const file = await this.getFileWithReadStream(fileName);
		if (!file) {
			return;
		}
		return new Promise<IFile>((resolve) => {
			const data: Buffer[] = [];
			file.readStream.on('data', function (chunk) {
				return data.push(chunk);
			});

			file.readStream.on('end', function () {
				resolve({
					buffer: Buffer.concat(data),
					contentType: file.contentType,
					length: file.length,
					uploadDate: file.uploadDate,
				});
			});
		});
	}

	async deleteFile(fileName: string) {
		const file = await this.findOne(fileName);
		if (file == null) {
			return undefined;
		}
		return this.remove(file._id as unknown as string);
	}
}

class FileSystem implements IRocketChatFileStore {
	private absolutePath: string;

	constructor({ absolutePath = '~/uploads' } = {}) {
		if (absolutePath.split(path.sep)[0] === '~') {
			const homepath = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
			if (homepath != null) {
				absolutePath = absolutePath.replace('~', homepath);
			} else {
				throw new Error('Unable to resolve "~" in path');
			}
		}
		this.absolutePath = path.resolve(absolutePath);
		mkdirp.sync(this.absolutePath);
	}

	createWriteStream(fileName: string) {
		const ws = fs.createWriteStream(path.join(this.absolutePath, fileName));
		ws.on('close', function () {
			return ws.emit('end');
		});
		return ws;
	}

	createReadStream(fileName: string) {
		return fs.createReadStream(path.join(this.absolutePath, fileName));
	}

	stat(fileName: string) {
		return fsp.stat(path.join(this.absolutePath, fileName));
	}

	async remove(fileName: string) {
		return fsp.unlink(path.join(this.absolutePath, fileName));
	}

	async getFileWithReadStream(fileName: string) {
		try {
			const stat = await this.stat(fileName);
			const rs = this.createReadStream(fileName);
			return {
				readStream: rs,
				// contentType: file.contentType
				length: stat.size,
			};
		} catch (error1) {
			//
		}
	}

	async getFile(fileName: string) {
		const file = await this.getFileWithReadStream(fileName);
		if (!file) {
			return;
		}
		return new Promise<IFile>((resolve) => {
			const data: Buffer[] = [];
			file.readStream.on('data', function (chunk: Buffer) {
				return data.push(chunk);
			});
			file.readStream.on('end', function () {
				resolve({
					buffer: Buffer.concat(data),
					length: file.length,
				});
			});
		});
	}

	async deleteFile(fileName: string) {
		try {
			return await this.remove(fileName);
		} catch (error1) {
			//
		}
	}
}

export const RocketChatFile = {
	bufferToStream(buffer: Buffer) {
		const bufferStream = new stream.PassThrough();
		bufferStream.end(buffer);
		return bufferStream;
	},

	dataURIParse(dataURI: string | Buffer) {
		const imageData = Buffer.from(dataURI).toString().split(';base64,');
		return {
			image: imageData[1],
			contentType: imageData[0].replace('data:', ''),
		};
	},

	GridFS,
	FileSystem,
};
