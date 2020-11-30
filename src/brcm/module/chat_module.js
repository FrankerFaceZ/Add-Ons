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
		
		this.supportsHeader            = true;
		this.displayConfigRequirements = false;
		this.displayMenuRequirements   = false;
		
		this.path         = new ConfigPath().addSegment(this.name);
		const configPath  = this.path.copy().addSegment('Config', 1);
		const toggleUPath = this.path.copy().addSegment('Toggles (User)', 2);
		const toggleMPath = this.path.copy().addSegment('Toggles (Moderation)', 3);
		const toggleBPath = this.path.copy().addSegment('Toggles (Broadcaster)', 4);
		
		
		this.configs.push(new IntSelectBoxConfig(
			'timeout_duration',
			n => `${n} Seconds`,
			300, 30, 1800, 30
		).setPath(configPath));
		
		
		this.modules.push(new RightClickSubModule('block', toggleUPath, brcm =>
			brcm.sendMessage(`/block ${this.user}`)));
		
		this.modules.push(new RightClickSubModule('open_in_this_tab', toggleUPath, _ =>
			window.location.href = `https://twitch.tv/${this.user}`));
		
		this.modules.push(new RightClickSubModule('open_in_new_tab', toggleUPath, _ =>
			window.open(`https://twitch.tv/${this.user}`, '_blank')));
		
		this.modules.push(new RightClickSubModule('ping', toggleUPath, brcm =>
			brcm.sendMessage(`@${this.user}`)));
		
		this.modules.push(new RightClickSubModule('unblock', toggleUPath, brcm =>
			brcm.sendMessage(`/unblock ${this.user}`)));
		
		
		this.modules.push(new RightClickSubModule('ban', toggleMPath, brcm =>
			brcm.sendMessage(`/ban ${this.user}`)).setRequiresMod());
		
		this.modules.push(new RightClickSubModule('purge', toggleMPath, brcm =>
			brcm.sendMessage(`/timeout ${this.user} 1`)).setRequiresMod());
		
		this.modules.push(new RightClickSubModule('timeout', toggleMPath, brcm =>
			brcm.sendMessage(`/timeout ${this.user} ${brcm.settings.get(getConfigKey(this.key, 'timeout_duration'))}`)).setRequiresMod());
		
		this.modules.push(new RightClickSubModule('unban', toggleMPath, brcm =>
			brcm.sendMessage(`/unban ${this.user}`)).setRequiresMod());
		
		
		this.modules.push(new RightClickSubModule('mod', toggleBPath, brcm =>
			brcm.sendMessage(`/mod ${this.user}`)).setRequiresBroadcaster().setTitle('Add Mod'));
		
		this.modules.push(new RightClickSubModule('vip', toggleBPath, brcm =>
			brcm.sendMessage(`/vip ${this.user}`)).setRequiresBroadcaster().setTitle('Add VIP'));
		
		this.modules.push(new RightClickSubModule('host', toggleBPath, brcm =>
			brcm.sendMessage(`/host ${this.user}`)).setRequiresBroadcaster());
		
		this.modules.push(new RightClickSubModule('raid', toggleBPath, brcm =>
			brcm.sendMessage(`/raid ${this.user}`)).setRequiresBroadcaster());
		
		this.modules.push(new RightClickSubModule('unmod', toggleBPath, brcm =>
			brcm.sendMessage(`/unmod ${this.user}`)).setRequiresBroadcaster().setTitle('Remove Mod'));
		
		this.modules.push(new RightClickSubModule('unvip', toggleBPath, brcm =>
			brcm.sendMessage(`/unvip ${this.user}`)).setRequiresBroadcaster().setTitle('Remove VIP'));
		
		
		this.modules = this.modules.sort((a, b) => {
			a = a.title.toLowerCase();
			b = b.title.toLowerCase();
			return a < b ? -1 : a > b ? 1 : 0;
		});
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
