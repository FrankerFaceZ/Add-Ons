// Pronouns Addon

const {createElement, setChildren} = FrankerFaceZ.utilities.dom;
const {Mutex} = FrankerFaceZ.utilities.object;

function get(endpoint, options) {
	return fetch(`https://api.pronouns.alejo.io/v1/${endpoint}`, options).then(resp => resp.ok ? resp.json() : null);
}


class Pronouns extends Addon {
	constructor(...args) {
		super(...args);

		this.inject('chat');
		this.inject('chat.badges');
		//this.inject('site.chat.chat_line');
		this.inject('i18n');
		this.inject('settings');

		this.waiting = new Mutex(4);

		this.pronouns = {};
		this.users = new Map;
	}

	async onEnable() {
		this.settings.add('addon.pronouns.streamer', {
			default: true,
			ui: {
				path: 'Add-Ons > Pronouns >> Appearance',
				title: 'Show a pronoun badge for the streamer if they have pronouns set.',
				component: 'setting-check-box'
			}
		});

		this.settings.add('addon.pronouns.color', {
			default: '',
			ui: {
				path: 'Add-Ons > Pronouns >> Appearance',
				title: 'Badge Color',
				component: 'setting-color-box'
			},
			changed: () => this.updateBadges()
		});

		this.settings.add('addon.pronouns.border', {
			default: true,
			ui: {
				path: 'Add-Ons > Pronouns >> Appearance',
				title: 'Display a border around the badge.',
				component: 'setting-check-box'
			},
			changed: () => this.updateBadges()
		});

		const process = this.onMessage.bind(this);

		// Before adding our tokenizer, load some data.
		await this.loadPronouns()
			.then(() => this.buildBadges());

		this.on('site.channel:update-bar', this.updateChannelPronouns, this);

		this.chat.addTokenizer({
			type: 'pronouns',
			process
		});

		this.emit('chat:update-lines');
	}

	onDisable() {
		this.removeBadges();
		this.chat.removeTokenizer('pronouns');
		this.emit('chat:update-lines');
		this.off('site.channel:update-bar', this.updateChannelPronouns, this);
	}


	updateChannelPronouns(el, props, channel) {
		if ( el._pn_badge && ! el.contains(el._pn_badge) ) {
			el._pn_badge.remove();
			el._pn_badge = null;
		}

		if ( ! el._pn_badge ) {
			const link = el.querySelector('a .tw-title'),
				anchor = link && link.closest('a'),
				cont = anchor && anchor.closest('div');

			if ( cont && el.contains(cont) ) {
				el._pn_badge = <div class="pn--badge"></div>;

				let before;
				if ( anchor.parentElement === cont ) {
					before = anchor.nextElementSibling;
					if ( before && before.querySelector('svg') )
						before = before.nextElementSibling;
				}

				if ( before )
					cont.insertBefore(el._pn_badge, before);
				else
					cont.appendChild(el._pn_badge);
			}
		}

		if ( ! el._pn_badge || props?.channelLogin === el._pn_login )
			return;

		const login = el._pn_login = props?.channelLogin;
		if ( ! login || ! this.settings.get('addon.pronouns.streamer') ) {
			el._pn_badge.innerHTML = '';
			return;
		}

		let value = this.getUser(login, true);
		if ( value instanceof Promise )
			return value.then(() => {
				if ( el._pn_login === login ) {
					el._pn_login = null;
					this.updateChannelPronouns(el, props, channel);
				}
			});

		if ( ! value ) {
			el._pn_badge.innerHTML = '';
			return;
		}

		// Make a fake message, for badge rendering.
		const msg = {
			user: {
				id: props.channelID,
				login,
				displayName: props.displayName
			},
			roomID: props.channelID,
			roomLogin: login,
			ffz_badges: [
				{id: `addon-pn-${value}`}
			]
		};

		el._pn_badge.dataset.roomId = msg.roomID;
		el._pn_badge.dataset.room = login;
		el._pn_badge.dataset.userId = msg.roomID;
		el._pn_badge.dataset.user = login;
		el._pn_badge.message = msg;

		setChildren(el._pn_badge, this.badges.render(msg, createElement, true, true));
	}


