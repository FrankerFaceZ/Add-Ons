'use strict';

import { getCachedSystem, getProxiedMessage, getSystem } from 'pluralmind';

import STYLE_URL from './styles.scss';

const { createElement } = FrankerFaceZ.utilities.dom;

class Pluralmind extends Addon {
	constructor(...args) {
		super(...args);

		this.inject('chat');
		this.inject('site');
		this.inject('site.fine');
		this.inject('settings');

		this.ChatLine = this.fine.define(
			'pm-chat-line',
			n => n.renderDefaultMessage || n.props?.message,
			this.site.constructor.CHAT_ROUTES,
		);
	}

	onEnable() {
		this.settings.add('addon.pluralmind.show-usernames', {
			default: false,
			ui: {
				path: 'Add-Ons > Pluralmind',
				title: 'Show Twitch usernames on proxied messages',
				component: 'setting-check-box'
			},
			changed: () => this.emit('chat:update-lines'),
		});

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

		// Since the tokenizer is synchronous, we manually check if we have
		// usable data
		const cachedSystem = getCachedSystem(id)

		// Kick off a fresh load if we don't have any data, or it has expired
		if (!cachedSystem || cachedSystem.expired) {
			getSystem(id).then(() => this.systemLoaded(id, login));
		}

		// Bail out if we don't have information on this system (yet)
		// If we end up loading system info, onMessage will get re-run by the
		// systemLoaded callback
		const system = cachedSystem?.system;
		if (!system) return tokens;

		// Check if we should proxy this message
		const pm = getProxiedMessage(system, targetToken.text);
		if (!pm) return tokens;

		// We have a proxied message! Prep a few FFZ things
		msg.ffz_user_class = msg.ffz_user_class || new Set();
		msg.ffz_user_style = msg.ffz_user_style || {};
		msg.ffz_user_props = msg.ffz_user_props || {};
		const setUserProp = (key, value, condition) => {
			if (condition) {
				msg.ffz_user_props[key] = value;
			} else {
				delete msg.ffz_user_props[key];
			}
		};

		// onMessage can get called multiple times for the same message, so
		// we need to store a reference to the original display name
		if (!msg.ffz_user_props['data-pm-og-name']) {
			msg.ffz_user_props['data-pm-og-name'] = msg.user.displayName || msg.user.login;
		}

		// Apply this member's info
		msg.user.displayName = pm.member.name;
		setUserProp('data-pm-username', msg.ffz_user_props['data-pm-og-name'], this.settings.get('addon.pluralmind.show-usernames'));
		setUserProp('data-pm-pronouns', pm.pronouns, !!pm.pronouns);
		if (pm.color) msg.ffz_user_style.color = pm.color;

		// Mark the message as proxied and remove the proxy prefix (if present)
		msg.ffz_user_class.add('pm-proxied');
		targetToken.text = pm.body;

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

	updateLine(line) {
		const node = this.fine.getHostNode(line);
		if (!(node instanceof HTMLElement)) return;

		const msg = line.props?.message;
		const id = msg?.user?.id;
		if (!id || !msg.message) return;

		// Check if this is a proxied message
		const system = getCachedSystem(id)?.system;
		const pm = getProxiedMessage(system, msg.message);
		if (!pm) return;

		// Indicate whether we're showing our own pronouns so we can hide alejo's
		node.classList.toggle('pm-pronouns', !!pm.pronouns);
	}
}

Pluralmind.register();
