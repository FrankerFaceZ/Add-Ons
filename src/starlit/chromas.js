import { SETTING_KEYS } from './settings.js';

const { createElement } = FrankerFaceZ.utilities.dom;

const CLASS = 'starlit-chroma';
const PROP = 'data-starlit-chroma';
const RARITY = {
	common: { label: 'Common', color: '#8a93a6' },
	uncommon: { label: 'Uncommon', color: '#36d6b4' },
	rare: { label: 'Rare', color: '#5fc9e8' },
	epic: { label: 'Epic', color: '#9d7bff' },
	legendary: { label: 'Legendary', color: '#ffd166' },
	mythic: { label: 'Mythic', color: '#f261c4' },
	secret: { label: 'Secret', color: '#7d96d6', ink: '#cdd9ff', text: 'linear-gradient(100deg, #7d96d6 28%, #eef3ff 50%, #7d96d6 72%)', background: 'linear-gradient(160deg, #0a0f1f, #111c3a)', border: '1px solid #7d96d699', glow: '0 0 10px #44619e59' },
	exclusive: { label: 'Exclusive', color: '#9d7bff', ink: '#c9b3ff', text: 'linear-gradient(110deg, #7af0ff, #9d7bff, #f261c4, #ffd166, #7af0ff)', background: '#9d7bff1f', border: '1px solid #9d7bff66', glow: '0 0 12px #9d7bff40' },
};
const PAINT_PROPS = ['background-image', 'background-position', 'background-size', 'background-repeat', 'background-clip', '-webkit-background-clip', 'color', '-webkit-text-fill-color', 'animation', 'filter'];

export class Chromas extends FrankerFaceZ.utilities.module.Module {
	constructor(...args) {
		super(...args);

		this.inject('settings');
		this.inject('chat');

		this.sheet = null;
		this.rules = new Map();

		this.tokenizer = {
			type: 'starlit_chroma',
			priority: -1,
			process: (tokens, msg) => {
				if (!this.settings.get(SETTING_KEYS.chromas)) return tokens;
				const id = this.chromaFor(msg.user?.userID);
				if (!id) return tokens;
				this.tag(msg, id);
				return tokens;
			}
		};
	}

	onEnable() {
		this.chat.addTokenizer(this.tokenizer);

		this.resolve('tooltips').define('starlit-chroma', target => this.chromaTip(target));
		this.wrapTooltips();
		this.on('addons:addon-enabled', id => {
			if (id === '7tv-emotes') this.wrapTooltips();
		});

		this.settings.getChanges(SETTING_KEYS.chromas, () => this.updateChatLines());
		this.settings.getChanges(SETTING_KEYS.chromaAnimations, () => this.rebuild());
		this.settings.getChanges(SETTING_KEYS.overSevenTv, () => this.rebuild());
		this.on('..api:update', () => this.rebuild());
	}

	chromaIdOf(target) {
		const fromProp = target?.dataset?.starlitChroma;
		if (fromProp) return fromProp;
		for (const name of target?.classList ?? []) {
			if (name.startsWith(`${CLASS}--`)) return name.slice(CLASS.length + 2);
		}
		return null;
	}

	chromaTip(target) {
		const id = this.chromaIdOf(target);
		const chroma = id ? this.chromaById(id) : null;
		if (!chroma) return FrankerFaceZ.utilities.tooltip.NoContent;
		return createElement('div', { className: 'starlit-tip' }, [
			createElement('div', { className: `starlit-tip__name ${CLASS} ${CLASS}--${chroma.id}`, [PROP]: chroma.id }, chroma.name),
			createElement('div', { className: 'starlit-tip__chips' }, [
				this.rarityChip(chroma.rarity),
				createElement('span', { className: 'starlit-chip starlit-chip--type' }, 'Chroma'),
				chroma.animated ? createElement('span', { className: 'starlit-chip starlit-chip--animated' }, 'Animated') : null,
			]),
			chroma.origin ? createElement('div', { className: 'starlit-tip__from' }, chroma.origin) : null,
		]);
	}

