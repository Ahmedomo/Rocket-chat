import Page from './Page';

class SideNav extends Page {
	// New channel
	get channelType() { return browser.element('.create-channel__content .rc-switch__button'); }
	get channelReadOnly() { return browser.elements('.create-channel__switches .rc-switch__button').value[1]; }
	get channelName() { return browser.element('.create-channel__content input[name="name"]'); }
	get saveChannelBtn() { return browser.element('.create-channel__content button[data-button="create"]'); }

	// Account box
	get accountBoxUserName() { return browser.element('.sidebar__account-username'); }
	get accountBoxUserAvatar() { return browser.element('.sidebar__account .avatar-image'); }
	get accountMenu() { return browser.element('.sidebar__account-menu'); }
	get popOverContent() { return browser.element('.rc-popover__content'); }
	get statusOnline() { return browser.element('[data-status="online"]'); }
	get statusAway() { return browser.element('[data-status="away"]'); }
	get statusBusy() { return browser.element('[data-status="busy"]'); }
	get statusOffline() { return browser.element('[data-status="offline"]'); }
	get account() { return browser.element('[data-open="account"]'); }
	get admin() { return browser.element('[data-open="administration"]'); }
	get logout() { return browser.element('[data-open="logout"]'); }
	get sideNavBar() { return browser.element('.sidebar'); }

	// Toolbar
	get spotlightSearch() { return browser.element('.toolbar__search input'); }
	get spotlightSearchPopUp() { return browser.element('.rooms-list__toolbar-search'); }
	get newChannelBtn() { return browser.element('.toolbar .toolbar__search-create-channel'); }
	get newChannelIcon() { return browser.element('.toolbar__icon.toolbar__search-create-channel'); }

	// Rooms List
	get general() { return this.getChannelFromList('general'); }
	get channelLeave() { return browser.element('.leave-room'); }
	get channelHoverIcon() { return browser.element('.rooms-list > .wrapper > ul [title="general"] .icon-eye-off'); }
	get moreChannels() { return browser.element('.rooms-list .more-channels'); }

	// Account
	get preferences() { return browser.element('[href="/account/preferences"]'); }
	get profile() { return browser.element('[href="/account/profile"]'); }
	get avatar() { return browser.element('[href="/changeavatar"]'); }
	get preferencesClose() { return browser.element('.sidebar-flex__back-button[data-action="back"]'); }

	get burgerBtn() { return browser.element('.burger'); }

	// Opens a channel via rooms list
	openChannel(channelName) {
		browser.waitForVisible(`.sidebar-item__name=${ channelName }`, 5000);
		browser.click(`.sidebar-item__name=${ channelName }`);
		browser.waitForVisible('.rc-message-box__container textarea', 5000);
		browser.waitUntil(function() {
			browser.waitForVisible('.fixed-title .room-title', 8000);
			return browser.getText('.fixed-title .room-title') === channelName;
		}, 10000);
	}

	// Opens a channel via spotlight search
	searchChannel(channelName) {
		browser.waitForVisible('.fixed-title .room-title', 15000);
		const currentRoom = browser.element('.fixed-title .room-title').getText();
		if (currentRoom !== channelName) {
			this.spotlightSearch.waitForVisible(5000);
			this.spotlightSearch.click();
			this.spotlightSearch.setValue(channelName);
			browser.waitForVisible(`[title='${ channelName }']`, 5000);
			browser.click(`[title='${ channelName }']`);
			browser.waitUntil(function() {
				browser.waitForVisible('.fixed-title .room-title', 8000);
				return browser.getText('.fixed-title .room-title') === channelName;
			}, 10000);

		}
	}

	// Gets a channel from the spotlight search
	getChannelFromSpotlight(channelName) {
		browser.waitForVisible('.fixed-title .room-title', 15000);
		const currentRoom = browser.element('.fixed-title .room-title').getText();
		console.log(currentRoom, channelName);
		if (currentRoom !== channelName) {
			this.spotlightSearch.waitForVisible(5000);
			this.spotlightSearch.click();
			this.spotlightSearch.setValue(channelName);
			browser.waitForVisible(`.sidebar-item__name=${ channelName }`, 5000);
			return browser.element(`.sidebar-item__name=${ channelName }`);
		}
	}

	// Gets a channel from the rooms list
	getChannelFromList(channelName, reverse) {
		if (reverse == null) {
			browser.waitForVisible(`.sidebar-item__name=${ channelName }`, 5000);
		}
		return browser.element(`.sidebar-item__name=${ channelName }`);
	}

	createChannel(channelName, isPrivate, /*isReadOnly*/) {
		this.newChannelBtn.waitForVisible(10000);
		this.newChannelBtn.click();
		this.channelName.waitForVisible(10000);

		//workaround for incomplete setvalue bug
		this.channelName.setValue(channelName);

		browser.waitUntil(function() {
			return browser.isEnabled('.create-channel__content button[data-button="create"]');
		}, 5000);

		this.channelType.waitForVisible(10000);
		if (isPrivate) {
			this.channelType.click();
		}
		// if (isReadOnly) {
		// 	this.channelReadOnly.click();
		// }
		browser.pause(500);
		this.saveChannelBtn.click();
		// this.channelType.waitForVisible(5000, true);
		browser.pause(500);
	}
}

module.exports = new SideNav();
