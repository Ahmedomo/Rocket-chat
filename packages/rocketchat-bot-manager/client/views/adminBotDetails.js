import toastr from 'toastr';
import _ from 'underscore';

Template.adminBotDetails.onCreated(function _adminBotDetailsOnCreated() {
	this.bot = new ReactiveVar({});
	this.now = new ReactiveVar(new Date());
	this.statistics = new ReactiveVar({});
	this.changed = new ReactiveVar(false);
	this.ping = new ReactiveVar(undefined);

	/**
	 * Get new values of editable fields when saving the changes
	 */
	this.updateBot = () => {
		if (!RocketChat.authz.hasAllPermission('edit-bot-account')) {
			return;
		}

		const bot = this.bot.get();
		bot.name = $('[name=name]').val().trim();
		bot.username = $('[name=username]').val().trim();
		bot.password = $('[name=password]').val().trim();
		this.changed.set(true);
		this.bot.set(bot);
	};

	this.loadStatistics = (bot) => {
		Meteor.call('getBotServerStats', bot, (err, statistics) => {
			if (err) {
				return handleError(err);
			}
			const currentStats = _.assign(this.statistics.get(), statistics);
			this.statistics.set(currentStats);
		});
		if (this.isOnline(bot)) {
			Meteor.call('getBotLiveStats', bot, (err, statistics) => {
				if (err) {
					return handleError(err);
				}
				const currentStats = _.assign(this.statistics.get(), statistics);
				this.statistics.set(currentStats);
			});
		}
	};

	/**
	 * Retrieves the bot account from the database and makes first call
	 * to get its statistics
	 */
	this.autorun(() => {
		const username = this.data && this.data.params && this.data.params().username;

		if (username) {
			const sub = this.subscribe('fullUserData', username, 1);
			if (sub.ready()) {
				let bot;

				if (RocketChat.authz.hasAllPermission('manage-bot-account')) {
					bot = Meteor.users.findOne({ username });
				}

				if (bot) {
					this.bot.set(bot);
				} else {
					FlowRouter.go('admin-bots');
				}
			}
		}
	});

	/**
	 * Checks whether the bot is online
	 */
	this.isOnline = (bot) => bot.statusConnection && bot.statusConnection !== 'offline';

	/**
	 * Calls pingBot each second, always waiting for the previous call to finish
	 * or timeout, it then sets the ping variable to the value of the response time.
	 * Also updates the 'now' reactiveVar, to refresh the uptime views in the front-end.
	 */
	this.autorun(() => {
		let finished = true;
		const bot = this.bot.get();
		Meteor.clearInterval(this.interval);
		this.interval = Meteor.setInterval(() => {
			this.now.set(new Date());
			if (!finished || !this.isOnline(bot)) {
				return;
			}
			finished = false;
			Meteor.call('pingBot', bot, (err, ping) => {
				if (err) {
					this.ping.set(Infinity);
				} else {
					this.ping.set(ping);
				}
				finished = true;
			});
		}, 1000);
	});

	this.humanReadableTime = (time) => {
		const days = Math.floor(time / 86400);
		const hours = Math.floor((time % 86400) / 3600);
		const minutes = Math.floor(((time % 86400) % 3600) / 60);
		const seconds = Math.floor(((time % 86400) % 3600) % 60);
		let out = '';
		if (days > 0) {
			out += `${ days } ${ TAPi18n.__('days') }, `;
		}
		if (hours > 0) {
			out += `${ hours } ${ TAPi18n.__('hours') }, `;
		}
		if (minutes > 0) {
			out += `${ minutes } ${ TAPi18n.__('minutes') }, `;
		}
		if (seconds >= 0) {
			out += `${ seconds } ${ TAPi18n.__('seconds') }`;
		}
		return out;
	};
});

Template.adminBotDetails.onDestroyed(function _adminBotDetailsOnDestroyed() {
	// Clearing the interval which calls pingBot and updates 'now'
	Meteor.clearInterval(this.interval);
});

