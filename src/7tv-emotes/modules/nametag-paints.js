export default class NametagPaints extends FrankerFaceZ.utilities.module.Module {
	constructor(...args) {
		super(...args);

		this.inject('..api');

		this.inject('settings');
		this.inject('site.fine');

		this.settings.add('addon.seventv_emotes.nametag_paints', {
			default: true,
			ui: {
				path: 'Add-Ons > 7TV Emotes >> User Cosmetics',
				title: 'Nametag Paints',
				description: 'Show 7TV username gradients and images on users who have them set. [(7TV Subscriber Perk)](https://7tv.app/subscribe)',
				component: 'setting-check-box',
			}
		});

		this.userPaints = new Map();
	}

	async onEnable() {
		this.on('settings:changed:addon.seventv_emotes.nametag_paints', () => this.updatePaints());

		this.updatePaints();
	}

	getUserPaint(id) {
		return this.userPaints.get(id);
	}

	async updatePaints() {
		this.userPaints.clear();
		this.removeStyleSheet();

		if (this.settings.get('addon.seventv_emotes.nametag_paints')) {
			const paints = await this.api.cosmetics.getPaints();

			const styles = [];
			for (let paint of paints) {
				styles.push(this.buildPaintCSS(paint));

				for (let user of paint.users) {
					this.userPaints.set(user, paint.id);
				}
			}

			this.appendStyleSheet(styles.join(' '));
		}

		this.updateChatLines();
	}

	buildPaintCSS(paint) {
		let bgFunc;
		let bgFuncArgs = [];
		let isGradient = true;
		switch (paint.function) {
			case 'linear-gradient':
				bgFunc = `${paint.repeat ? 'repeating-' : ''}linear-gradient`;
				bgFuncArgs.push(`${paint.angle}deg`);
				break;
			case 'radial-gradient':
				bgFunc = `${paint.repeat ? 'repeating-' : ''}radial-gradient`;
				bgFuncArgs.push(paint.shape || 'circle');
				break;
			case 'url':
				bgFunc = 'url';
				bgFuncArgs.push(paint.image_url || '""');
				isGradient = false;
				break;
			default:
				return null;
		}

		if (isGradient && paint.stops instanceof Array) {
			for (let stop of paint.stops) {
				bgFuncArgs.push(`${this.getCSSColorFromInt(stop.color)} ${stop.at * 100}%`);
			}
		}

		let background = `${bgFunc}(${bgFuncArgs.join(', ')})`;

		let defaultColor;
		if (paint.color) {
			defaultColor = this.getCSSColorFromInt(paint.color);
		}

		let dropShadow;
		if (paint.drop_shadow) {
			let shadow = paint.drop_shadow;
			dropShadow = `drop-shadow(${shadow.x_offset}px ${shadow.y_offset}px ${shadow.radius}px ${this.getCSSColorFromInt(shadow.color)})`;
		}

		return `
			[data-seventv-paint="${paint.id}"]:not(.seventv-paint--default-only) span {
				background-image: ${background};
				background-size: cover;
				background-clip: text;
				-webkit-background-clip: text;
				-webkit-text-fill-color: transparent;
				background-color: currentColor;
				${dropShadow ? `filter: ${dropShadow};` : ''}
			}

			${defaultColor ? `[data-seventv-paint="${paint.id}"] {
				color: ${defaultColor} !important;
			}` : ''}
		`.replace(/[\n\t]/g, '');
	}

	appendStyleSheet(style) {
		this.removeStyleSheet();

		this.stylesheet = document.createElement('style');
		this.stylesheet.id = `${this.path}--styles`;
		this.stylesheet.textContent = style;

		document.head.appendChild(this.stylesheet);
	}

	removeStyleSheet() {
		if (this.stylesheet) {
			this.stylesheet.remove();
			this.stylesheet = undefined;
		}
	}

	getCSSColorFromInt(int) {
		const red = int >>> 24 & 255;
		const green = int >>> 16 & 255;
		const blue = int >>> 8 & 255;
		const alpha = int & 255;

		return `rgba(${red}, ${green}, ${blue}, ${alpha / 255})`
	}

	updateChatLines() {
		let enabled = this.settings.get('addon.seventv_emotes.nametag_paints');

		let chatLines = [];

		if (this.root.flavor == 'main') {
			const line = this.resolve('site.chat.chat_line');
			chatLines.push(line.ChatLine);

			const videoChat = this.resolve('site.video_chat');
			chatLines.push(videoChat.VideoChatLine);
		}
		else if (this.root.flavor == 'clips') {
			const line = this.resolve('site.chat.line');
			chatLines.push(line.ChatLine);
		}

		for (let ChatLine of chatLines) {
			ChatLine.off('mount', this.updateChatLine);
			ChatLine.off('update', this.updateChatLine);

			if (enabled) {
				ChatLine.on('mount', this.updateChatLine, this);
				ChatLine.on('update', this.updateChatLine, this);
			}

			ChatLine.each(inst => this.updateChatLine(inst, enabled));
		}
	}

	updateChatLine(inst, enabled) {
		enabled = enabled || this.settings.get('addon.seventv_emotes.nametag_paints');

		const userID = inst.props?.message?.user?.id			//Regular Chat
					|| inst.props?.messageContext?.author?.id	//Video Chat
					|| inst.props?.node?.commenter?.id;			//Clips Chat

		const el = this.fine.getChildNode(inst);
		const username = el.querySelector('.chat-line__username, .video-chat__message-author, .clip-chat__message-author');
		const message = el.querySelector('.message');

		if (username) {
			username.removeAttribute('data-seventv-paint');
		}

		if (message) {
			message.removeAttribute('data-seventv-paint');
			message.classList.remove('seventv-paint--default-only');
		}

		if (enabled) {
			const paintID = this.getUserPaint(userID);
			if (paintID) {
				if (username) {
					username.setAttribute('data-seventv-paint', paintID);
				}

				if (message && message.style.color) {
					message.setAttribute('data-seventv-paint', paintID);
					message.classList.add('seventv-paint--default-only');
				}
			}
		}
	}
}