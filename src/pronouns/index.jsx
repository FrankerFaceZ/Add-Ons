// Pronouns Addon

const {Mutex} = FrankerFaceZ.utilities.object;

function get(endpoint) {
	return fetch(`https://pronouns.alejo.io/api/${endpoint}`).then(resp => resp.json());
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

	async onLoad() {
		await this.loadPronouns();
	}

	onEnable() {
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

		this.buildBadges();

		const process = this.onMessage.bind(this);

		this.chat.addTokenizer({
			type: 'pronouns',
			process
		});

		this.emit('chat:update-lines');
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
					return new Promise((s,f) => cache.promises.push([s,f]));
				return null;
			}

			if ( Date.now() <= cache.time + 300000 )
				return cache.value;
		}

		return new Promise((s,f) => {
			this.users.set(login, {
				done: false,
				promises: [[s,f]]
			});

			this.waiting.wait().then(done => Promise.all([
				done, get(`users/${login}`)
			])).then(([done, data]) => {
				let had_user = false;
				if ( Array.isArray(data) )
					for(const item of data) {
						if ( item.login === login )
							had_user = true;

						const cached = this.users.get(item.login);
						if ( cached ) {
							cached.done = true;
							cached.value = item.pronoun_id;
							cached.time = Date.now();

							if ( cached.promises ) {
								for(const pair of cached.promises)
									pair[0](cached.value);

								cached.promises = null;
							}
						}
					}

				if ( ! had_user ) {
					const cached = this.users.get(login);
					if ( cached ) {
						cached.done = true;
						cached.value = null;
						cached.time = Date.now();

						if ( cached.promises ) {
							for(const pair of cached.promises)
								pair[0](cached.value);

							cached.promises = null;
						}
					}
				}

				done();
			});
		});
	}

	async loadPronouns() {
		const data = await get('pronouns');
		this.pronouns = {};

		if ( Array.isArray(data) )
			for(const item of data)
				this.pronouns[item.name] = item.display;
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
				this.badges.loadBadgeData(`addon-pn-${name}`, undefined, false);

		this.old_badges = new Set(Object.keys(this.pronouns));
		this.badges.buildBadgeCSS();
	}

	updateBadge(name, display, update_css = false) {
		let css = `display:inline-flex;align-items:center;`;
		if ( this.settings.get('addon.pronouns.border') )
			css = `${css}border:0.1rem solid;border-radius:0.5rem`;

		const setting = `addon.pronouns.color.${name}`;

		if ( ! this.old_badges || ! this.old_badges.has(name) )
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
			content: display,
			title: this.i18n.t('addon.pronouns.title', 'Pronouns: {value}', {
				value: display
			}),
			click_url: 'https://pronouns.alejo.io/',
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