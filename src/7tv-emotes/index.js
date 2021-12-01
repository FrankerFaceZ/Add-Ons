class SevenTVEmotes extends Addon {
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