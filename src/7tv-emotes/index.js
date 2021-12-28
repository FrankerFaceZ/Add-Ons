class SevenTVEmotes extends Addon {
	constructor(...args) {
		super(...args);

		this.inject('addons');

		this.addonID = this.name.replace(/^addon\./, '');

		this.manifest = this.addons.getAddon(this.addonID);
	}

	async onLoad() {
		let context = await require.context('./modules', false, /\.js$/);
		await this.populate(context);
	}

	onEnable() {
		for (let child of Object.values(this.children)) {
			child.enable();
		}
	}
}

SevenTVEmotes.register();