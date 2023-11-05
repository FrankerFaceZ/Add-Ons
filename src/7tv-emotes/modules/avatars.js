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

		this.userAvatars = new Map();

		this.bufferedAvatars = [];
		this.requestedAvatars = [];
	}

	async onEnable() {
		await this.findAvatarClass();

		this.on('settings:changed:addon.seventv_emotes.animated_avatars', () => this.updateAvatarRenderer());

		if (this.updateInterval) clearInterval(this.updateInterval);
		this.updateInterval = setInterval(() => {
			this.findAvatarImages();
		}, 1000 * 3);

		this.updateAvatarRenderer();
	}
	
	receiveAvatarData(data) {		
		if (!data.user?.username || !data.host?.files) return;
		
		const webpEmoteVersions = data.host.files.filter((value => value.format === 'WEBP'));
		if (!webpEmoteVersions.length) return;
		
		const highestQuality = webpEmoteVersions[webpEmoteVersions.length - 1];
		
		this.userAvatars.set(data.user.username, `${data.host.url}/${highestQuality.name}`);

		this.updateAvatarRenderer();
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
		socket.emit({
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

	findAvatarImages() {
		this.postAvatarRequests();
	}

	async findAvatarClass() {
		if (this.root.flavor != 'main') return;

		const avatarElement = await this.site.awaitElement('.tw-avatar');
		
		if (avatarElement) {
			const avatarComponent = this.fine.getOwner(avatarElement);

			if (avatarComponent?.type?.styledComponentId?.includes('ScAvatar')) {
				this.AvatarClass = avatarComponent.type;
			}
		}
	}

	getUserAvatar(_login) {
		const login = _login.toLowerCase();

		if (!this.userAvatars.has(login)) {
			return undefined;
		}

		return this.userAvatars.get(login);
	}

	updateAvatarRenderer() {
		if (!this.AvatarClass) return;

		if (this.settings.get('addon.seventv_emotes.animated_avatars')) {
			const oldRenderer = this.AvatarClass.SEVENTV_oldRenderer || this.AvatarClass.render;

			this.AvatarClass.render = (component, ...args) => {
				for (const child of component.children) {
					if (child?.type?.displayName == 'ImageAvatar') this.patchImageAvatar(child);
				}
				return oldRenderer(component, ...args);
			}

			this.AvatarClass.SEVENTV_oldRenderer = oldRenderer;

			this.rerenderAvatars();
		}
		else if (this.AvatarClass.SEVENTV_oldRenderer) {
			this.rerenderAvatars();

			this.AvatarClass.render = this.AvatarClass.SEVENTV_oldRenderer;
			delete this.AvatarClass['SEVENTV_oldRenderer'];
		}
	}

	patchImageAvatar(component) {
		const props = component.props;
		if (props.userLogin && props['data-a-target'] != 'profile-image') {
			const login = props.userLogin.toLowerCase();

			const animatedAvatarURL = this.getUserAvatar(login);
			if (animatedAvatarURL === undefined) {
				if (this.bufferedAvatars.includes(login)) return;

				this.bufferedAvatars.push(login);
			}
			else if (animatedAvatarURL) {
				props.SEVENTV_oldSrc = props.SEVENTV_oldSrc || props.src;
				props.src = animatedAvatarURL;
			}
			else if (props.SEVENTV_oldSrc) {
				props.src = props.SEVENTV_oldSrc;
				delete props['SEVENTV_oldSrc'];
			}
		}
	}

	rerenderAvatars() {
		const avatarElements = document.querySelectorAll('.tw-avatar');

		const componentsToForceUpdate = new Set();
		const oldKeys = new Map();

		for (const avatarElement of avatarElements) {
			const avatarComponent = this.fine.getOwner(avatarElement);

			//Walk component tree upwards from until we find a full component we can run forceUpdate on
			let component = avatarComponent;
			while (component) {
				//Updating key on every parent is necissary to force entire tree to update
				if (!oldKeys.has(component)) {
					oldKeys.set(component, component.key);
					component.key = 'SEVENTV_rerender';
				}

				if (component.stateNode) {
					if (component.stateNode.forceUpdate) {
						componentsToForceUpdate.add(component.stateNode);
						break;
					}
				}

				component = component.return;
			}
		}

		for (const component of componentsToForceUpdate) {
			//Force updating twice is necissary for some reason. (Something to do with the way react diffs the key changes?)
			component.forceUpdate();
			component.forceUpdate();
		}

		for (const [component, oldKey] of oldKeys) {
			component.key = oldKey;
		}
	}
}