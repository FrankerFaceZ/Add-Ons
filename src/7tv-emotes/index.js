class SevenTVEmotes extends Addon {
	constructor(...args) {
		super(...args);

		this.inject('addons');

		this.addonID = this.name.replace(/^addon\./, '');

		this.manifest = this.addons.getAddon(this.addonID);
	}

	async onLoad() {
		const context = await require.context('./modules', false, /\.js$/);
		await this.populate(context);
	}

	onEnable() {
		for (const child of Object.values(this.children)) {
			child.enable();
		}
	}
}

SevenTVEmotes.register();
