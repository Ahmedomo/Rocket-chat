import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { Tracker } from 'meteor/tracker';
import { EmojiPicker } from '../../emoji';
import { katex } from '../../katex';
import { Markdown } from '../../markdown';
import { ChatSubscription } from '../../models';
import { settings } from '../../settings';
import {
	AudioRecorder,
	ChatMessages,
	chatMessages,
	fileUpload,
	KonchatNotification,
} from '../../ui';
import { Layout, messageBox, popover, RoomManager, call } from '../../ui-utils';
import { t, roomTypes, getUserPreference } from '../../utils';
import moment from 'moment';

import './messageBoxReplyPreview';
import './messageBoxTyping';
import './messageBoxAudioMessage';
import './messageBoxNotSubscribed';
import './messageBox.html';

const formattingButtons = [
	{
		label: 'bold',
		icon: 'bold',
		pattern: '*{{text}}*',
		command: 'b',
		condition: () => Markdown && settings.get('Markdown_Parser') === 'original',
	},
	{
		label: 'bold',
		icon: 'bold',
		pattern: '**{{text}}**',
		command: 'b',
		condition: () => Markdown && settings.get('Markdown_Parser') === 'marked',
	},
	{
		label: 'italic',
		icon: 'italic',
		pattern: '_{{text}}_',
		command: 'i',
		condition: () => Markdown && settings.get('Markdown_Parser') !== 'disabled',
	},
	{
		label: 'strike',
		icon: 'strike',
		pattern: '~{{text}}~',
		condition: () => Markdown && settings.get('Markdown_Parser') === 'original',
	},
	{
		label: 'strike',
		icon: 'strike',
		pattern: '~~{{text}}~~',
		condition: () => Markdown && settings.get('Markdown_Parser') === 'marked',
	},
	{
		label: 'inline_code',
		icon: 'code',
		pattern: '`{{text}}`',
		condition: () => Markdown && settings.get('Markdown_Parser') !== 'disabled',
	},
	{
		label: 'multi_line',
		icon: 'multiline',
		pattern: '```\n{{text}}\n``` ',
		condition: () => Markdown && settings.get('Markdown_Parser') !== 'disabled',
	},
	{
		label: 'KaTeX',
		text: () => {
			if (!katex.isEnabled()) {
				return;
			}
			if (katex.isDollarSyntaxEnabled()) {
				return '$$KaTeX$$';
			}
			if (katex.isParenthesisSyntaxEnabled()) {
				return '\\[KaTeX\\]';
			}
		},
		link: 'https://khan.github.io/KaTeX/function-support.html',
		condition: () => katex.isEnabled(),
	},
];


function applyFormatting(event, instance) {
	event.preventDefault();
	const { input } = chatMessages[RoomManager.openedRoom];
	const { selectionEnd = input.value.length, selectionStart = 0 } = input;
	const initText = input.value.slice(0, selectionStart);
	const selectedText = input.value.slice(selectionStart, selectionEnd);
	const finalText = input.value.slice(selectionEnd, input.value.length);

	const [btn] = instance.findAll(`.js-format[aria-label=${ this.label }]`);
	if (btn) {
		btn.classList.add('active');
		setTimeout(() => {
			btn.classList.remove('active');
		}, 100);
	}
	input.focus();

	const startPattern = this.pattern.substr(0, this.pattern.indexOf('{{text}}'));
	const startPatternFound = [...startPattern].reverse().every((char, index) => input.value.substr(selectionStart - index - 1, 1) === char);

	if (startPatternFound) {
		const endPattern = this.pattern.substr(this.pattern.indexOf('{{text}}') + '{{text}}'.length);
		const endPatternFound = [...endPattern].every((char, index) => input.value.substr(selectionEnd + index, 1) === char);

		if (endPatternFound) {
			input.selectionStart = selectionStart - startPattern.length;
			input.selectionEnd = selectionEnd + endPattern.length;

			if (!document.execCommand || !document.execCommand('insertText', false, selectedText)) {
				input.value = initText.substr(0, initText.length - startPattern.length) + selectedText + finalText.substr(endPattern.length);
			}

			input.selectionStart = selectionStart - startPattern.length;
			input.selectionEnd = input.selectionStart + selectedText.length;
			$(input).change();
			return;
		}
	}

	if (!document.execCommand || !document.execCommand('insertText', false, this.pattern.replace('{{text}}', selectedText))) {
		input.value = initText + this.pattern.replace('{{text}}', selectedText) + finalText;
	}

	input.selectionStart = selectionStart + this.pattern.indexOf('{{text}}');
	input.selectionEnd = input.selectionStart + selectedText.length;
	$(input).change();
}


