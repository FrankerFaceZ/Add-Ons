'use strict';

import { getSystem } from './service';
import STYLE_URL from './styles.scss';

const { createElement } = FrankerFaceZ.utilities.dom;

class Pluralmind extends Addon {
	constructor(...args) {
		super(...args);

		this.inject('chat');
		this.inject('site');
		this.inject('site.fine');

		this.ChatLine = this.fine.define(
			'pm-chat-line',
			n => n.renderDefaultMessage || n.props?.message,
			this.site.constructor.CHAT_ROUTES,
		);
	}

	onEnable() {
		if (!this.styleLink) {
			document.head.appendChild(this.styleLink = createElement('link', {
				href: STYLE_URL,
				rel: 'stylesheet',
				type: 'text/css',
				crossOrigin: 'anonymous',
			}));
		}

		this.chat.addTokenizer({
			type: 'pluralmind',
			priority: 19,
			process: (tokens, msg) => this.onMessage(tokens, msg),
		});

		this.ChatLine.each(inst => this.updateLine(inst))
		this.ChatLine.on('mount', this.updateLine, this);
		this.ChatLine.on('update', this.updateLine, this);

		this.emit('chat:update-lines');
	}

	onDisable() {
		this.chat.removeTokenizer('pluralmind');
		this.ChatLine.off('mount', this.updateLine, this);
		this.ChatLine.off('update', this.updateLine, this);
		if (this.styleLink) {
			this.styleLink.remove();
			this.styleLink = null;
		}
		this.emit('chat:update-lines');
	}

	onMessage(tokens, msg) {
		// Sanity check this is a message we can work with
		const id = msg?.user?.id;
		const login = msg?.user?.login;
		const targetToken = this.getTargetToken(tokens);
		if (!id || !login || !targetToken) return tokens;

		// Since the tokenizer is synchronous, we get any existing data we have
		// and prepare a callback in case new data ends up being loaded
		const system = getSystem(id, () => this.systemLoaded(id, login));

		// Bail out if we don't have information on this system (yet)
		// If we end up loading system info, onMessage will get re-run by the
		// callback
		if (!system) return tokens;

		// Check if we should proxy this message
		const { member, body } = this.getMessageProxyInfo(system, targetToken.text);
		if (!member) return tokens;

		// Apply this member's info
		msg.ffz_user_class = msg.ffz_user_class || new Set();
		msg.ffz_user_style = msg.ffz_user_style || {};
		msg.ffz_user_props = msg.ffz_user_props || {};
		const pronouns = member.pronouns ?? system.pronouns;
		const color = member.color ?? system.color;
		msg.user.displayName = member.name;
		if (pronouns) {
			msg.ffz_user_props['data-pm-pronouns'] = pronouns;
		} else {
			delete msg.ffz_user_props['data-pm-pronouns'];
		}
		msg.ffz_user_class.add('pm-proxied');
		if (color) msg.ffz_user_style.color = color;
		targetToken.text = body;

		return tokens;
	}

	systemLoaded(id, login) {
		this.emit('chat:update-lines-by-user', id, login, true, true);

		// Ensure our pronouns class gets added to the message's root element
		// (which isn't affected by update-lines-by-user)
		for (const line of this.ChatLine.instances) {
			const user = line.props?.message?.user;
			if (user && ((id && id == user.id) || (login && login == user.login))) this.updateLine(line);
		}
	}

	getTargetToken(tokens) {
		// Find the first text token
		for (const token of tokens) {
			if (token.type === 'text') return token;
		}
		return null;
	}

	getMessageProxyInfo(system, body) {
		if (!system) return { member: null, body };

		// Start with the system's autoproxy, if one is set
		let member = null;
		if (system.autoproxy_member_id) member = system.members.find(m => m.id === system.autoproxy_member_id);

		// Let's see if the user used a proxy
		const splitByColon = body.split(': ');
		if (splitByColon.length >= 2) {
			const proxyPrefix = splitByColon[0];
			const rest = splitByColon.slice(1).join(': ');
			const proxiedMember = system.members.find(m => {
				if (m.case_sensitive) return m.proxies.includes(proxyPrefix);
				return m.proxies.some(p => p.toLowerCase() === proxyPrefix.toLowerCase());
			});
			if (proxiedMember) {
				member = proxiedMember;
				body = rest;
			}
		}

		return { member, body };
	}

	updateLine(line) {
		const node = this.fine.getHostNode(line);
		if (!(node instanceof HTMLElement)) return;

		const msg = line.props?.message;
		const id = msg?.user?.id;
		if (!id || !msg.message) return;

		// Check if this is a proxied message that included custom pronouns
		const system = getSystem(id);
		const { member } = this.getMessageProxyInfo(system, msg.message);
		const hasPmPronouns = member && !!(member.pronouns ?? system.pronouns);

		// Mark that we're showing pronouns so we can hide alejo's
		node.classList.toggle('pm-pronouns', hasPmPronouns);
	}
}

Pluralmind.register();
