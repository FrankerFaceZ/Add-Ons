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

		this.updateInterval = false;
		this.requestInterval = false;

		this.userAvatars = new Map();

		this.bufferedAvatars = [];
	}

	onEnable() {
		this.settings.getChanges('addon.seventv_emotes.animated_avatars', () => this.onSettingChange());

		this.onSettingChange();
	}

	onSettingChange() {
		const enabled = this.settings.get('addon.seventv_emotes.animated_avatars');

		if (enabled) {
			if (!this.updateInterval) {
				this.updateInterval = setInterval(() => {
					this.updateAvatars();
				}, 1000);
			}

			if (!this.requestInterval) {
				this.requestInterval = setInterval(() => {
					this.postAvatarRequests();
				}, 500);
			}
		}
		else {
			clearInterval(this.updateInterval);
			this.updateInterval = false;
			
			clearInterval(this.requestInterval);
			this.requestInterval = false;
		}

		this.updateAvatars();
	}
	
	receiveAvatarData(data) {		
		if (!data.user?.username || !data.host?.files) return;
		
		const webpEmoteVersions = data.host.files.filter((value => value.format === 'WEBP'));
		if (!webpEmoteVersions.length) return;
		
		const highestQuality = webpEmoteVersions[webpEmoteVersions.length - 1];
		
		this.userAvatars.set(data.user.username, `${data.host.url}/${highestQuality.name}`);

		this.updateAvatars(data.user.username);
	}

	getVisibleAvatars() {
		return document.querySelectorAll('.tw-image-avatar');
	}

	updateAvatars(username = undefined) {
		const enabled = this.settings.get('addon.seventv_emotes.animated_avatars');

		const avatars = this.getVisibleAvatars();
		for (const avatar of avatars) {
			if (!enabled) {
				// Check if the avatar has an seventv-original-avatar attribute and set it
				if (avatar.hasAttribute('seventv-original-avatar')) {
					avatar.setAttribute('src', avatar.getAttribute('seventv-original-avatar'));
					avatar.removeAttribute('seventv-original-avatar');
				}

				continue;
			}

			// If this avatar has the seventv-original-avatar attribute already, skip it
			if (avatar.hasAttribute('seventv-original-avatar')) continue;

			// Get the react instance for the avatar element
			const avatarComponent = this.fine.getOwner(avatar);
			if (!avatarComponent) continue;

			// Find the nearest parent that has information about the user login
			const parentWithLogin = this.fine.searchParent(avatarComponent, e => e.props?.user?.login
				|| e.props?.targetLogin
				|| e.props?.userLogin
				|| e.props?.channelLogin,
			50);

			// props.user.login is for our own avatar in the top right
			// props.targetLogin is for viewer cards
			// props.userLogin appears to be for channels in the sidebar
			// props.channelLogin is for the
			// The 'alt' attribute is a fallback 
			const login = parentWithLogin?.props?.user?.login
				|| parentWithLogin?.props?.targetLogin
				|| parentWithLogin?.props?.userLogin
				|| parentWithLogin?.props?.channelLogin
				|| avatar.getAttribute('alt');

			// No login? No avatar.
			if (!login || username && login !== username) continue;
			
			// Get the animated avatar URL for this login
			const animatedAvatarURL = this.getUserAvatar(login);
			if (animatedAvatarURL === undefined) {
				if (this.bufferedAvatars.includes(login)) continue;

				// The user has not been requested yet, buffer them
				this.bufferedAvatars.push(login);
			}
			else if (animatedAvatarURL) {
				// Set the seventv-original-avatar attribute to the current src attribute
				avatar.setAttribute('seventv-original-avatar', avatar.getAttribute('src'));
	
				// Set the src attribute to the animated avatar
				avatar.setAttribute('src', animatedAvatarURL);
			}
		}
	}

	postAvatarRequests() {
		if (!this.bufferedAvatars.length) return;
		
		const requestArray = [];
		for (const login of this.bufferedAvatars) {
			requestArray.push(`username:${login}`);

			// Set their avatar to false already so it won't get requested again
			this.userAvatars.set(login, false);
		}
		
		const socket = this.resolve('..socket');
		socket.emitSocket({
			op: socket.OPCODES.BRIDGE,
			d: {
				command: 'userstate',
				body: {
					identifiers: requestArray,
					platform: 'TWITCH',
					kinds: ['AVATAR']
				}
			}
		});

		this.bufferedAvatars = [];
	}

	getUserAvatar(_login) {
		const login = _login.toLowerCase();

		return this.userAvatars.get(login);
	}
}