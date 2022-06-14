import { Locator, expect } from '@playwright/test';

import BasePage from './BasePage';
import { IRegister } from '../interfaces/Login';

export default class LiveChat extends BasePage {
	btnOpenLiveChat(label: string): Locator {
		return this.getPage().locator(`[aria-label="${label}"]`);
	}

	get btnSounds(): Locator {
		return this.getPage().locator('header nav button[content="Sound is on"]');
	}

	get btnMinimize(): Locator {
		return this.getPage().locator('header nav button[content="Minimize chat"]');
	}

	get btnExpand(): Locator {
		return this.getPage().locator('header nav button[content="Expand chat"]');
	}

	get inputName(): Locator {
		return this.getPage().locator('[name="name"]');
	}

	get inputEmail(): Locator {
		return this.getPage().locator('[name="email"]');
	}

	get textAreaMessage(): Locator {
		return this.getPage().locator('[name="message"]');
	}

	btnSendMessage(btnText: string): Locator {
		return this.getPage().locator(`[type="submit"] >> text="${btnText}"`);
	}

	get btnOk(): Locator {
		return this.getPage().locator('button >> text="OK"');
	}

	get onlineAgentMessage(): Locator {
		return this.getPage().locator('[contenteditable="true"]');
	}

	get btnSendMessageToOnlineAgent(): Locator {
		return this.getPage().locator('footer div div div:nth-child(3) button');
	}

	public async renderAllElements(): Promise<void> {
		const elements = [
			this.inputName,
			this.inputEmail,
			this.textAreaMessage,
			this.btnSendMessage('Send'),
			this.btnSounds,
			this.btnMinimize,
			this.btnExpand,
		];
		await Promise.all(elements.map((element) => expect(element).toBeVisible()));
	}

	public async doSendMessage(liveChatUser: IRegister, isOffline = true): Promise<void> {
		const buttonLabel = isOffline ? 'Send' : 'Start chat';
		await this.inputName.type(liveChatUser.name);
		await this.inputEmail.type(liveChatUser.email);
		if (isOffline) {
			await this.textAreaMessage.type('any_message');
		}
		await this.btnSendMessage(buttonLabel).click();
	}
}
