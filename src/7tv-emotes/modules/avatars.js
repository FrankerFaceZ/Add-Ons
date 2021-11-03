export default class Avatars extends FrankerFaceZ.utilities.module.Module {
	constructor(...args) {
		super(...args);

		this.inject("..api");

		this.inject('settings');
		this.inject("site");
		this.inject("site.fine");

		this.settings.add('addon.seventv_emotes.animated_avatars', {
			default: true,
			ui: {
				path: 'Add-Ons > 7TV Emotes >> User Cosmetics',
				title: 'Animated Avatars',
				description: 'Show 7TV animated avatars. [(7TV Subscriber Perk)](https://7tv.app/subscribe)',
				component: 'setting-check-box',
			}
		});

		this.userAvatars = new Map();
	}

	async onEnable() {
		await this.findAvatarClass();

		this.on('settings:changed:addon.seventv_emotes.animated_avatars', () => this.updateAnimatedAvatars());

		this.updateAnimatedAvatars();
	}

	async findAvatarClass() {
		if (this.root.flavor != "main") return;

		let avatarElement = await this.site.awaitElement(".tw-avatar");

		if (avatarElement) {
			let avatarComponent = this.fine.getOwner(avatarElement);

			if (avatarComponent.type.displayName == "ScAvatar") {
				this.AvatarClass = avatarComponent.type;
			}
		}
	}

	getUserAvatar(login) {
		return this.userAvatars.get(login.toLowerCase());
	}

	async updateAnimatedAvatars() {
		this.userAvatars.clear();

		if (this.settings.get('addon.seventv_emotes.animated_avatars')) {
			const avatars = await this.api.fetchAvatars();
			for (const [login, avatar] of Object.entries(avatars)) {
				this.userAvatars.set(login, avatar);
			}
		};

		this.updateAvatarRenderer();
	};

	updateAvatarRenderer() {
		if (!this.AvatarClass) return;

		if (this.settings.get('addon.seventv_emotes.animated_avatars')) {
			let oldRenderer = this.AvatarClass.SEVENTV_oldRenderer || this.AvatarClass.render;

			this.AvatarClass.render = (component, ...args) => {
				for (let child of component.children) {
					if (child?.type?.displayName == "ImageAvatar") this.patchImageAvatar(child);
				}
				return oldRenderer(component, ...args);
			}

			this.AvatarClass.SEVENTV_oldRenderer = oldRenderer;

			this.rerenderAvatars();
		}
		else if (this.AvatarClass.SEVENTV_oldRenderer) {
			this.rerenderAvatars();

			this.AvatarClass.render = this.AvatarClass.SEVENTV_oldRenderer;
			delete this.AvatarClass["SEVENTV_oldRenderer"];
		}
	}

	patchImageAvatar(component) {
		let props = component.props;
		if (props.userLogin && props["data-a-target"] != "profile-image") {
			let animatedAvatarURL = this.getUserAvatar(props.userLogin);
			if (animatedAvatarURL) {
				props.SEVENTV_oldSrc = props.SEVENTV_oldSrc || props.src;
				props.src = animatedAvatarURL;
			}
			else if (props.SEVENTV_oldSrc) {
				props.src = props.SEVENTV_oldSrc;
				delete props["SEVENTV_oldSrc"];
			}
		}
	}

	rerenderAvatars() {
		let avatarElements = document.querySelectorAll(".tw-avatar");

		let componentsToForceUpdate = new Set();
		let oldKeys = new Map();

		for (let avatarElement of avatarElements) {
			let avatarComponent = this.fine.getOwner(avatarElement);
			
			let component = avatarComponent;
			while (component) {
				if (!oldKeys.has(component)) {
					oldKeys.set(component, component.key);
					component.key = "SEVENTV_rerender";
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

		for (let component of componentsToForceUpdate) {
			component.forceUpdate();
		}

		for (const [component, oldKey] of Object.entries(oldKeys)) {
			component.key = oldKey;
		}
	}
}