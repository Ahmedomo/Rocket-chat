import { Random } from 'meteor/random';
import _ from 'underscore';
import _marked from 'marked';
import createDOMPurify from 'dompurify';
import { unescapeHTML, escapeHTML } from '@rocket.chat/string-helpers';

import hljs, { register } from '../../hljs';
import { getGlobalWindow } from '../../getGlobalWindow';

const renderer = new _marked.Renderer();

// change Marked default paragraph rules in order to have line breaks (line breaks are normally considered as a new paragraph)
_marked.Lexer.rules.paragraph = new RegExp(_marked.Lexer.rules.paragraph.source.replace('[^\\n]+)*', '[^\\n|]*)*'), '');
_marked.Lexer.rules.gfm.paragraph = new RegExp(_marked.Lexer.rules.gfm.paragraph.source.replace('[^\\n]+)*', '[^\\n|]*)*'), '');

let msg = null;

renderer.code = function(code, lang, escaped) {
	if (this.options.highlight) {
		const out = this.options.highlight(code, lang);
		if (out != null && out !== code) {
			escaped = true;
			code = out;
		}
	}

	let text = null;

	if (!lang) {
		text = `<pre><code class="code-colors hljs">${ escaped ? code : escapeHTML(code) }</code></pre>`;
	} else {
		text = `<pre><code class="code-colors hljs ${ escape(lang, true) }">${ escaped ? code : escapeHTML(code) }</code></pre>`;
	}

	if (_.isString(msg)) {
		return text;
	}

	const token = `=!=${ Random.id() }=!=`;
	msg.tokens.push({
		highlight: true,
		token,
		text,
	});

	return token;
};

renderer.codespan = function(text) {
	text = `<code class="code-colors inline">${ text }</code>`;
	if (_.isString(msg)) {
		return text;
	}

	const token = `=!=${ Random.id() }=!=`;
	msg.tokens.push({
		token,
		text,
	});

	return token;
};

renderer.blockquote = function(quote) {
	return `<blockquote class="background-transparent-darker-before">${ quote }</blockquote>`;
};

const linkRenderer = renderer.link;
renderer.link = function(href, title, text) {
	const html = linkRenderer.call(renderer, href, title, text);
	return html.replace(/^<a /, '<a target="_blank" rel="nofollow noopener noreferrer" ');
};

const highlight = function(code, lang) {
	if (!lang) {
		return code;
	}
	try {
		register(lang);
		return hljs.highlight(lang, code).value;
	} catch (e) {
		// Unknown language
		return code;
	}
};

renderer.paragraph = function(text) {
	return text;
};

export const marked = (message, {
	marked: {
		gfm,
		tables,
		breaks,
		pedantic,
		smartLists,
		smartypants,
	} = {},
}) => {
	msg = message;

	if (!message.tokens) {
		message.tokens = [];
	}

	message.html = _marked(unescapeHTML(message.html), {
		gfm,
		tables,
		breaks,
		pedantic,
		smartLists,
		smartypants,
		renderer,
		highlight,
	});

	const window = getGlobalWindow();
	const DomPurify = createDOMPurify(window);
	message.html = DomPurify.sanitize(message.html, { ADD_ATTR: ['target'] });

	return message;
};
