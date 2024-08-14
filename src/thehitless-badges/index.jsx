// TheHitless Badge Addon

const {createElement, setChildren} = FrankerFaceZ.utilities.dom;
const {Mutex} = FrankerFaceZ.utilities.object;

function get(endpoint, options) {
	return fetch(`https://thehitless.com/api/${endpoint}`, options).then(resp => resp.ok ? resp.json() : null);
}

class TheHitlessBadges extends Addon {
	constructor(...args) {
		super(...args);

		this.inject('chat');
		this.inject('chat.badges');

		this.waiting = new Mutex(4);

		this.thbadges = {};
		this.users = new Map;
	}

	async onEnable() {
		const process = this.onMessage.bind(this);

		await this.loadTHBadges()
			.then(() => this.buildBadges());

			
		this.on('site.channel:update-bar', this.updateChannelTHBadge, this);

		this.chat.addTokenizer({
			type: 'thehitless-badges',
			process
		});

		this.emit('chat:update-lines');
	}

	onDisable() {
		this.removeBadges();
		this.chat.removeTokenizer('thehitless-badges');
		this.emit('chat:update-lines');
	}

	onMessage(tokens, msg) {
		const user = msg?.user,
			login = user?.login;

		if ( login ) {
			const ret = this.getUser(user.userID);
			if ( ret instanceof Promise )
				ret.then(ext => {
					if ( ! ext || !ext.userId)
						return;

					const badge = ext.userId.badge;
					if(badge){
						const badgeId = `addon-thehitless-badges-${badge}`;
						this.chat.getUser(user.id, login).addBadge('thehitless-badges', badgeId);
						this.emit('chat:update-lines-by-user', user.id, login, false, true);
					}
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

	async _getUser(token) {
		const data = await get(`users/browser-ext/${token}`);
		if ( ! data.userId )
			return null;

		return data;
	}

	async loadTHBadges() {
		const data = await get('badges');
		this.thbadges = {};
		if ( ! data )
			return;

		const obj = data.reduce((acc, item) => {
			acc[item._id] = {
				...item,
			};
			return acc;
			}, {})

		this.thbadges = obj;
	}

	clearUserData() {
		for(const user of this.chat.iterateUsers())
			user.removeAllBadges('thehitless-badges');

		this.users.clear();
	}


	updateBadge(badge) {
		const badgeId = `addon-thehitless-badges-${badge._id}`;

		const badgeData = {
			id: badgeId,
			tooltipExtra: () => {
				if (!badge.name) return;

				return `\nTheHitless Badge - ${badge.name}`;
			},
			slot: 333,
			image: badge.url,
			urls: {
				1: badge.url,
				2: badge.url,
				3: badge.url,
				4: badge.url,
			},
			svg: false,
			click_url: `https://thehitless.com/`,
		};
		this.badges.loadBadgeData(badgeId, badgeData);
		return badgeId;
	}

	
	buildBadges() {
		const old_badges = this.old_badges;

		for(const [_id, badge] of Object.entries(this.thbadges)) {
			if ( old_badges && old_badges.has(_id) )
				old_badges.delete(_id);
			else
				this.updateBadge(badge);
		}

		if ( old_badges )
			for(const _id of old_badges){
				const badgeId = `addon-thehitless-badges-${_id}`;
				this.badges.removeBadge(badgeId, false);

			}

		this.old_badges = new Set(Object.keys(this.thbadges));
		this.badges.buildBadgeCSS();
	}

	removeBadges() {
		for(const key of Object.keys(this.thbadges)) {
			const badgeId = `addon-thehitless-badges-${key}`;

			this.badges.removeBadge(badgeId, false);
		}

		this.old_badges = new Set();
		this.badges.buildBadgeCSS();
	}
}

TheHitlessBadges.register();