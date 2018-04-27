import s from 'underscore.string';

const setSettingsAndGo = (settings, registerServer) => {
	const settingsFilter = Object.entries(settings)
		.filter(key => !/registration-|registerServer|currentStep/.test(key))
		.map(setting => {
			return {
				_id: setting[0],
				value: setting[1]
			};
		});

	settingsFilter.push({
		_id: 'Statistics_reporting',
		value: registerServer ? registerServer : true
	});

	RocketChat.settings.batchSet(settingsFilter, function(err) {
		if (err) {
			return handleError(err);
		}
	});

	localStorage.setItem('wizardFinal', true);
	FlowRouter.go('setup-wizard-final');
};

Template.setupWizard.onCreated(function() {
	if (localStorage.getItem('wizardFinal')) {
		FlowRouter.go('setup-wizard-final');
	}

	this.hasAdmin = new ReactiveVar(false);
	this.state = new ReactiveDict();
	this.wizardSettings = new ReactiveVar([]);
	this.invalidEmail = new ReactiveVar(false);
	Meteor.call('getWizardSettings', (error, result) => {
		if (result) {
			this.wizardSettings.set(result);
		}
	});

	const storage = JSON.parse(localStorage.getItem('wizard'));
	if (storage) {
		Object.entries(storage).forEach(([key, value]) => {
			this.state.set(key, value);
		});
	}

	Meteor.call('serverHasAdminUser', (error, result) => {
		if (result) {
			this.state.set('currentStep', 2);
		} else {
			this.state.set('currentStep', 1);
		}

		this.hasAdmin.set(result);
	});

	Tracker.autorun(() => {
		if (RocketChat.settings.get('Show_Setup_Wizard') !== undefined) {
			if (!RocketChat.settings.get('Show_Setup_Wizard')) {
				FlowRouter.go('home');
			}
		}
		const states = this.state.all();
		states['registration-pass'] = '';
		localStorage.setItem('wizard', JSON.stringify(states));
	});
});

Template.setupWizard.onRendered(function() {
	$('#initial-page-loading').remove();
});

Template.setupWizard.events({
	'click .setup-wizard-forms__footer-next'(e, t) {
		const currentStep = t.state.get('currentStep');
		const hasAdmin = t.hasAdmin.get();

		if (!hasAdmin && currentStep === 1) {
			const emailValue = t.state.get('registration-email');
			const invalidEmail = !/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]+\b/i.test(emailValue);
			t.invalidEmail.set(invalidEmail);

			if (invalidEmail) {
				return false;
			}
		}

		if (hasAdmin && currentStep === 3) {
			setSettingsAndGo(t.state.all());
			return false;
		}

		if (currentStep === 4) {
			const state = t.state.all();
			const registration = Object.entries(state).filter(key => /registration-/.test(key));
			const registrationData = Object.assign(...registration.map(d => ({[d[0].replace('registration-', '')]: d[1]})));

			Meteor.call('registerUser', registrationData, error => {
				if (error) {
					return handleError(error);
				}

				RocketChat.callbacks.run('userRegistered');

				Meteor.loginWithPassword(s.trim(registrationData.email), registrationData.pass, error => {
					if (error && error.error === 'error-invalid-email') {
						toastr.success(t('We_have_sent_registration_email'));
						return false;
					}

					Session.set('forceLogin', false);

					Meteor.call('setUsername', registrationData.username, error => {
						if (error) {
							return handleError(error);
						}

						RocketChat.callbacks.run('usernameSet');

						const register = t.state.get('registerServer') ? JSON.parse(t.state.get('registerServer')) : true;
						setSettingsAndGo(state, register ? register : true);
					});
				});
			});

			return false;
		}

		t.state.set('currentStep', currentStep + 1);
	},
	'click .setup-wizard-forms__footer-back'(e, t) {
		t.state.set('currentStep', t.state.get('currentStep') - 1);
	},
	'input .js-setting-data'(e, t) {
		t.state.set(e.currentTarget.name, e.currentTarget.value);
	}
});

Template.setupWizard.helpers({
	currentStep() {
		return Template.instance().state.get('currentStep');
	},
	itemModifier(step) {
		const current = Template.instance().state.get('currentStep');

		if (current === step) {
			return 'setup-wizard-info__steps-item--active';
		}

		if (current > step) {
			return 'setup-wizard-info__steps-item--past';
		}

		return '';
	},
	getValue(name) {
		return Template.instance().state.get(name);
	},
	selectedValue(setting, optionValue) {
		return Template.instance().state.get(setting) === optionValue;
	},
	isDisabled() {
		if (Template.instance().state.get('currentStep') === 1) {
			const state = Template.instance().state.all();

			if (Object.entries(state).filter(([key, value]) => /registration-/.test(key) && !value).length) {
				return 'disabled';
			}
		}

		return '';
	},
	headerTitle(step) {
		if (!step) {
			step = Template.instance().state.get('currentStep');
		}

		switch (step) {
			case 1: return t('Admin_Info');
			case 2: return t('Organization_Info');
			case 3: return t('Server_Info');
			case 4: return t('Register_Server');
		}
	},
	showStep() {
		const currentStep = Template.instance().state.get('currentStep');
		if (currentStep === 2 || currentStep === 3) {
			return 'setup-wizard-forms__content-step--active';
		}

		return '';
	},
	getSettings(step) {
		return Template.instance().wizardSettings.get()
			.filter(setting => setting.wizard.step === step)
			.sort((a, b) => a.wizard.order - b.wizard.order);
	},
	languages() {
		const languages = TAPi18n.getLanguages();

		const result = Object.entries(languages).map(language => {
			const obj = language[1];
			obj.key = language[0];
			return obj;
		}).sort((a, b) => a.key - b.key);

		result.unshift({
			'name': 'Default',
			'en': 'Default',
			'key': ''
		});

		return result;
	},
	siteUrl() {
		return RocketChat.settings.get('Site_Url');
	},
	hasAdmin() {
		return Template.instance().hasAdmin.get();
	},
	invalidEmail() {
		return Template.instance().invalidEmail.get();
	},
	showBackButton() {
		if (Template.instance().hasAdmin.get()) {
			if (Template.instance().state.get('currentStep') > 2) {
				return true;
			}

			return false;
		}

		if (Template.instance().state.get('currentStep') > 1) {
			return true;
		}

		return false;
	}
});

Template.setupWizardFinal.onCreated(function() {
	Tracker.autorun(() => {
		if (RocketChat.settings.get('Show_Setup_Wizard') !== undefined) {
			if (!RocketChat.settings.get('Show_Setup_Wizard')) {
				FlowRouter.go('home');
			}
		}
	});
});

Template.setupWizardFinal.onRendered(function() {
	$('#initial-page-loading').remove();
});

Template.setupWizardFinal.events({
	'click .js-finish'() {
		RocketChat.settings.set('Show_Setup_Wizard', false, function() {
			localStorage.removeItem('wizard');
			localStorage.removeItem('wizardFinal');
			FlowRouter.go('home');
		});
	}
});
