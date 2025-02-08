const { createElement } = FrankerFaceZ.utilities.dom;

export default class NametagPaints extends FrankerFaceZ.utilities.module.Module {
	constructor(...args) {
		super(...args);

		this.inject('settings');
		this.inject('site.fine');
		this.inject('chat');

		this.settings.add('addon.seventv_emotes.nametag_paints', {
			default: true,
			ui: {
				path: 'Add-Ons > 7TV Emotes >> User Cosmetics',
				title: 'Nametag Paints',
				description: 'Show 7TV username gradients and images on users who have them set. [(7TV Subscriber Perk)](https://7tv.app/store)',
				component: 'setting-check-box',
			}
		});

		this.settings.add('addon.seventv_emotes.nametag_paints_drop_shadows', {
			default: true,
			ui: {
				path: 'Add-Ons > 7TV Emotes >> User Cosmetics',
				title: 'Nametag Paints Drop Shadows',
				description: 'Whether to show drop shadows for nametag paints **(Note: Too many drop shadows on screen can cause a drop in performance)**',
				component: 'setting-check-box',
			}
		});

		this.namepaintsApplyer = {
			type: 'apply_namepaints',

			process: (tokens, msg) => {
				const enabled = this.settings.get('addon.seventv_emotes.nametag_paints');
				if (!enabled) return;

				const paintID = this.getUserPaint(msg.user.userID);
				if (!paintID) return;

				msg.ffz_user_class = (msg.ffz_user_class || new Set());
				msg.ffz_user_class.add('seventv-paint');
				msg.ffz_user_class.add('seventv-painted-content');
				msg.ffz_user_class.add('ffz-tooltip');
				msg.ffz_user_class.add('ffz-tooltip--no-mouse');

				msg.ffz_user_props = {
					'data-seventv-paint-id': paintID,
					'data-seventv-painted-text': true,
					'data-tooltip-type': 'seventv-paint'
				}

				return tokens;
			}
		}

		this.chat.addTokenizer(this.namepaintsApplyer);

		this.resolve('tooltips').define('seventv-paint', target => {
			const paint_id = target?.dataset?.seventvPaintId;
			const paint_name = this.paints.get(paint_id)?.name;

			if (!paint_name) return FrankerFaceZ.utilities.tooltip.NoContent;

			return createElement('span', { className: 'seventv-paint-tooltip' }, paint_name);
		});

		this.paintSheet = false;
		this.paints = new Map();
		this.userPaints = new Map();
	}

	onEnable() {
		this.on('settings:changed:addon.seventv_emotes.nametag_paints', () => this.updateChatLines());
		this.on('settings:changed:addon.seventv_emotes.nametag_paints_drop_shadows', () => this.updatePaintSheet());
	}

	getPaintStylesheet() {
		if (this.paintSheet) return this.paintSheet;
	
		const link = document.createElement('link');
		link.type = 'text/css';
		link.rel = 'stylesheet';
	
		const s = document.createElement('style');
		s.id = 'seventv-paint-styles';
	
		document.head.appendChild(s);

		s.sheet.insertRule(`.seventv-painted-content {
			background-color: currentcolor;
		}`);
		// The following CSS rule fixes international names not being visible when painted
		s.sheet.insertRule(`.seventv-painted-content > .chat-author__intl-login {
			opacity: 1;
		}`);
		s.sheet.insertRule(`.seventv-painted-content[data-seventv-painted-text="true"] {
			-webkit-text-fill-color: transparent;
			background-clip: text !important;
			/* stylelint-disable-next-line property-no-vendor-prefix */
			-webkit-background-clip: text !important;
			font-weight: 700;
		}`);
		s.sheet.insertRule(`.seventv-paint-tooltip {
			font-weight: 700;
		}`);
		
		return (this.paintSheet = s.sheet ?? null);
	}

	getUserPaint(id) {
		return this.userPaints.get(id);
	}

	deleteUserPaintByID(user_id, paint_id) {
		const currentUserPaint = this.userPaints.get(user_id);
		if (!currentUserPaint || currentUserPaint !== paint_id) return;

		this.userPaints.delete(user_id);
		this.updateChatLines(user_id);
	}

	deleteUserPaint(data) {
		const paint_id = data.ref_id || data.id;
		const user = data.user?.connections?.find(c => c.platform === 'TWITCH');

		if (!user?.id) return;

		this.deleteUserPaintByID(user.id, paint_id);
	}

	setUserPaintByID(user_id, paint_id) {
		const currentUserPaint = this.userPaints.get(user_id);
		if (currentUserPaint === paint_id) return;

		this.userPaints.set(user_id, paint_id);

		this.updateChatLines(user_id);
	}

	setUserPaint(data) {
		const paint_id = data.ref_id || data.id;
		const user = data.user?.connections?.find(c => c.platform === 'TWITCH');

		if (!user?.id) return;

		this.setUserPaintByID(user.id, paint_id);
	}

	updatePaintSheet() {
		for (const paint of this.paints.values()) {
			this.updatePaintStyle(paint);
		}

		this.updateChatLines();
	}