Template.messageBox.onCreated(function() {
	EmojiPicker.init();
	this.replyMessageData = new ReactiveVar();
	this.isMessageFieldEmpty = new ReactiveVar(true);
	this.isMicrophoneDenied = new ReactiveVar(true);
	this.sendIconDisabled = new ReactiveVar(false);
	this.currentMessageRendered = new ReactiveVar();
	messageBox.emit('created', this);

	navigator.permissions.query({ name: 'microphone' })
		.then((permissionStatus) => {
			this.isMicrophoneDenied.set(permissionStatus.state === 'denied');
			permissionStatus.onchange = () => {
				this.isMicrophoneDenied.set(permissionStatus.state === 'denied');
			};
		});
});

Template.messageBox.onRendered(function() {
	this.autorun(() => {
		const subscribed = roomTypes.verifyCanSendMessage(this.data._id);

		Tracker.afterFlush(() => {
			const input = subscribed && this.find('.js-input-message');

			if (!input) {
				return;
			}

			const $input = $(input);
			$input.on('dataChange', () => { // TODO: remove jQuery event layer dependency
				const reply = $input.data('reply');
				this.replyMessageData.set(reply);
			});

			$input.autogrow({
				animate: true,
				onInitialize: true,
			})
				.on('autogrow', () => {
					this.data && this.data.onResize && this.data.onResize();
				});

			chatMessages[RoomManager.openedRoom] = chatMessages[RoomManager.openedRoom] || new ChatMessages;
			chatMessages[RoomManager.openedRoom].input = input;
		});
	});
});

Template.messageBox.helpers({
	preview() {
		return 	Template.instance().currentMessageRendered.get();
	},
	isEmbedded() {
		return Layout.isEmbedded();
	},
	subscribed() {
		return roomTypes.verifyCanSendMessage(this._id);
	},
	canSend() {
		if (roomTypes.readOnly(this._id, Meteor.user())) {
			return false;
		}
		if (roomTypes.archived(this._id)) {
			return false;
		}
		const roomData = Session.get(`roomData${ this._id }`);
		if (roomData && roomData.t === 'd') {
			const subscription = ChatSubscription.findOne({
				rid: this._id,
			}, {
				fields: {
					archived: 1,
					blocked: 1,
					blocker: 1,
				},
			});
			if (subscription && (subscription.archived || subscription.blocked || subscription.blocker)) {
				return false;
			}
		}
		return true;
	},
	popupConfig() {
		const template = Template.instance();
		return {
			getInput() {
				return template.find('.js-input-message');
			},
		};
	},
	input() {
		return Template.instance().find('.js-input-message');
	},
	replyMessageData() {
		return Template.instance().replyMessageData.get();
	},
	isEmojiEnabled() {
		return getUserPreference(Meteor.userId(), 'useEmojis');
	},
	maxMessageLength() {
		return settings.get('Message_AllowConvertLongMessagesToAttachment') ? null : settings.get('Message_MaxAllowedSize');
	},
	isSendIconDisabled() {
		return !Template.instance().sendIconDisabled.get();
	},
	isAudioMessageAllowed() {
		return AudioRecorder.isSupported() &&
			!Template.instance().isMicrophoneDenied.get() &&
			settings.get('FileUpload_Enabled') &&
			settings.get('Message_AudioRecorderEnabled') &&
			(!settings.get('FileUpload_MediaTypeWhiteList') ||
			settings.get('FileUpload_MediaTypeWhiteList').match(/audio\/mp3|audio\/\*/i));
	},
	actions() {
		const actionGroups = messageBox.actions.get();
		return Object.values(actionGroups)
			.reduce((actions, actionGroup) => [...actions, ...actionGroup], []);
	},
	isAnonymousOrJoinCode() {
		const room = Session.get(`roomData${ this._id }`);
		return !Meteor.userId() || (!ChatSubscription.findOne({
			rid: this._id,
		}) && room && room.joinCodeRequired);
	},
	showFormattingTips() {
		return settings.get('Message_ShowFormattingTips');
	},
	formattingButtons() {
		return formattingButtons.filter((button) => !button.condition || button.condition());
	},
	isBlockedOrBlocker() {
		const roomData = Session.get(`roomData${ this._id }`);
		if (roomData && roomData.t === 'd') {
			const subscription = ChatSubscription.findOne({
				rid: this._id,
			}, {
				fields: {
					blocked: 1,
					blocker: 1,
				},
			});
			if (subscription && (subscription.blocked || subscription.blocker)) {
				return true;
			}
		}
	},
});

