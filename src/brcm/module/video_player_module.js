import {getParentClassNames}                   from '../utils.js';
import {RightClickModule, RightClickSubmodule} from './module.js';

export class VideoPlayerModule extends RightClickModule {
	
	/**
	 * @param {BetterRightClickMenuAddon} brcm
	 */
	constructor(brcm) {
		super(brcm, 'video_player');
		
		this.injects = ['site.player'];
		
		const configPath = this.path.copy().addSegment('Config', 1);
		const togglePath = this.path.copy().addSegment('Toggles', 2);
		
		this.modules.push(new RightClickSubmodule('clip', togglePath, () => {
			const el = document.querySelectorAll('[data-a-target="player-clip-button"]');
			if (el.length === 1) {
				el[0].click();
			} else {
				alert(`ERROR: Couldn't find clip button.`);
			}
		}));
		
		// noinspection JSUnresolvedVariable
		if (document.pictureInPictureEnabled) {
			// noinspection JSUnresolvedVariable,JSUnresolvedFunction
			this.modules.push(new RightClickSubmodule('picture_in_picture', togglePath, () =>
				this.brcm.player.Player.instances.forEach(player => this.brcm.player.pipPlayer(player))));
		}
		
		// noinspection JSUnresolvedVariable,JSUnresolvedFunction
		this.modules.push(new RightClickSubmodule('reset_player', togglePath, () =>
			this.brcm.player.Player.instances.forEach(player => this.brcm.player.resetPlayer(player))));
	}
	
	checkElement(element) {
		return getParentClassNames(element).includes('video-player__container');
	}
	
	onClickElement(event, menuElement) {}
}
