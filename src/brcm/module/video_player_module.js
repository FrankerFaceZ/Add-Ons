import {ConfigPath}                            from '../config/config.js';
import {getParentClassNames}                   from '../utils.js';
import {RightClickModule, RightClickSubModule} from './module.js';
import {BetterRightClickMenuAddon}             from '../index.js';

export class VideoPlayerModule extends RightClickModule {

	/**
	 * @param {BetterRightClickMenuAddon} brcm
	 */
	constructor(brcm) {
		super(brcm, 'video_player');

		this.injects = ['site.player'];

		this.path        = new ConfigPath().addSegment(this.name);
		// const configPath = this.path.copy().addSegment('Config', 1);
		const togglePath = this.path.copy().addSegment('Toggles', 2);

		this.modules.push(new RightClickSubModule('clip', togglePath, brcm => {
			const el = document.querySelectorAll('[data-a-target="player-clip-button"]');
			if (el.length === 1) {
				el[0].click();
			} else {
				// eslint-disable-next-line no-alert
				alert(`ERROR: Couldn't find clip button.`);
			}
		}));

		// noinspection JSUnresolvedVariable
		if (document.pictureInPictureEnabled) {
			// noinspection JSUnresolvedVariable,JSUnresolvedFunction
			this.modules.push(new RightClickSubModule('picture_in_picture', togglePath, brcm =>
				brcm.player.Player.instances.forEach(player => brcm.player.pipPlayer(player))));
		}

		// noinspection JSUnresolvedVariable,JSUnresolvedFunction
		this.modules.push(new RightClickSubModule('reset_player', togglePath, brcm =>
			brcm.player.Player.instances.forEach(player => brcm.player.resetPlayer(player))));
	}

	checkElement(element) {
		return getParentClassNames(element).includes('video-player__container');
	}

	onClickElement(event, menuElement) {}
}
