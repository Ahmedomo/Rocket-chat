import { EventEmitter } from 'events';

import IMAP from 'imap';
import type Connection from 'imap';
import { simpleParser, ParsedMail } from 'mailparser';

import { logger } from '../features/EmailInbox/logger';

type IMAPOptions = {
	deleteAfterRead: boolean;
	filter: any[];
	rejectBeforeTS?: Date;
	markSeen: boolean;
	maxRetries: number;
};

export declare interface IMAPInterceptor {
	on(event: 'email', listener: (email: ParsedMail) => void): this;
	on(event: string, listener: Function): this;
}

export class IMAPInterceptor extends EventEmitter {
	private imap: IMAP;

	private initialBackoffDurationMS = 30000;

	private backoff: NodeJS.Timeout;

	private retries = 0;

	constructor(
		imapConfig: IMAP.Config,
		private options: IMAPOptions = {
			deleteAfterRead: false,
			filter: ['!SEEN'],
			markSeen: true,
			maxRetries: 10,
		},
	) {
		super();

		this.imap = new IMAP({
			connTimeout: 300000,
			keepalive: true,
			...imapConfig,
		});

		// On successfully connected.
		this.imap.on('ready', () => {
			if (this.imap.state !== 'disconnected') {
				clearTimeout(this.backoff);
				this.openInbox((err) => {
					if (err) {
						logger.error('Error occurred during imap inbox opening: ', err);
						throw err;
					}
					// fetch new emails & wait [IDLE]
					this.getEmails();

					// If new message arrived, fetch them
					this.imap.on('mail', () => {
						this.getEmails();
					});
				});
			} else {
				logger.error('IMAP did not connect.');
				this.imap.end();
			}
		});

		this.imap.on('error', (err: Error) => {
			logger.error('Error occurred: ', err);
			throw err;
		});

		this.imap.on('close', () => {
			this.reconnect();
		});
	}

	openInbox(cb: (error: Error, mailbox: Connection.Box) => void): void {
		this.imap.openBox('INBOX', false, cb);
	}

	start(): void {
		this.imap.connect();
	}

	isActive(): boolean {
		if (this.imap && this.imap.state && this.imap.state === 'disconnected') {
			return false;
		}

		return true;
	}

	stop(callback = new Function()): void {
		this.imap.end();
		this.imap.once('end', callback);
	}

	restart(): void {
		this.stop(() => {
			logger.info('Restarting IMAP ....');
			this.start();
		});
	}

	reconnect(): void {
		const loop = (): void => {
			this.start();
			if (this.retries < this.options.maxRetries) {
				this.retries += 1;
				this.initialBackoffDurationMS *= 2;
				this.backoff = setTimeout(loop, this.initialBackoffDurationMS);
			} else {
				logger.error('IMAP reconnection failed.');
			}
		};
		this.backoff = setTimeout(loop, this.initialBackoffDurationMS);
	}

	// Fetch all UNSEEN messages and pass them for further processing
	getEmails(): void {
		this.imap.search(this.options.filter, (err, newEmails) => {
			if (err) {
				logger.error(err);
				throw err;
			}
			// newEmails => array containing serials of unseen messages
			if (newEmails.length > 0) {
				const fetch = this.imap.fetch(newEmails, {
					bodies: ['HEADER', 'TEXT', ''],
					struct: true,
					markSeen: this.options.markSeen,
				});

				fetch.on('message', (msg, seqno) => {
					logger.info('Message received', seqno);

					msg.on('body', (stream, type) => {
						if (type.which !== '') {
							return;
						}

						simpleParser(stream, (_err, email) => {
							if (this.options.rejectBeforeTS && email.date && email.date < this.options.rejectBeforeTS) {
								logger.error('Rejecting email', email.subject);
								return;
							}
							this.emit('email', email);
						});
					});

					// On fetched each message, pass it further
					msg.once('end', () => {
						// delete message from inbox
						if (this.options.deleteAfterRead) {
							this.imap.seq.addFlags(seqno, 'Deleted', (err) => {
								if (err) {
									logger.error(`Mark deleted error: ${err}`);
								}
							});
						}
					});
				});

				fetch.once('error', (err) => {
					logger.error(`Fetch error: ${err}`);
				});
			}
		});
	}
}
