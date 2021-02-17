// Pronouns Addon

function get(endpoint) {
	return fetch(`https://pronouns.alejo.io/api/${endpoint}`).then(resp => resp.json());
}

class Pronouns extends Addon {
	constructor(...args) {
		super(...args);

		this.inject('chat');
		this.inject('chat.badges');
		this.inject('site.chat.chat_line');
		this.inject('i18n');
		this.inject('settings');

		this.pronouns = {};
		this.users = new Map;
	}

	async onEnable() {
		await this.loadPronouns();

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
					this.chat.getUser(user.id, login).addBadge('pronouns', `addon-pn-${id}`);
					this.chat_line.updateLinesByUser(user.id, login);
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

			get(`users/${login}`).then(data => {
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
			});
		});
	}

	async loadPronouns() {
		const data = await get('pronouns'),
			old_badges = new Set(Object.keys(this.pronouns));

		this.pronouns = {};

		if ( Array.isArray(data) ) {
			for(const item of data) {
				this.pronouns[item.name] = item.display;
				if ( old_badges.has(item.name) )
					old_badges.delete(item.name);
				else
					this.updateBadge(item.name, item.display);
			}

			this.log.info(`Loaded ${data.length} pronouns.`);
		}

		for(const item of old_badges)
			this.badges.loadBadgeData(`addon-pn-${item}`, undefined, false);

		this.badges.buildBadgeCSS();
	}

	updateBadge(name, display, update_css = false) {
		let css = `display:inline-flex;align-items:center;`;
		if ( this.settings.get('addon.pronouns.border') )
			css = `${css}border:0.1rem solid;border-radius:0.5rem`;

		this.badges.loadBadgeData(`addon-pn-${name}`, {
			content: display,
			title: this.i18n.t('addon.pronouns.title', 'Pronouns: {value}', {
				value: display
			}),
			click_url: 'https://pronouns.alejo.io/',
			color: this.settings.get('addon.pronouns.color'),
			slot: 40,
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