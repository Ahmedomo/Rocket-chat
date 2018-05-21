import s from 'underscore.string';

import { RocketChatTabBar } from 'meteor/rocketchat:lib';

Template.adminBots.helpers({
	isReady() {
		const instance = Template.instance();
		return instance.ready && instance.ready.get();
	},
	bots() {
		return Template.instance().bots();
	},
	isLoading() {
		const instance = Template.instance();
		if (!(instance.ready && instance.ready.get())) {
			return 'btn-loading';
		}
	},
	hasMore() {
		const instance = Template.instance();
		const bots = instance.bots();
		if (instance.limit && instance.limit.get() && bots && bots.length) {
			return instance.limit.get() === bots.length;
		}
	},
	framework() {
		return 'Placeholder';
	},
	flexData() {
		return {
			tabBar: Template.instance().tabBar,
			data: Template.instance().tabBarData.get()
		};
	}
});

Template.adminBots.onCreated(function() {
	const instance = this;
	this.limit = new ReactiveVar(50);
	this.filter = new ReactiveVar('');
	this.ready = new ReactiveVar(true);
	this.tabBar = new RocketChatTabBar();
	this.tabBar.showGroup(FlowRouter.current().route.name);
	this.tabBarData = new ReactiveVar;
	RocketChat.TabBar.addButton({
		groups: ['admin-bots'],
		id: 'add-bot',
		i18nTitle: 'Add_Bot',
		icon: 'plus',
		template: 'adminBotCreate',
		order: 1
	});
	RocketChat.TabBar.addButton({
		groups: ['admin-bots'],
		id: 'admin-bot-info',
		i18nTitle: 'Bot_Info',
		icon: 'hubot',
		template: 'adminBotInfo',
		order: 2
	});
	this.autorun(function() {
		const filter = instance.filter.get();
		const limit = instance.limit.get();
		const subscription = instance.subscribe('fullUserData', filter, limit);
		instance.ready.set(subscription.ready());
	});
	this.bots = function() {
		let filter;
		let query = {
			type: 'bot'
		};

		if (instance.filter && instance.filter.get()) {
			filter = s.trim(instance.filter.get());
		}

		if (filter) {
			const filterReg = new RegExp(s.escapeRegExp(filter), 'i');
			query = {$or: [{ username: filterReg }, { name: filterReg}, { framework: filterReg }]};
		}

		const limit = instance.limit && instance.limit.get();
		return Meteor.users.find(query, { limit, sort: { username: 1, name: 1 } }).fetch();
	};
});

Template.adminBots.onRendered(function() {
	Tracker.afterFlush(function() {
		SideNav.setFlex('adminFlex');
		SideNav.openFlex();
	});
});

Template.adminBots.events({
	'keydown #users-filter'(e) {
		if (e.which === 13) {
			e.stopPropagation();
			e.preventDefault();
		}
	},
	'keyup #users-filter'(e, t) {
		e.stopPropagation();
		e.preventDefault();
		t.filter.set(e.currentTarget.value);
	},
	'click .user-info'(e, instance) {
		e.preventDefault();
		instance.tabBarData.set(Meteor.users.findOne(this._id));
		instance.tabBar.open('admin-bot-info');
	},
	'click .info-tabs button'(e) {
		e.preventDefault();
		$('.info-tabs button').removeClass('active');
		$(e.currentTarget).addClass('active');
		$('.user-info-content').hide();
		$($(e.currentTarget).attr('href')).show();
	},
	'click .load-more'(e, t) {
		e.preventDefault();
		e.stopPropagation();
		t.limit.set(t.limit.get() + 50);
	}
});