	badgeExtra(badge) {
		const origin = badge.origin ?? this.badgeOrigin(badge.id);
		return createElement('div', { className: 'starlit-tip starlit-tip--badge' }, [
			createElement('div', { className: 'starlit-tip__chips' }, [
				this.rarityChip(badge.rarity),
				createElement('span', { className: 'starlit-chip starlit-chip--type starlit-chip--badge' }, 'Badge'),
			]),
			origin ? createElement('div', { className: 'starlit-tip__from' }, origin) : null,
		]);
	}

	badgeOrigin(id) {
		const api = this.parent.starlit_api;
		const listed = api.badgeCatalog.find(b => b.id === id);
		if (listed?.origin) return listed.origin;
		for (const user of api.users.values()) {
			const worn = (user.badges ?? []).find(b => b.id === id);
			if (worn?.origin) return worn.origin;
		}
		return null;
	}

	wrapTooltips() {
		const tooltips = this.resolve('tooltips');
		const paint = tooltips?.types?.['seventv-paint'];
		if (!paint || paint.starlit) return;
		const wrapped = (target, tip) => {
			const ours = this.chromaIdOf(target) && this.settings.get(SETTING_KEYS.overSevenTv);
			return ours ? this.chromaTip(target) : paint(target, tip);
		};
		wrapped.starlit = true;
		tooltips.define('seventv-paint', wrapped);
	}

	rarityChip(rarity) {
		const r = RARITY[rarity];
		if (!r) return null;
		if (r.text) {
			return createElement('span', { className: 'starlit-chip', style: `background:${r.background};border:${r.border};box-shadow:${r.glow};color:${r.ink}` }, [
				createElement('span', { className: `starlit-rarity-text starlit-rarity-text--${rarity}`, style: `background-image:${r.text}` }, r.label),
			]);
		}
		return createElement('span', { className: 'starlit-chip', style: `background-color:${r.color}26;border:1px solid ${r.color}59;color:${r.color}` }, r.label);
	}

	onDisable() {
		this.chat.removeTokenizer(this.tokenizer);
		if (this.sheet) this.sheet.remove();
		this.sheet = null;
		this.rules.clear();
		this.updateChatLines();
	}

	chromaFor(userId) {
		if (userId === undefined || userId === null) return null;
		const user = this.parent.starlit_api.getUser(userId);
		return user?.chroma?.id ?? null;
	}

	chromaById(id) {
		for (const user of this.parent.starlit_api.users.values()) {
			if (user.chroma?.id === id) return user.chroma;
		}
		return null;
	}

	tag(msg, id) {
		msg.ffz_user_class = (msg.ffz_user_class || new Set());
		for (const name of [...msg.ffz_user_class]) {
			if (name.startsWith(`${CLASS}--`) && name !== `${CLASS}--${id}`) msg.ffz_user_class.delete(name);
		}
		msg.ffz_user_class.add(CLASS);
		msg.ffz_user_class.add(`${CLASS}--${id}`);
		msg.ffz_user_class.add('ffz-tooltip');
		msg.ffz_user_class.add('ffz-tooltip--no-mouse');
		msg.ffz_user_props = {
			...msg.ffz_user_props,
			[PROP]: id,
			'data-tooltip-type': 'starlit-chroma',
		};
	}

	untag(msg) {
		if (!msg.ffz_user_class) return;
		msg.ffz_user_class.delete(CLASS);
		for (const name of [...msg.ffz_user_class]) {
			if (name.startsWith(`${CLASS}--`)) msg.ffz_user_class.delete(name);
		}
		if (msg.ffz_user_props?.[PROP]) {
			delete msg.ffz_user_props[PROP];
			if (msg.ffz_user_props['data-tooltip-type'] === 'starlit-chroma') {
				delete msg.ffz_user_props['data-tooltip-type'];
				msg.ffz_user_class.delete('ffz-tooltip');
				msg.ffz_user_class.delete('ffz-tooltip--no-mouse');
			}
		}
	}

	getSheet() {
		if (this.sheet) return this.sheet;
		const style = document.createElement('style');
		style.id = 'starlit-chroma-styles';
		document.head.appendChild(style);
		this.sheet = style;
		return style;
	}