Template.messageBox.events({
	'click .js-join'(event) {
		event.stopPropagation();
		event.preventDefault();

		const joinCodeInput = Template.instance().find('[name=joinCode]');
		const joinCode = joinCodeInput && joinCodeInput.value;

		call('joinRoom', this._id, joinCode);
	},

	'click .emoji-picker-icon'(event) {
		event.stopPropagation();
		event.preventDefault();

		if (!getUserPreference(Meteor.userId(), 'useEmojis')) {
			return;
		}

		if (EmojiPicker.isOpened()) {
			EmojiPicker.close();
			return;
		}

		EmojiPicker.open(event.currentTarget, (emoji) => {
			const emojiValue = `:${ emoji }: `;
			const { input } = chatMessages[RoomManager.openedRoom];

			const caretPos = input.selectionStart;
			const textAreaTxt = input.value;

			input.focus();
			if (!document.execCommand || !document.execCommand('insertText', false, emojiValue)) {
				input.value = textAreaTxt.substring(0, caretPos) + emojiValue + textAreaTxt.substring(caretPos);
				input.focus();
			}

			input.selectionStart = caretPos + emojiValue.length;
			input.selectionEnd = caretPos + emojiValue.length;
		});
	},
	'focus .js-input-message'(event, instance) {
		KonchatNotification.removeRoomNotification(this._id);
		if (chatMessages[this._id]) {
			chatMessages[this._id].input = instance.find('.js-input-message');
		}
	},
	'click .cancel-reply'(event, instance) {

		const input = instance.find('.js-input-message');
		const messages = $(input).data('reply') || [];
		const filtered = messages.filter((msg) => msg._id !== this._id);

		$(input)
			.data('reply', filtered)
			.trigger('dataChange');
	},
	'keyup .js-input-message'(event, instance) {
		chatMessages[this._id].keyup(this._id, event, instance);
		instance.isMessageFieldEmpty.set(chatMessages[this._id].isEmpty());
	},
	'paste .js-input-message'(event, instance) {
		const { $input } = chatMessages[RoomManager.openedRoom];
		const [input] = $input;
		setTimeout(() => {
			typeof input.updateAutogrow === 'function' && input.updateAutogrow();
		}, 50);

		if (!event.originalEvent.clipboardData) {
			return;
		}

		const files = [...event.originalEvent.clipboardData.items]
			.filter((item) => (item.kind === 'file' && item.type.indexOf('image/') !== -1))
			.map((item) => ({
				file: item.getAsFile(),
				name: `Clipboard - ${ moment().format(settings.get('Message_TimeAndDateFormat')) }`,
			}))
			.filter(({ file }) => file !== null);

		if (files.length) {
			event.preventDefault();
			fileUpload(files, input);
			return;
		}

		instance.isMessageFieldEmpty.set(false);
	},
	'keydown .js-input-message'(event, instance) {
		const isMacOS = navigator.platform.indexOf('Mac') !== -1;
		if (isMacOS && (event.metaKey || event.ctrlKey)) {
			const action = formattingButtons.find(
				(action) => action.command === event.key.toLowerCase() && (!action.condition || action.condition()));
			action && applyFormatting.apply(action, [event, instance]);
		}
		chatMessages[this._id].keydown(this._id, event, Template.instance());
	},
	'input .js-input-message'(event, instance) {
		instance.sendIconDisabled.set(event.target.value !== '');
		chatMessages[this._id].valueChanged(this._id, event, Template.instance());
		
		let msg = $('.js-input-message')[0].value;

		msg = msg.trim();

		msg = msg.replace(/(|&gt;|[ >_~`])\*{1,2}([^\*\r\n]+)\*{1,2}([<_~`]|\B|\b|$)/gm, '$1<span class="copyonly">*</span><strong>$2</strong><span class="copyonly">*</span>$3');

		// Support _text_ to make italics
		msg = msg.replace(/(^|&gt;|[ >*~`])\_{1,2}([^\_\r\n]+)\_{1,2}([<*~`]|\B|\b|$)/gm, '$1<span class="copyonly">_</span><em>$2</em><span class="copyonly">_</span>$3');

		// Support ~text~ to strike through text
		msg = msg.replace(/(^|&gt;|[ >_*`])\~{1,2}([^~\r\n]+)\~{1,2}([<_*`]|\B|\b|$)/gm, '$1<span class="copyonly">~</span><strike>$2</strike><span class="copyonly">~</span>$3');

		// Support for block quote
		// >>>
		// Text
		// <<<
		msg = msg.replace(/(?:&gt;){3}\n+([\s\S]*?)\n+(?:&lt;){3}/g, '<blockquote class="background-transparent-darker-before"><span class="copyonly">&gt;&gt;&gt;</span>$1<span class="copyonly">&lt;&lt;&lt;</span></blockquote>');

		// Support >Text for quote
		msg = msg.replace(/^&gt;(.*)$/gm, '<blockquote class="background-transparent-darker-before"><span class="copyonly">&gt;</span>$1</blockquote>');

		// Remove white-space around blockquote (prevent <br>). Because blockquote is block element.
		msg = msg.replace(/\s*<blockquote class="background-transparent-darker-before">/gm, '<blockquote class="background-transparent-darker-before">');
		msg = msg.replace(/<\/blockquote>\s*/gm, '</blockquote>');

		// Remove new-line between blockquotes.
		msg = msg.replace(/<\/blockquote>\n<blockquote/gm, '</blockquote><blockquote');

		// Supports multiline text
		msg = msg.replace(/\n/gm, '<br>');

		Template.instance().currentMessageRendered.set(msg);

	},
	'propertychange .js-input-message'(event) {
		if (event.originalEvent.propertyName === 'value') {
			chatMessages[this._id].valueChanged(this._id, event, Template.instance());
		}
	},
	async 'click .js-send'(event, instance) {
		const { input } = chatMessages[RoomManager.openedRoom];
		chatMessages[this._id].send(this._id, input, () => {
			input.updateAutogrow();
			instance.isMessageFieldEmpty.set(chatMessages[this._id].isEmpty());
			input.focus();
		});
	},
	'click .rc-message-box__action-menu'(event) {
		const groups = messageBox.actions.get();
		const config = {
			popoverClass: 'message-box',
			columns: [
				{
					groups: Object.keys(groups).map((group) => {
						const items = [];
						groups[group].forEach((item) => {
							items.push({
								icon: item.icon,
								name: t(item.label),
								type: 'messagebox-action',
								id: item.id,
							});
						});
						return {
							title: t(group),
							items,
						};
					}),
				},
			],
			offsetVertical: 10,
			direction: 'top-inverted',
			currentTarget: event.currentTarget.firstElementChild.firstElementChild,
			data: {
				rid: this._id,
			},
			activeElement: event.currentTarget,
		};

		popover.open(config);
	},
	'click .js-message-actions .js-message-action'(event, instance) {
		this.action.apply(this, [{
			rid: Template.parentData()._id,
			messageBox: instance.find('.rc-message-box'),
			element: event.currentTarget,
			event,
		}]);
	},
	'click .js-format'(e, t) {
		applyFormatting.apply(this, [e, t]);
	},
});
