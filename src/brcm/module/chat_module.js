import {ConfigPath, IntSelectBoxConfig}        from '../config/config.js';
import {getConfigKey, getParentClassNames}     from '../utils.js';
import {RightClickModule, RightClickSubModule} from './module.js';

export class ChatModule extends RightClickModule {
	/**
	 * @type {string}
	 */
	user;
	
	/**
	 * @param {BetterRightClickMenuAddon} brcm
	 */
	constructor(brcm) {
		super(brcm, 'chat');
		
		this.supportsHeader = true;
		
		this.path        = new ConfigPath().addSegment(this.name);
		const configPath = this.path.copy().addSegment('Config', 1);
		const togglePath = this.path.copy().addSegment('Toggles', 2);
		
		
		this.configs.push(new IntSelectBoxConfig(
			'timeout_duration',
			n => `${n} Seconds`,
			300, 30, 1800, 30
		).setPath(configPath));
		
		
		this.modules.push(new RightClickSubModule('ban', togglePath, brcm =>
			brcm.sendMessage(`/ban ${this.user}`)).setRequiresMod());
		
		this.modules.push(new RightClickSubModule('block', togglePath, brcm =>
			brcm.sendMessage(`/block ${this.user}`)));
		
		this.modules.push(new RightClickSubModule('open_in_this_tab', togglePath, () =>
			window.location.href = `https://twitch.tv/${this.user}`));
		
		this.modules.push(new RightClickSubModule('open_in_new_tab', togglePath, () =>
			window.open(`https://twitch.tv/${this.user}`, '_blank')));
		
		this.modules.push(new RightClickSubModule('ping', togglePath, brcm =>
			brcm.sendMessage(`@${this.user}`)));
		
		this.modules.push(new RightClickSubModule('purge', togglePath, brcm =>
			brcm.sendMessage(`/timeout ${this.user} 1`)).setRequiresMod());
		
		this.modules.push(new RightClickSubModule('timeout', togglePath, brcm =>
			brcm.sendMessage(`/timeout ${this.user} ${brcm.settings.get(getConfigKey(this.key, 'timeout_duration'))}`)).setRequiresMod());
		
		this.modules.push(new RightClickSubModule('unban', togglePath, brcm =>
			brcm.sendMessage(`/unban ${this.user}`)).setRequiresMod());
		
		this.modules.push(new RightClickSubModule('unblock', togglePath, brcm =>
			brcm.sendMessage(`/unblock ${this.user}`)));
	}
	
	checkElement(element) {
		return getParentClassNames(element, 5).includes('chat-line__message');
	}
	
	onClickElement(event, menuElement) {
		let chatElement;
		let parentElement = event.target;
		while (parentElement.parentElement) {
			if (parentElement.classList.contains('chat-line__message')) {
				chatElement = parentElement;
				break;
			} else {
				parentElement = parentElement.parentElement;
			}
		}
		
		if (!chatElement || !chatElement.hasAttribute('data-user')) return true;
		
		this.user   = chatElement.getAttribute('data-user');
		this.userID = chatElement.getAttribute('data-user-id');
		this.room   = chatElement.getAttribute('data-room');
		this.roomID = chatElement.getAttribute('data-room-id');
		
		const headerEl = menuElement.getElementsByClassName('header');
		if (headerEl.length === 1) {
			headerEl[0].innerText = this.user;
			// noinspection JSUnresolvedVariable
			this.brcm.twitch_data.getUser(this.userID).then(user => {
				// noinspection JSUnresolvedVariable
				if (user.stream) headerEl[0].innerText += ' (Live)';
			});
		}
	}
}
