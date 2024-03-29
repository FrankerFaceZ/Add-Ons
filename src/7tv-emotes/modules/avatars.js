export default class Avatars extends FrankerFaceZ.utilities.module.Module {
	constructor(...args) {
		super(...args);

		this.inject('..api');

		this.inject('settings');
		this.inject('site');
		this.inject('site.fine');

		this.settings.add('addon.seventv_emotes.animated_avatars', {
			default: true,
			ui: {
				path: 'Add-Ons > 7TV Emotes >> User Cosmetics',
				title: 'Animated Avatars',
				description: 'Show 7TV animated avatars on users who have them set. [(7TV Subscriber Perk)](https://7tv.app/subscribe)',
				component: 'setting-check-box',
			}
		});

		this.avatarCache = new Map();
		this.socketWaiters = new Map();

		this.updateInterval = false;
	}

	onEnable() {
		this.settings.getChanges('addon.seventv_emotes.animated_avatars', () => this.onSettingChange());

		this.on('common:update-avatar', async event => {
			const enabled = this.settings.get('addon.seventv_emotes.animated_avatars');
			if (!enabled) return;

			const url = await this.getAvatar(event.user.login);
			if (url)
				event.url = url;
		});

		this.onSettingChange();
	}

	receiveAvatarData(data) {
		if (!data.user?.username || !data.host?.files) return;
		const login = data.user.username.toLowerCase();

		const waiter = this.socketWaiters.get(login);
		if (!waiter)
			return;

		this.socketWaiters.delete(login);

		const webpEmoteVersions = data.host.files.filter((value => value.format === 'WEBP'));
		if (!webpEmoteVersions.length) return;

		const highestQuality = webpEmoteVersions[webpEmoteVersions.length - 1];
		waiter(`${data.host.url}/${highestQuality.name}`);
	}

	getAvatar(login) {
		login = login.toLowerCase();

		const entry = this.avatarCache.get(login);
		if ( entry?.done && Date.now() < entry.expires_at )
			return entry.value;

		if ( entry && ! entry.done )
			return entry.promise;

		const promise = new Promise(resolve => {
			let timer;
			const onDone = value => {
				clearTimeout(timer);
				if ( ! value )
					value = null;

				this.avatarCache.set(login, {
					done: true,
					value,
					expires_at: Date.now() + 1000 * 60 * 3 // 3 minutes
				});

				resolve(value);
			};

			this.socketWaiters.set(login, onDone);
			timer = setTimeout(onDone, 3000);

			this.waitingAvatars = this.waitingAvatars || [];
			this.waitingAvatars.push(login);

			if ( ! this.requestTimer )
				this.requestTimer = setTimeout(() => {
					this.requestTimer = null;
					const waiting = this.waitingAvatars;
					this.waitingAvatars = null;

					const socket = this.resolve('..socket');
					socket.emitSocket({
						op: socket.OPCODES.BRIDGE,
						d: {
							command: 'userstate',
							body: {
								identifiers: waiting.map(login => `username:${login}`),
								platform: 'TWITCH',
								kinds: ['AVATAR']
							}
						}
					});
				}, 1000); // request them all after 1000ms
		});

		this.avatarCache.set(login, {
			done: false,
			promise
		});

		return promise;
	}

	onSettingChange() {
		const enabled = this.settings.get('addon.seventv_emotes.animated_avatars');

		if (enabled) {
			if (!this.updateInterval) {
				this.updateInterval = setInterval(() => {
					this.updateAvatars();
				}, 1000);
			}
		}
		else {
			clearInterval(this.updateInterval);
			this.updateInterval = false;
		}

		this.updateAvatars();
	}

	getVisibleAvatars() {
		return document.querySelectorAll('.tw-image-avatar');
	}

	updateAvatars() {
		const enabled = this.settings.get('addon.seventv_emotes.animated_avatars');

		const avatars = this.getVisibleAvatars();
		avatars.forEach(async avatar => {
			if (!enabled) {
				// Check if the avatar has an seventv-original-avatar attribute and set it
				if (avatar.hasAttribute('seventv-original-avatar')) {
					avatar.setAttribute('src', avatar.getAttribute('seventv-original-avatar'));
					avatar.removeAttribute('seventv-original-avatar');
				}

				return;
			}

			// Get the react instance for the avatar element
			const avatarComponent = this.fine.getOwner(avatar);
			if (!avatarComponent) return;

			const node = this.fine.searchParentNode(avatarComponent, e => e.memoizedProps?.userLogin);
			const login = node?.memoizedProps?.userLogin;

			// No login? No avatar.
			if (!login) return;

			// Get the current image src URL
			const current_url = avatar.getAttribute('src');

			// Get the animated avatar URL for this login
			const url = await this.getAvatar(login);
			if (url && url !== current_url) {
				if (!avatar.hasAttribute('seventv-original-avatar')) {
					// Set the seventv-original-avatar attribute to the current src attribute
					avatar.setAttribute('seventv-original-avatar', avatar.getAttribute('src'));
				}

				// Set the src attribute to the animated avatar
				avatar.setAttribute('src', url);
			}
		});
	}
}