	updatePaintStyle(paint, remove = false) {
		this.paints.set(paint.id, paint);

		const sheet = this.getPaintStylesheet();
		if (!sheet) {
			this.log.error('<Cosmetics>', 'Could not find paint stylesheet');
			return;
		}
		
		if (!paint.gradients?.length && paint.function) {
			// add base gradient if using v2 format
			if (!paint.gradients) paint.gradients = new Array(1);
			paint.gradients[0] = {
				function: paint.function,
				canvas_repeat: '',
				size: [1, 1],
				shape: paint.shape,
				image_url: paint.image_url,
				stops: paint.stops ?? [],
				repeat: paint.repeat ?? false,
				angle: paint.angle,
			};
		}
		
		const gradients = paint.gradients.map(g => this.createGradientFromPaint(g));
		
		const drop_shadows_enabled = this.settings.get('addon.seventv_emotes.nametag_paints_drop_shadows');
		
		const filter = (() => {
			if (!drop_shadows_enabled || !paint.shadows) {
				return '';
			}
		
			return paint.shadows.map(v => this.createFilterDropshadow(v)).join(' ');
		})();
		
		const selector = `.seventv-paint[data-seventv-paint-id="${paint.id}"]`;
		const text = `${selector} {
			color: ${paint.color ? this.getCSSColorFromInt(paint.color) : 'inherit'};
			background-image: ${gradients.map(v => v[0]).join(', ')};
			background-position: ${gradients.map(v => v[1]).join(', ')};
			background-size: ${gradients.map(v => v[2]).join(', ')};
			background-repeat: ${gradients.map(v => v[3]).join(', ')};
			filter: ${filter || 'inherit'};
			${
	paint.text
		? `
						font-weight: ${paint.text.weight ? paint.text.weight * 100 : 'inherit'};
						-webkit-text-stroke-width: ${paint.text.stroke ? `${paint.text.stroke.width}px` : 'inherit'};
						-webkit-text-stroke-color: ${paint.text.stroke ? this.getCSSColorFromInt(paint.text.stroke.color) : 'inherit'};
						text-shadow: ${
	paint.text.shadows
		?.map(v => `${v.x_offset}px ${v.y_offset}px ${v.radius}px ${this.getCSSColorFromInt(v.color)}`)
		.join(', ') ?? 'unset'
};
					text-transform: ${paint.text.transform ?? 'unset'};
					`
		: ''
}
		}
		`;
		
		let currentIndex = -1;
		for (let i = 0; i < sheet.cssRules.length; i++) {
			const r = sheet.cssRules[i];
			if (!(r instanceof CSSStyleRule)) continue;
			if (r.selectorText !== selector) continue;
		
			currentIndex = i;
			break;
		}

		if (remove) {
			if (currentIndex >= 0) {
				sheet.deleteRule(currentIndex);
			}
			return;
		}
		
		if (currentIndex >= 0) {
			sheet.deleteRule(currentIndex);
			sheet.insertRule(text, currentIndex);
		} else {
			sheet.insertRule(text, sheet.cssRules.length);
		}
	}

	createGradientFromPaint(gradient) {
		const result = ['', '', '', ''];
	
		const args = [];
		switch (gradient.function) {
			case 'LINEAR_GRADIENT': // paint is linear gradient
				args.push(`${gradient.angle ?? 0}deg`);
				break;
			case 'RADIAL_GRADIENT': // paint is radial gradient
				args.push(gradient.shape ?? 'circle');
				break;
			case 'URL': // paint is an image
				args.push(gradient.image_url ?? '');
				break;
		}
		let funcPrefix = '';
		if (gradient.function !== 'URL') {
			funcPrefix = gradient.repeat ? 'repeating-' : '';
	
			for (const stop of gradient.stops) {
				const color = this.getCSSColorFromInt(stop.color);
				args.push(`${color} ${stop.at * 100}%`);
			}
		}
	
		result[0] = `${funcPrefix}${gradient.function.toLowerCase().replace('_', '-')}(${args.join(', ')})`;
		result[1] = gradient.at && gradient.at.length === 2 ? `${gradient.at[0] * 100}% ${gradient.at[1] * 100}%` : '';
		result[2] =
			gradient.size && gradient.size.length === 2 ? `${gradient.size[0] * 100}% ${gradient.size[1] * 100}%` : '';
		result[3] = gradient.canvas_repeat ?? 'unset';
	
		return result;
	}
	
	createFilterDropshadow(shadow) {
		return `drop-shadow(${shadow.x_offset}px ${shadow.y_offset}px ${shadow.radius}px ${this.getCSSColorFromInt(
			shadow.color,
		)})`;
	}

	getCSSColorFromInt(int) {
		const red = int >>> 24 & 0xFF;
		const green = int >>> 16 & 0xFF;
		const blue = int >>> 8 & 0xFF;
		const alpha = int & 0xFF;

		return `rgba(${red}, ${green}, ${blue}, ${alpha / 255})`
	}

	updateChatLines(user_id = undefined) {
		const enabled = this.settings.get('addon.seventv_emotes.nametag_paints');

		for(const { message, update } of this.chat.iterateMessages()) {
			const user = message.user;
			if (user_id !== undefined && user.userID !== user_id) continue;

			const paintID = enabled ? this.getUserPaint(user.userID) : null;

			if (paintID) {
				message.ffz_user_class = (message.ffz_user_class || new Set());
				message.ffz_user_class.add('seventv-paint');
				message.ffz_user_class.add('seventv-painted-content');
				message.ffz_user_class.add('ffz-tooltip');
				message.ffz_user_class.add('ffz-tooltip--no-mouse');

				message.ffz_user_props = {
					...message.ffz_user_props,
					'data-seventv-paint-id': paintID,
					'data-seventv-painted-text': true,
					'data-tooltip-type': 'seventv-paint'
				}
			}
			else {
				message.ffz_user_class = (message.ffz_user_class || new Set());
				message.ffz_user_class.delete('seventv-paint');
				message.ffz_user_class.delete('seventv-painted-content');
				message.ffz_user_class.delete('ffz-tooltip');
				message.ffz_user_class.delete('ffz-tooltip--no-mouse');

				if (message.ffz_user_props?.['data-seventv-paint-id']) {
					delete message.ffz_user_props['data-seventv-paint-id'];
					delete message.ffz_user_props['data-seventv-painted-text'];
					delete message.ffz_user_props['data-tooltip-type'];
				}
			}

			update();
		}
	}
}
