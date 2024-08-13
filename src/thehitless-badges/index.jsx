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

		this.chat.addTokenizer({
			type: 'thehitless-badges',
			process
		});

		await this.loadTHBadges()
			.then(() => console.log("TheHitless Badges fetched"));

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
			if ( ret instanceof Promise ){
				ret.then(userExt => {
					if ( ! userExt || !this.thbadges )
						return;
					const badge = this.thbadges[userExt.badge];

					this.updateBadge(user.userID, login, badge, userExt.name );
				});
			}else{
				const data = ret;
				if(! data || !this.thbadges)
					return;
				
				const { userId } = data;
				if( !userId || !userId.badge)
					return;

				const badge = this.thbadges[userId.badge];
				this.updateBadge(user.userID, login, badge, userId.name );
			}		
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
			user.removeAllBadges('thbadges');

		this.users.clear();
	}


	updateBadge(userId, login, badge, username) {
		const badgeId = `addon-thehitless-badges-${badge._id}-${userId}`;
		if(this.badges.getBadge(badgeId))
			return;

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
			click_url: `https://thehitless.com/runners/${username}/`,
		};
		this.badges.loadBadgeData(badgeId, badgeData);

		this.badges.buildBadgeCSS();
		
		this.chat.getUser(userId, login).addBadge('thehitless-badges', badgeId);
		this.emit('chat:update-lines-by-user', userId, login, false, true);
	}
}

TheHitlessBadges.register();