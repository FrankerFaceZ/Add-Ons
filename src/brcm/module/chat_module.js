import {IntSelectBoxConfig, SelectBoxConfig}                    from '../config/config.js';
import {getConfigKey, getParentClassNames}                      from '../utils.js';
import {ModuleSeparator, RightClickModule, RightClickSubmodule} from './module.js';

export class ChatModule extends RightClickModule {
	/**
	 * @type {string}
	 */
	user;
	
	/**
	 * @type {number}
	 */
	userID;
	
	/**
	 * @type {string}
	 */
	room;
	
	/**
	 * @type {number}
	 */
	roomID;
	
	/**
	 * @type {string}
	 */
	clickedLink;
	
	/**
	 * @param {BetterRightClickMenuAddon} brcm
	 */
	constructor(brcm) {
		super(brcm, 'chat');
		
		const timeValues = [
			[1, '1 Second'],
			[30, '30 Seconds'],
			[60, '1 Minute'],
			[300, '5 Minutes'],
			[600, '10 Minutes'],
			[1800, '30 Minutes'],
			[3600, '1 Hour'],
			[7200, '2 Hours'],
			[10800, '3 Hours'],
			[21600, '6 Hours'],
			[43200, '12 Hours'],
			[86400, '1 Day'],
			[172800, '2 Days'],
			[604800, '1 Week'],
			[1209600, '2 Weeks']
		];
		
		this.injects                   = ['site.apollo'];
		this.supportsHeader            = true;
		this.displayConfigRequirements = false;
		this.displayMenuRequirements   = false;
		
		const configPath  = this.path.copy().addSegment('Config', 1);
		const toggleUPath = this.path.copy().addSegment('Toggles (User)', 2);
		const toggleMPath = this.path.copy().addSegment('Toggles (Moderation)', 3);
		const toggleBPath = this.path.copy().addSegment('Toggles (Broadcaster)', 4);
		
		
		this.addConfig(new IntSelectBoxConfig(
			'timeout_duration',
			n => `${n} Seconds`,
			300, 30, 1800, 30
		)).setPath(configPath);
		
		this.addConfig(new SelectBoxConfig(
			'default_open_mode',
			`new_tab`,
			[{value: 'new_tab', title: 'Open in new tab'},
				{value: 'this_tab', title: 'Open in this tab'}]
		)).setPath(configPath);
		
		this.addSubmodule('block', toggleUPath, () => this.brcm.sendMessage(`/block ${this.user}`));
		this.addSubmodule('unblock', toggleUPath, () => this.brcm.sendMessage(`/unblock ${this.user}`));
		
		const userNewTabModule  = new RightClickSubmodule('open_in_new_tab', toggleUPath, () => window.open(`https://twitch.tv/${this.user}`, '_blank'));
		const userThisTabModule = new RightClickSubmodule('open_in_this_tab', toggleUPath, () => window.location.href = `https://twitch.tv/${this.user}`);
		const userOpenSubmodule = this.addSubmodule('open', toggleUPath, () => {
			if (this.brcm.settings.get(getConfigKey(this.key, 'default_open_mode')) === 'new_tab') window.open(`https://twitch.tv/${this.user}`, '_blank');
			else window.location.href = `https://twitch.tv/${this.user}`;
		}).setTitle('Open Profile');
		userOpenSubmodule.addSubmodule(userNewTabModule);
		userOpenSubmodule.addSubmodule(userThisTabModule);
		
		const linkNewTabModule  = new RightClickSubmodule('open_link_in_new_tab', null, () => window.open(this.clickedLink, '_blank'));
		const linkThisTabModule = new RightClickSubmodule('open_link_in_this_tab', null, () => window.location.href = this.clickedLink);
		const linkSubmodule     = this.addSubmodule('open_link', null, () => {
			if (this.brcm.settings.get(getConfigKey(this.key, 'default_open_mode')) === 'new_tab') linkNewTabModule.onClick();
			else linkThisTabModule.onClick();
		}).setTitle('Open Link');
		linkSubmodule.addSubmodule(linkNewTabModule);
		linkSubmodule.addSubmodule(linkThisTabModule);
		this.addSubmodule('ping', toggleUPath, () => this.brcm.sendMessage(`@${this.user}`));
		
		this.addSubmodule(new ModuleSeparator().setRequiresMod());
		
		const timeoutSubmodule = this.addSubmodule('timeout', toggleMPath, () => this.brcm.sendMessage(`/timeout ${this.user} ${brcm.settings.get(getConfigKey(this.key, 'timeout_duration'))}`)).setRequiresMod();
		timeValues.forEach(value => timeoutSubmodule.addSubmodule(`timeout_${value[0]}`, toggleMPath, () => this.brcm.sendMessage(`/timeout ${this.user} ${value[0]}`)).setTitle(value[1]));
		this.addSubmodule('untimeout', toggleMPath, () => this.brcm.sendMessage(`/untimeout ${this.user}`)).setRequiresMod().setTitle('Remove Timeout');
		this.addSubmodule('ban', toggleMPath, () => this.brcm.sendMessage(`/ban ${this.user}`)).setRequiresMod();
		this.addSubmodule('unban', toggleMPath, () => this.brcm.sendMessage(`/unban ${this.user}`)).setRequiresMod().setTitle('Remove Ban');
		this.addSubmodule('purge', toggleMPath, () => this.brcm.sendMessage(`/timeout ${this.user} 1`)).setRequiresMod();
		
		this.addSubmodule(new ModuleSeparator().setRequiresBroadcaster());
		
		this.addSubmodule('vip', toggleBPath, () => this.brcm.sendMessage(`/vip ${this.user}`)).setRequiresBroadcaster().setTitle('Add VIP');
		this.addSubmodule('unvip', toggleBPath, () => this.brcm.sendMessage(`/unvip ${this.user}`)).setRequiresBroadcaster().setTitle('Remove VIP');
		this.addSubmodule('mod', toggleBPath, () => this.brcm.sendMessage(`/mod ${this.user}`)).setRequiresBroadcaster().setTitle('Add Mod');
		this.addSubmodule('unmod', toggleBPath, () => this.brcm.sendMessage(`/unmod ${this.user}`)).setRequiresBroadcaster().setTitle('Remove Mod');
		this.addSubmodule('host', toggleBPath, () => this.brcm.sendMessage(`/host ${this.user}`)).setRequiresBroadcaster();
		this.addSubmodule('raid', toggleBPath, () => this.brcm.sendMessage(`/raid ${this.user}`)).setRequiresBroadcaster();
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
		
		const linkElement = document.getElementById(`brcm-${this.key}-open_link`);
		if (linkElement) {
			if (!linkElement.classList.contains('hide'))
				linkElement.classList.add('hide');
			
			if ('classList' in event.target && event.target.classList.contains('link-fragment') && 'href' in event.target) {
				if (linkElement.classList.contains('hide'))
					linkElement.classList.remove('hide');
				
				this.clickedLink = event.target.href;
			} else {
				this.clickedLink = '';
			}
		}
		
		this.user   = chatElement.getAttribute('data-user');
		this.userID = parseInt(chatElement.getAttribute('data-user-id'));
		this.room   = chatElement.getAttribute('data-room');
		this.roomID = parseInt(chatElement.getAttribute('data-room-id'));
		
		const raidElement = document.getElementById(`brcm-${this.key}-raid`);
		if (raidElement && !raidElement.classList.contains('hide'))
			raidElement.classList.add('hide');
		
		const hostElement = document.getElementById(`brcm-${this.key}-host`);
		if (hostElement && !hostElement.classList.contains('hide'))
			hostElement.classList.add('hide');
		
		let headerEl, headerElList = menuElement.getElementsByClassName('header');
		if (headerElList.length === 1)
			(headerEl = headerElList[0]).innerText = this.user;
		
		this.brcm.twitch_data.getUser(null, this.user).then(user => {
			if (headerEl) headerEl.innerText = user.displayName;
			if (user.stream) {
				if (this.user !== this.brcm.getMe().login) {
					if (raidElement && raidElement.classList.contains('hide'))
						raidElement.classList.remove('hide');
					
					if (hostElement && hostElement.classList.contains('hide'))
						hostElement.classList.remove('hide');
				}
				if (headerEl) headerEl.innerText += ' (Live)';
			}
		});
	}
}