Template.adminBotDetails.helpers({
	hasPermission() {
		return RocketChat.authz.hasAllPermission('manage-bot-account');
	},

	getName() {
		const bot = Template.instance().bot.get();
		return bot.name;
	},

	getUsername() {
		const bot = Template.instance().bot.get();
		return bot.username;
	},

	getStack() {
		const bot = Template.instance().bot.get();
		if (bot.customClientData && bot.customClientData.stack) {
			return bot.customClientData.stack;
		}
	},

	getFramework() {
		const bot = Template.instance().bot.get();
		if (bot.customClientData && bot.customClientData.framework) {
			return bot.customClientData.framework;
		}
		return TAPi18n.__('Undefined');
	},

	getRoles() {
		const bot = Template.instance().bot.get();
		return bot.roles;
	},

	canPause() {
		const bot = Template.instance().bot.get();
		return bot.customClientData && bot.customClientData.canPauseResumeMsgStream;
	},

	isPaused() {
		const bot = Template.instance().bot.get();
		if (bot.customClientData) {
			return bot.customClientData.pausedMsgStream;
		}
	},

	isOnline() {
		const bot = Template.instance().bot.get();
		return Template.instance().isOnline(bot);
	},

	ipAddress() {
		const bot = Template.instance().bot.get();
		if (bot.customClientData) {
			return bot.customClientData.ipAddress;
		}
		return TAPi18n.__('Unknown');
	},

	canGetLogs() {
		const bot = Template.instance().bot.get();
		return bot.customClientData && bot.customClientData.canGetLogs;
	},

	canPing() {
		const bot = Template.instance().bot.get();
		return bot.customClientData && bot.customClientData.canListenToHeartbeat;
	},

	ping() {
		const ping = Template.instance().ping.get();
		return (ping === Infinity ? TAPi18n.__('Infinity') : `${ Math.round(ping) }ms`);
	},

	connectedUptime() {
		const bot = Template.instance().bot.get();
		const now = Template.instance().now.get();
		const diff = now.getTime() - bot.lastLogin.getTime();
		return Template.instance().humanReadableTime(diff / 1000);
	},

	activeUptime() {
		const bot = Template.instance().bot.get();
		const now = Template.instance().now.get();
		let diff = now.getTime() - bot.lastLogin.getTime();

		if (bot.customClientData.pausedMsgStream) {
			return TAPi18n.__('Paused');
		}

		if (bot.customClientData.msgStreamLastActive) {
			// Use min in case the bot relogs in but does not reset stream last active
			diff = Math.min(diff, now.getTime() - bot.customClientData.msgStreamLastActive.getTime());
		}
		return Template.instance().humanReadableTime(diff / 1000);
	},

	isChanged() {
		return Template.instance().changed.get();
	},

	disabled(cursor) {
		return cursor.length === 0 ? 'disabled' : '';
	},

	availableRoles() {
		const bot = Template.instance().bot.get();
		if (!bot.roles) {
			return [];
		}
		const { roles } = bot;
		return RocketChat.models.Roles.find({ _id: { $nin:roles }, scope: 'Users' }, { sort: { description: 1, _id: 1 } });
	},

	roleName() {
		return this.description || this._id;
	},

	statistics() {
		return Template.instance().statistics.get();
	},

	canDelete() {
		return RocketChat.authz.hasAllPermission('delete-bot-account');
	},

	canConvert() {
		return RocketChat.authz.hasAllPermission('edit-bot-account');
	},

	keyval(object) {
		return _.map(object, function(value, key) {
			return {
				key,
				value,
				description: `${ key }_description`,
			};
		});
	},
});

