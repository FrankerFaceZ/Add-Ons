import * as Utils     from './util/utils';
import {getConfigKey} from './util/constants';

export const chat = {
	title       : 'Chat',
	onClick     : (event, menuElement) => {
		let chatEl;
		let parentEl = event.target;
		while (chatEl === undefined && parentEl.parentElement != null) {
			if (parentEl.className === 'chat-line__message') {
				chatEl = parentEl;
			} else {
				parentEl = parentEl.parentElement;
			}
		}
		
		// If false is returned then the normal right click menu will be shown
		if (chatEl === undefined) return false;
		
		menuElement.setAttribute('user', chatEl.getAttribute('data-user'));
		menuElement.setAttribute('user_id', chatEl.getAttribute('data-user-id'));
		menuElement.setAttribute('room', chatEl.getAttribute('data-room'));
		menuElement.setAttribute('room_id', chatEl.getAttribute('data-room-id'));
		
		return true;
	},
	checkElement: element => Utils.getParentClassNames(element, 5).includes('chat-line__message'),
	modules     : {
		ban             : {
			title      : 'Ban',
			requiresMod: true,
			method     : (brc, values) => Utils.sendMessage(brc, `/ban ${values.user}`)
		},
		block           : {
			enabledByDefault: true,
			method          : (brc, values) => Utils.sendMessage(brc, `/block ${values.user}`)
		},
		delete          : {
			title      : 'Delete',
			requiresMod: true,
			method     : (brc, values) => Utils.sendMessage(brc, `/delete ${values.user}`)
		},
		open_in_this_tab: {
			enabledByDefault: true,
			method          : (brc, values) => window.location.href = `https://twitch.tv/${values.user}`
		},
		open_in_new_tab : {
			enabledByDefault: true,
			method          : (brc, values) => window.open(`https://twitch.tv/${values.user}`, '_blank')
		},
		ping            : {
			enabledByDefault: true,
			method          : (brc, values) => Utils.sendMessage(brc, `@${values.user}`)
		},
		purge           : {
			requiresMod: true,
			method     : (brc, values) => Utils.sendMessage(brc, `/timeout ${values.user} 1`)
		},
		timeout         : {
			requiresMod: true,
			method     : (brc, values) => Utils.sendMessage(brc, `/timeout ${values.user} ${brc.settings.get(getConfigKey('chat', 'timeout_duration'))}`),
			config     : {
				default    : 300,
				title      : 'Timeout Duration',
				description: 'Duration to timeout someone for',
				key        : getConfigKey('chat', 'timeout_duration'),
				list       : [
					{value: 1, title: '1 Second'}, {value: 30, title: '30 Seconds'},
					{value: 60, title: '1 Minute'}, {value: 120, title: '2 Minute'},
					{value: 300, title: '5 Minutes'}, {value: 600, title: '10 Minutes'},
					{value: 1800, title: '30 Minutes'}, {value: 3600, title: '1 Hour'},
					{value: 7200, title: '2 Hours'}, {value: 10800, title: '3 Hours'},
					{value: 21600, title: '6 Hours'}, {value: 43200, title: '12 Hours'},
					{value: 86400, title: '1 Day'}, {value: 172800, title: '2 Days'},
					{value: 259200, title: '3 Days'}, {value: 604800, title: '1 Week'},
					{value: 1209600, title: '2 Weeks'}
				],
				type       : 'list'
			}
		},
		unban           : {
			requiresMod: true,
			method     : (brc, values) => Utils.sendMessage(brc, `/unban ${values.user}`)
		},
		unblock         : {
			method: (brc, values) => Utils.sendMessage(brc, `/unblock ${values.user}`)
		}
	}
};
