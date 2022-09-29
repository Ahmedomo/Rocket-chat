/* eslint-disable import/first */
import { expect } from 'chai';
import sinon from 'sinon';

import { getExternalMessageSender } from '../../../../../../../../app/federation-v2/server/application/sender/MessageSenders';

describe('Federation - Application - Message Senders', () => {
	const bridge = {
		sendMessage: sinon.stub(),
		sendMessageFileToRoom: sinon.stub(),
	};
	const fileAdapter = {
		getBufferFromFileRecord: sinon.stub(),
		getFileRecordById: sinon.stub(),
		extractMetadataFromFile: sinon.stub(),
	};
	const messageAdapter = {
		setExternalFederationEventOnMessage: sinon.stub(),
	};

	afterEach(() => {
		bridge.sendMessage.reset();
		bridge.sendMessageFileToRoom.reset();
		fileAdapter.getBufferFromFileRecord.reset();
		fileAdapter.getFileRecordById.reset();
		fileAdapter.extractMetadataFromFile.reset();
		messageAdapter.setExternalFederationEventOnMessage.reset();
	});

	describe('TextExternalMessageSender', () => {
		const roomId = 'roomId';
		const senderId = 'senderId';
		const message = { _id: '_id', msg: 'text' } as any;

		describe('#sendMessage()', () => {
			it('should send a message through the bridge', async () => {
				bridge.sendMessage.resolves('externalMessageId');
				await getExternalMessageSender({} as any, bridge as any, fileAdapter as any, messageAdapter as any).sendMessage(
					roomId,
					senderId,
					message,
				);
				expect(bridge.sendMessage.calledWith(roomId, senderId, message)).to.be.true;
				expect(messageAdapter.setExternalFederationEventOnMessage.calledWith(message._id, 'externalMessageId')).to.be.true;
			});
		});
	});

	describe('FileExternalMessageSender', () => {
		const roomId = 'roomId';
		const senderId = 'senderId';
		const message = { _id: '_id', msg: 'text', files: [{ _id: 'fileId' }] } as any;

		describe('#sendMessage()', () => {
			it('should not upload the file to the bridge if the file does not exists', async () => {
				fileAdapter.getFileRecordById.resolves(undefined);
				await getExternalMessageSender(message, bridge as any, fileAdapter as any, messageAdapter as any).sendMessage(
					roomId,
					senderId,
					message,
				);
				expect(bridge.sendMessageFileToRoom.called).to.be.false;
				expect(fileAdapter.getBufferFromFileRecord.called).to.be.false;
			});

			it('should not upload the file to the bridge if the file size does not exists', async () => {
				fileAdapter.getFileRecordById.resolves({});
				await getExternalMessageSender(message, bridge as any, fileAdapter as any, messageAdapter as any).sendMessage(
					roomId,
					senderId,
					message,
				);
				expect(bridge.sendMessageFileToRoom.called).to.be.false;
				expect(fileAdapter.getBufferFromFileRecord.called).to.be.false;
			});

			it('should not upload the file to the bridge if the file type does not exists', async () => {
				fileAdapter.getFileRecordById.resolves({ size: 12 });
				await getExternalMessageSender(message, bridge as any, fileAdapter as any, messageAdapter as any).sendMessage(
					roomId,
					senderId,
					message,
				);
				expect(bridge.sendMessageFileToRoom.called).to.be.false;
				expect(fileAdapter.getBufferFromFileRecord.called).to.be.false;
			});

			it('should send a message (upload the file) through the bridge', async () => {
				fileAdapter.getFileRecordById.resolves({ name: 'filename', size: 12, type: 'image/png' });
				fileAdapter.getBufferFromFileRecord.resolves({ buffer: 'buffer' });
				fileAdapter.extractMetadataFromFile.resolves({ width: 100, height: 100, format: 'png' });
				bridge.sendMessageFileToRoom.resolves('externalMessageId');
				await getExternalMessageSender(message, bridge as any, fileAdapter as any, messageAdapter as any).sendMessage(
					roomId,
					senderId,
					message,
				);
				expect(fileAdapter.getBufferFromFileRecord.calledWith({ name: 'filename', size: 12, type: 'image/png' })).to.be.true;
				expect(
					bridge.sendMessageFileToRoom.calledWith(
						roomId,
						senderId,
						{ buffer: 'buffer' },
						{
							filename: 'filename',
							fileSize: 12,
							mimeType: 'image/png',
							metadata: { width: 100, height: 100, format: 'png' },
						},
					),
				).to.be.true;
				expect(messageAdapter.setExternalFederationEventOnMessage.calledWith(message._id, 'externalMessageId')).to.be.true;
			});
		});
	});
});
