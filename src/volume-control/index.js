class VolumeControl extends Addon {
	constructor(...args) {
		super(...args);

		this.inject('site.player');
		this.inject('site.fine');

		// If you .bind(this) for addEventListener, removeEventListener won't work
		// most likely because `this` is different by the time `onDisable` is called.
		this.toggleMute   = this.toggleMute.bind(this);
		this.changeVolume = this.changeVolume.bind(this);
	}

	onEnable() {
		this.player.Player.ready((cls, instances) => {
			document.addEventListener('keydown', this.changeVolume);
			for (let inst of instances)
				this.fine.getChildNode(inst).addEventListener('mousedown', this.toggleMute);
		});

		this.player.Player.on('mount', inst => {
			document.addEventListener('keydown', this.changeVolume);
			this.fine.getChildNode(inst).addEventListener('mousedown', this.toggleMute);
		});

		this.player.Player.on('unmount', inst => {
			document.removeEventListener('keydown', this.changeVolume);
			this.fine.getChildNode(inst).removeEventListener('mousedown', this.toggleMute);
		});
	}

	onDisable() {
		document.removeEventListener('keydown', this.changeVolume);
		for (let inst of this.player.Player.instances)
			this.fine.getChildNode(inst).removeEventListener('mousedown', this.toggleMute);
	}

	/**
	 * Mostly to avoid running into conflict with Twitch or other add-ons
	 * that want to use middle click on the player/extensions UI.
	 */
	middleClickedOnPlayer(e) {
		return e.which === 2 && e.path[0].dataset.aTarget === 'player-overlay-click-handler';
	}

	toggleMute(e) {
		if (! this.middleClickedOnPlayer(e)) return;

		e.preventDefault();

		let isMuted = this.player.current.isMuted();

		this.player.current.setMuted(! isMuted);
		localStorage.setItem('video-muted', JSON.stringify({ default: ! isMuted }));
	}

	changeVolume(e) {
		if (
			['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)
			|| ! ['ArrowUp', 'ArrowDown'].includes(e.key)
		) return;

		e.preventDefault();

		let step   = this.settings.get('player.volume-scroll-steps'),
			volume = Math.max(0, Math.min(1, this.player.current.getVolume() + (e.key === 'ArrowUp' ? step : -step)));

		this.player.current.setVolume(volume);
		this.player.current.setMuted(false);
		localStorage.volume = volume;
		localStorage.setItem('video-muted', JSON.stringify({ default: false }));
	}
}

VolumeControl.register();