Template.adminBotDetails.events({
	'blur input': (e, t) => {
		t.updateBot();
	},

	'click .resume': (e, t) => {
		const bot = t.bot.get();
		$(e.currentTarget).closest('button').addClass('disabled');
		Meteor.call('resumeBot', bot, (err) => {
			$(e.currentTarget).closest('button').removeClass('disabled');
			if (err) {
				return toastr.error(TAPi18n.__('Bot_resumed_error'));
			}
			toastr.success(TAPi18n.__('Bot_resumed'));
		});
	},

	'click .pause': (e, t) => {
		const bot = t.bot.get();
		$(e.currentTarget).closest('button').addClass('disabled');
		Meteor.call('pauseBot', bot, (err) => {
			$(e.currentTarget).closest('button').removeClass('disabled');
			if (err) {
				return toastr.error(TAPi18n.__('Bot_paused_error'));
			}
			toastr.success(TAPi18n.__('Bot_paused'));
		});
	},

	'click .remove-role'(e, t) {
		e.stopPropagation();
		e.preventDefault();
		const bot = t.bot.get();
		bot.roles = bot.roles.filter((el) => el !== this.valueOf());
		t.bot.set(bot);
		$(`[title=${ this }]`).remove();
		t.updateBot();
	},

	'click #addRole'(e, t) {
		e.stopPropagation();
		e.preventDefault();
		if ($('#roleSelect').find(':selected').is(':disabled')) {
			return;
		}
		const bot = t.bot.get();
		bot.roles.push($('#roleSelect').val());
		t.bot.set(bot);
		$('#roleSelect').val('placeholder');
		t.updateBot();
	},

	'click .refresh': (e, t) => {
		$(e.currentTarget).closest('button').addClass('disabled');
		t.loadStatistics(t.bot.get());
		toastr.success(TAPi18n.__('Bot_Stats_refreshed'));
	},

	'click .expand': (e) => {
		$(e.currentTarget).closest('.section').removeClass('section-collapsed');
		$(e.currentTarget).closest('button').removeClass('expand').addClass('collapse').find('span').text(TAPi18n.__('Collapse'));
		$('.CodeMirror').each((index, codeMirror) => codeMirror.CodeMirror.refresh());
	},

	'click .collapse': (e) => {
		$(e.currentTarget).closest('.section').addClass('section-collapsed');
		$(e.currentTarget).closest('button').addClass('expand').removeClass('collapse').find('span').text(TAPi18n.__('Expand'));
	},

	'click .logs': (e, t) => {
		const bot = t.bot.get();
		return FlowRouter.go('admin-bots-log', { username: bot.username, bot });
	},

	'click .rc-header__section-button > .save': (e, t) => {
		const bot = t.bot.get();

		if (!RocketChat.authz.hasAllPermission('edit-bot-account')) {
			const error = new Meteor.Error('error-action-not-allowed', 'Editing bot is not allowed');
			return handleError(error);
		}

		Meteor.call('insertOrUpdateBot', bot, (err) => {
			if (err) {
				return handleError(err);
			}

			toastr.success(TAPi18n.__('Details_updated'));
			t.changed.set(false);
			FlowRouter.go('admin-bots-username', { username: bot.username });
		});
	},

	'click .rc-header__section-button > .delete': (e, instance) => {
		const bot = instance.bot.get();

		if (!RocketChat.authz.hasAllPermission('delete-bot-account')) {
			const error = new Meteor.Error('error-action-not-allowed', 'Deleting bot is not allowed');
			return handleError(error);
		}

		modal.open({
			title: t('Are_you_sure'),
			text: t('You_will_not_be_able_to_recover_account'),
			type: 'warning',
			showCancelButton: true,
			confirmButtonColor: '#DD6B55',
			confirmButtonText: t('Yes_delete_it'),
			cancelButtonText: t('Cancel'),
			closeOnConfirm: false,
			html: false,
		}, () => {
			Meteor.call('deleteBot', bot._id, (err) => {
				if (err) {
					return handleError(err);
				}

				modal.open({
					title: t('Deleted'),
					text: t('The_account_has_been_deleted'),
					type: 'success',
					timer: 1000,
					showConfirmButton: false,
				});

				FlowRouter.go('admin-bots');
			});
		});
	},

	'click .rc-header__section-button > .convert': (e, instance) => {
		const bot = instance.bot.get();

		if (!RocketChat.authz.hasAllPermission('edit-bot-account')) {
			const error = new Meteor.Error('error-action-not-allowed', 'Changing bot type is not allowed');
			return handleError(error);
		}

		const warningModal = (email) => {
			modal.open({
				title: t('Are_you_sure'),
				text: t('The_bot_will_become_a_user_and_its_roles_will_be_reset'),
				type: 'warning',
				showCancelButton: true,
				confirmButtonColor: '#DD6B55',
				confirmButtonText: t('Yes_convert_it'),
				cancelButtonText: t('Cancel'),
				closeOnConfirm: false,
				html: false,
			}, () => {
				Meteor.call('turnBotIntoUser', bot._id, email, (err) => {
					if (err) {
						return handleError(err);
					}

					modal.open({
						title: t('Converted'),
						text: t('Bot_is_now_a_user'),
						type: 'success',
						timer: 1000,
						showConfirmButton: false,
					});

					FlowRouter.go('admin-bots');
				});
			});
		};
		if (!bot.emails) {
			modal.open({
				title: t('Insert_email'),
				text: t('All_accounts_must_have_an_email'),
				type: 'input',
				showCancelButton: true,
				closeOnConfirm: false,
				inputPlaceholder: 'example@rocket.chat',
			}, (email) => warningModal(email));
		} else {
			warningModal();
		}
	},
});
