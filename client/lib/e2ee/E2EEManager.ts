import { Emitter } from '@rocket.chat/emitter';
import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';

import { Subscriptions } from '../../../app/models/client';
import { Notifications } from '../../../app/notifications/client';
import { APIClient } from '../../../app/utils/client/lib/RestApiClient';
import { IMessage } from '../../../definition/IMessage';
import { IRoom } from '../../../definition/IRoom';
import { ISubscription } from '../../../definition/ISubscription';
import { NotificationEvent } from '../../../definition/NotificationEvent';
import { E2EERoomClient } from './E2EERoomClient';

interface IE2EERoomClientPool {
	track(rid: IRoom['_id']): E2EERoomClient;
	untrack(rid: IRoom['_id']): void;
	untrackAll(): void;
}

class E2EERoomClientPool implements IE2EERoomClientPool {
	protected roomClients: Map<IRoom['_id'], E2EERoomClient> = new Map();

	constructor(private userPrivateKey: CryptoKey) {}

	track(rid: IRoom['_id']): E2EERoomClient {
		const roomClient = this.roomClients.get(rid);

		if (roomClient) {
			return roomClient;
		}

		const newRoomClient = new E2EERoomClient(rid, this.userPrivateKey);
		this.roomClients.set(rid, newRoomClient);
		newRoomClient.start();
		return newRoomClient;
	}

	untrack(rid: IRoom['_id']): void {
		this.roomClients.get(rid)?.stop();
		this.roomClients.delete(rid);
	}

	untrackAll(): void {
		for (const roomClient of this.roomClients.values()) {
			roomClient.stop();
		}
		this.roomClients.clear();
	}
}

export class E2EEManager extends Emitter {
	private roomClients: IE2EERoomClientPool | undefined;

	protected started = false;

	protected enabled = new ReactiveVar(false);

	protected _ready = new ReactiveVar(false);

	protected failedToDecodeKey = false;

	protected dbPublicKey: string;

	protected dbPrivateKey: string;

	protected setPrivateKey(userPrivateKey: CryptoKey | undefined): void {
		if (!userPrivateKey) {
			return;
		}

		if (this.roomClients) {
			this.roomClients.untrackAll();
		}

		this.roomClients = new E2EERoomClientPool(userPrivateKey);
	}

	constructor() {
		super();

		this.on('ready', () => {
			this._ready.set(true);
		});
	}

	isEnabled(): boolean {
		return this.enabled.get();
	}

	setEnabled(enabled: boolean): void {
		this.enabled.set(enabled);
	}

	isReady(): boolean {
		return this.isEnabled() && this._ready.get();
	}

	watchSubscriptions(): () => void {
		const subscriptionWatcher: Meteor.LiveQueryHandle = Subscriptions.find().observe({
			added: ({ rid }: ISubscription) => {
				this.roomClients?.track(rid);
			},
			removed: ({ rid }: ISubscription) => {
				this.roomClients?.untrack(rid);
			},
		});

		return (): void => {
			subscriptionWatcher.stop();
		};
	}

	watchKeyRequests(): () => void {
		const handleKeyRequest = (roomId: IRoom['_id'], keyId: string): void => {
			const roomClient = this.roomClients?.track(roomId);
			roomClient?.provideKeyToUser(keyId);
		};

		Notifications.onUser('e2e.keyRequest', handleKeyRequest);

		return (): void => {
			Notifications.unUser('e2e.keyRequest', handleKeyRequest);
		};
	}

	async decryptNotification(notification: NotificationEvent): Promise<NotificationEvent> {
		const roomClient = this.roomClients?.track(notification.payload.rid);
		const message = await roomClient?.decryptMessage(
			{
				msg: notification.payload.message.msg,
				t: notification.payload.message.t,
				e2e: 'pending',
			},
			{ waitForKey: true },
		);

		return {
			...notification,
			text: message?.msg ?? notification.text,
		};
	}

	async transformReceivedMessage(message: IMessage): Promise<IMessage> {
		try {
			const roomClient = this.roomClients?.track(message.rid);
			return (await roomClient?.decryptMessage(message)) ?? message;
		} catch (error) {
			console.error(error);
			return message;
		}
	}

	async transformSendingMessage(message: IMessage): Promise<IMessage> {
		const roomClient = this.roomClients?.track(message.rid);
		return (await roomClient?.encryptMessage(message)) ?? message;
	}

	use(keyPair: CryptoKeyPair): void {
		this.started = true;
		this.setPrivateKey(keyPair.privateKey);
		this.setEnabled(true);
		this._ready.set(true);
		this.requestSubscriptionKeys();
		this.emit('ready');
	}

	unuse(): void {
		this.started = false;
		this.setPrivateKey(undefined);
		this.setEnabled(false);
		this._ready.set(false);
	}

	async requestSubscriptionKeys(): Promise<void> {
		await APIClient.v1.post('e2e.requestSubscriptionKeys');
	}
}