	onMessage(tokens, msg) {
		const user = msg?.user,
			login = user?.login;

		if ( login ) {
			const ret = this.getUser(login);
			if ( ret instanceof Promise )
				ret.then(id => {
					if ( ! id )
						return;

					this.chat.getUser(user.id, login).addBadge('pronouns', `addon-pn-${id}`);
					this.emit('chat:update-lines-by-user', user.id, login, false, true);
				});
		}

		return tokens;
	}

	getUser(login, multiple_waits = false) {
		const cache = this.users.get(login);
		if ( cache ) {
			if ( ! cache.done ) {
				if ( multiple_waits )
					return cache.promise;
				return null;
			}

			if ( Date.now() <= cache.time + 300000 )
				return cache.value;
		}

		if ( this.load_wait )
			return this.load_wait.then(() => this.getUser(login, multiple_waits));

		const promise = this.waiting.wait()
			.then(done => this._getUser(login)
				.then(value => {
					this.users.set(login, {
						done: true,
						value,
						time: Date.now()
					});

					return value;
				})
				.catch(err => {
					this.users.set(login, {
						done: true,
						value: null,
						time: Date.now()
					});
					throw err;
				})
				.finally(done));

		this.users.set(login, {
			done: false,
			promise
		});

		return promise;
	}

	async _getUser(login) {
		const data = await get(`users/${login}`);
		let out = data?.pronoun_id;
		if ( ! out?.length )
			return null;

		if ( data.alt_pronoun_id?.length )
			return `${out}|${data.alt_pronoun_id}`;

		return out;
	}

	async loadPronouns() {
		const data = await get('pronouns');
		this.pronouns = {};

		if ( ! data )
			return;

		for(const [key, val] of Object.entries(data)) {
			this.pronouns[key] = (val.singular || ! val.object?.length) ? val.subject : `${val.subject}/${val.object}`;
			for(const [key_two, val_two] of Object.entries(data)) {
				if ( key === key_two )
					continue;

				this.pronouns[key + '|' + key_two] = `${val.subject || val.object}/${val_two.subject || val_two.object}`;
			}
		}

	}

	clearUserData() {
		for(const user of this.chat.iterateUsers())
			user.removeAllBadges('pronouns');

		this.users.clear();
	}

	removeBadges() {
		for(const key of Object.keys(this.pronouns)) {
			this.badges.removeBadge(`addon-pn-${key}`, false);
			this.settings.remove(`addon.pronouns.color.${key}`);
		}

		this.old_badges = new Set();
		this.badges.buildBadgeCSS();
	}

	buildBadges() {
		const old_badges = this.old_badges;

		for(const [name, display] of Object.entries(this.pronouns)) {
			if ( old_badges && old_badges.has(name) )
				old_badges.delete(name);
			else
				this.updateBadge(name, display, false);
		}

		if ( old_badges )
			for(const name of old_badges)
				this.badges.removeBadge(`addon-pn-${name}`, false);

		this.old_badges = new Set(Object.keys(this.pronouns));
		this.badges.buildBadgeCSS();
	}

	updateBadge(name, display, update_css = false) {
		let css = `display:inline-flex;align-items:center;`;
		if ( this.settings.get('addon.pronouns.border') )
			css = `${css}border:0.1rem solid;border-radius:0.5rem`;

		const idx = name.indexOf('|'),
			setting = `addon.pronouns.color.${idx === -1 ? name : name.slice(0, idx)}`;

		if ( ! this.old_badges || ! this.old_badges.has(name) && idx === -1 )
			this.settings.add(setting, {
				default: null,
				requires: ['addon.pronouns.color'],
				process(ctx, val) {
					return val == null ? ctx.get('addon.pronouns.color') : val
				},
				ui: {
					path: 'Add-Ons > Pronouns >> Per-Badge Colors',
					title: display,
					i18n_key: null,
					component: 'setting-color-box',
					force_seen: true
				},
				changed: () => {
					if ( this.pronouns[name] )
						this.updateBadge(name, display, true);
				}
			});

		this.badges.loadBadgeData(`addon-pn-${name}`, {
			no_visibility: true,
			content: display,
			title: this.i18n.t('addon.pronouns.title', 'Pronouns: {value}', {
				value: display
			}),
			click_url: 'https://pr.alejo.io/',
			color: this.settings.get(setting),
			slot: 100,
			css
		}, update_css);
	}

	updateBadges() {
		for(const [name, display] of Object.entries(this.pronouns))
			this.updateBadge(name, display);

		this.badges.buildBadgeCSS();
	}
}

Pronouns.register();