	paintRule(css, important) {
		if (!important) return css;
		return css
			.split(';')
			.map(decl => {
				const name = decl.slice(0, decl.indexOf(':')).trim();
				return PAINT_PROPS.includes(name) && !decl.includes('!important') ? `${decl} !important` : decl;
			})
			.join(';');
	}

	stillRule(css) {
		return css
			.replace(/url\("(https?:\/\/[^"]+\/assets\/[a-f0-9]{16}\/)([1-4]x)\.(?:avif|webp)"\)/g, 'url("$1$2.poster.png")')
			.replace(/animation:[^;]*;/g, '');
	}

	rebuild() {
		const api = this.parent.starlit_api;
		const important = this.settings.get(SETTING_KEYS.overSevenTv);
		const still = !this.settings.get(SETTING_KEYS.chromaAnimations);
		const seen = new Map();
		for (const user of api.users.values()) {
			if (user.chroma?.id && user.chroma.css && !seen.has(user.chroma.id)) seen.set(user.chroma.id, user.chroma.css);
		}

		const rules = [
			api.keyframes,
			`.${CLASS} { -webkit-text-fill-color: transparent${important ? ' !important' : ''}; background-clip: text !important; -webkit-background-clip: text !important; }`,
			`.${CLASS} > .chat-author__intl-login { opacity: 1; }`,
			'.starlit-tip { display: flex; flex-direction: column; gap: 0.4em; }',
			'.starlit-tip--badge { margin-top: 0.4em; }',
			'.starlit-tip__from { font-size: 0.8em; opacity: 0.75; padding-top: 0.4em; border-top: 1px solid rgba(255,255,255,0.15); }',
			'.starlit-tip__name { font-weight: 800; font-size: 1.25em; line-height: 1.15; display: inline-block; }',
			'.starlit-tip__chips { display: flex; gap: 0.35em; align-items: center; flex-wrap: wrap; }',
			'.starlit-chip--badge { background-color: #4fb6ff26; border: 1px solid #4fb6ff59; color: #bcd8ff; }',
			'.starlit-chip { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; line-height: 1.25; }',
			'.starlit-chip--type { background-color: #b69dff26; border: 1px solid #b69dff59; color: #cdbcff; }',
			'.starlit-chip--animated { background-color: #aef0ff26; border: 1px solid #aef0ff59; color: #aef0ff; }',
			'.starlit-rarity-text { -webkit-background-clip: text; background-clip: text; color: transparent; background-size: 200% 100%; }',
			'.starlit-rarity-text--secret { animation: starlit-rarity-pan 3s linear infinite; }',
			'.starlit-rarity-text--exclusive { animation: starlit-rarity-pan 7s linear infinite; }',
			'@keyframes starlit-rarity-pan { from { background-position: 0% 50%; } to { background-position: -200% 50%; } }',
			'@media (prefers-reduced-motion: reduce) { .starlit-rarity-text--secret, .starlit-rarity-text--exclusive { animation: none !important; } }',
		];
		for (const [id, css] of seen) {
			rules.push(`.${CLASS}.${CLASS}--${id} { ${this.paintRule(still ? this.stillRule(css) : css, important)} }`);
		}
		this.rules = seen;
		this.getSheet().textContent = rules.join('\n');
		this.applyMotion();
		this.updateChatLines();
	}

	applyMotion() {
		const on = this.settings.get(SETTING_KEYS.chromaAnimations);
		const root = document.documentElement;
		if (on) {
			root.style.removeProperty('--starlit-chroma-frozen-animation');
			root.style.removeProperty('--starlit-chroma-frozen-position');
		} else {
			root.style.setProperty('--starlit-chroma-frozen-animation', 'none');
			root.style.setProperty('--starlit-chroma-frozen-position', '0% 50%');
		}
	}

	updateChatLines() {
		const enabled = this.settings.get(SETTING_KEYS.chromas) && this.sheet;
		for (const { message, update } of this.chat.iterateMessages()) {
			const id = enabled ? this.chromaFor(message.user?.userID) : null;
			if (id) this.tag(message, id);
			else this.untag(message);
			update();
		}
		this.emit('chat:update-lines');
	}
}
