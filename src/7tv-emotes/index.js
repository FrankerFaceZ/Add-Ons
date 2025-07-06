class SevenTVEmotes extends Addon {
	constructor(...args) {
		super(...args);

		this.inject('addons');

		this.addonID = this.name.replace(/^addon\./, '');

		this.manifest = this.addons.getAddon(this.addonID);
		
		this.load_requires = ['addon.reyohoho-emotes-proxy'];
	}

	async onLoad() {
		const context = await require.context('./modules', false, /\.js$/);
		await this.loadFromContext(context);
	}

	onEnable() {
		for (const child of Object.values(this.children)) {
			child.enable();
		}
	}
}

SevenTVEmotes.register();