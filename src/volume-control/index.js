class VolumeControl extends Addon {
	constructor(...args) {
		super(...args);

		this.inject('site.player');

		// Mostly to avoid running into conflict with Twitch or other add-ons
		// that want to use middle click on the player/extensions UI.
		this.playerClickHandler = document.querySelector('[data-a-target=player-overlay-click-handler]');

		// If you .bind(this) for addEventListener, removeEventListener won't work
		// most likely because `this` is different by the time `onDisable` is called.
		this.toggleMute   = this.toggleMute.bind(this);
		this.changeVolume = this.changeVolume.bind(this);
	}

	/**
	 * Avoid polluting the console with errors due to the player not being found.
	 * E.g. Popout chat, alternative players...
	 */
	playerIsFound() {
		return this.player.current;
	}

	onEnable() {
		if (this.playerIsFound()) {
			this.playerClickHandler?.addEventListener('mousedown', this.toggleMute);
			document.addEventListener('keydown', this.changeVolume);
		}
	}

	onDisable() {
		if (this.playerIsFound()) {
			this.playerClickHandler?.removeEventListener('mousedown', this.toggleMute);
			document.removeEventListener('keydown', this.changeVolume);
		}
	}

	toggleMute(e) {
		if (e.which !== 2) return; // 2 = middle click

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
