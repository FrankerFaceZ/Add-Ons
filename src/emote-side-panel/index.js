const {createElement} = FrankerFaceZ.utilities.dom;
import STYLE_URL from './styles.scss';

class EmoteSidePanel extends Addon {

	getContainer() {
		return document.querySelector(".chat-list--default,.chat-list--other");
	}

	getPanel() {
		const panel = document.querySelector('#emote_side_panel');
		if (panel) return panel;

		const newPanel = createElement('div', {
			id: 'emote_side_panel',
			class: 'ffz--esp'
		});

		const container = this.getContainer();
		container.style.setProperty("position", "relative");
		container.append(newPanel);

		return newPanel;
	}

	updatePadding() {
		// Had some problems changing the chat width, so for now i'll leave it fixed
		const padding = (this.emotes.length > 0) ? 50 : 50;
		this.getContainer().querySelector(".simplebar-content").style.setProperty('padding-right', padding + 'px');
	}

	updateCount(emote) {
		const len = emote.instances.length;
		emote.element.querySelector("span").innerHTML = ((len == 1) ? "" : "x" + len);
	}

	updateElement(emote) {
		const panel = this.getPanel();
		const el = emote.element;
		if (panel.lastChild !== el) {
			// Send emote to the end
			panel.removeChild(el);
			panel.appendChild(el);
			el.classList.add('animate')
			this.setRemoveAnimation(el);
		}
		this.updateCount(emote);
	}

	updatePanel() {
		this.updateTimer = null;

		// Remove old stuff
		const limit = (new Date()).getTime() - (this.timeout * 1000);
		const panel = this.getPanel();
		for (let i = this.emotes.length - 1; i >= 0; i--) {
			const emote = this.emotes[i];
			emote.instances = emote.instances.filter(e => e.time > limit);
			if (emote.instances.length == 0) {
				panel.removeChild(emote.element);
				this.emotes.splice(i, 1);
			} else {
				this.updateCount(emote);
			}
		}

		this.updatePadding();
		this.setUpdatePanel();
	}

	setUpdatePanel() {
		if (!this.updateTimer) this.updateTimer = window.setTimeout(() => this.updatePanel(), 350);
	}

	createEmoteElement(emote) {
		return (<div class='animate'>
			<span class='mult'></span>
			{this.chat.renderTokens([emote])}
		</div>)
	}

	clearEmotes() {
		this.emotes = [];
		this.getPanel().innerHTML = "";
	}

	setRemoveAnimation(el) {
		window.setTimeout(() => el.classList.remove('animate'), 200);
	}

	handleMessage(ctx, tokens, msg) {
		// Avoid handling the message twice
		if (msg.esp_handled) return tokens;
		msg.esp_handled = true;

		let removeMessage = false;

		let emoteOnly = true;
		for (const token of tokens) {
			if ((token.type === 'emote') || 
				(token.type === 'text' && /^(\s|[^\x20-\x7E])+$/g.test(token.text))) continue;
			emoteOnly = false;
			break;
		}

		const captureAll = ctx.context.get('emote_side_panel.capture_all');
		if (!emoteOnly && !captureAll) return tokens;

		const keepEmoteMessages = ctx.context.get('emote_side_panel.keep_messages');
		if (emoteOnly && !keepEmoteMessages) msg.ffz_removed = true;

		// Add emotes to the list
		for (const token of tokens) {
			if (token.type === 'emote') {
				this.log.debug(token);
				const instance = {user: msg.user, time: msg.timestamp};
				const text = token.text;
				const el = this.emotes.find(e => e.text == text);
				if (el) {
					el.instances.push(instance);
					this.updateElement(el);
				} else {
					const el = this.createEmoteElement(token, 1);
					this.getPanel().appendChild(el);
					this.setRemoveAnimation(el);
					this.emotes.push({text: text, element: el, firstTime: instance.timestamp, instances: [instance]});
				}
			}
		}

		this.updatePadding();
		this.setUpdatePanel();

		return tokens;
	}

	constructor(...args) {
		super(...args);

		this.inject('chat');
		this.injectAs('site_chat', 'site.chat');

		this.settings.add('emote_side_panel.capture_all', {
			default: false,
			ui: {
				path: 'Add-Ons > Emote Side Panel',
				title: 'Capture all',
				description: 'Capture emotes from all messages, even those that are not emote only',
				component: 'setting-check-box',
			},
		});

		this.settings.add('emote_side_panel.keep_messages', {
			default: false,
			ui: {
				path: 'Add-Ons > Emote Side Panel',
				title: 'Keep messages',
				description: 'Capture emotes but do not remove emote only messages',
				component: 'setting-check-box',
			},
		});

		this.settings.add('emote_side_panel.timeout', {
			default: 15,
			ui: {
				path: 'Add-Ons > Emote Side Panel',
				title: 'Timeout',
				description: 'Time in seconds that the emote is visible on the side panel',
				component: 'setting-text-box',
			},
			changed: val => this.timeout = parseInt(val) == 0 ? 30 : parseInt(val)
		});

		this.emotes = [];
		this.updateTimer = null;
		this.style_link = null;
		this.timeout = parseInt(this.settings.get('emote_side_panel.timeout'));

		const outerThis = this;
		this.messageFilter = {
			type: 'emote_side_panel',
			priority: 9,
			process(tokens, msg) {
				return outerThis.handleMessage(this, tokens, msg)
			}
		}
	}

	onEnable() {
		this.on('site.router:route', this.clearEmotes, this);
		this.chat.addTokenizer(this.messageFilter);
		this.emit('chat:update-lines');

		if (!this.style_link)
			document.head.appendChild(this.style_link = createElement('link', {
				href: STYLE_URL,
				rel: 'stylesheet',
				type: 'text/css',
				crossOrigin: 'anonymous'
			}));
	}

	onDisable() {
		this.off('site.router:route', this.clearEmotes, this);
		this.chat.removeTokenizer(this.messageFilter);
		this.emit('chat:update-lines');
	}
}

EmoteSidePanel.register();
