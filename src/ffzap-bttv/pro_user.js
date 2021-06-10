import { PREFIX, ICON, generateEmoteBlock, generateClickURL }  from './shared';

export default class ProUser {
	constructor(parent, username, emotesArray) {
		this.parent = parent;

		this.username = username;
		this.emotesArray = emotesArray;

		this.set_id = `${PREFIX}--emotes-pro-${this.username}`;
		this.user = this.parent.chat.getUser(null, this.username);
		this.loadEmotes();
	}

	loadEmotes() {
		if ( ! this.user || ! this.emotesArray )
			return;

		this.emotes = [];

		for(const emote of this.emotesArray) {
			const id = emote.id,
				is_animated = emote.imageType === 'gif';

			this.emotes.push({
				id,
				name: emote.code,
				width: 28,
				height: 28,
				owner: emote.channel ? {
					display_name: emote.channel,
					name: emote.channel
				} : null,
				require_spaces: true,
				click_url: generateClickURL(id),
				urls: generateEmoteBlock(id, is_animated),
				animated: is_animated ? generateEmoteBlock(id) : null
			});
		}

		if ( this.emotes.length ) {
			this.parent.emotes.loadSetData(this.set_id, {
				title: 'Personal Emotes',
				source: 'BetterTTV',
				icon: ICON,
				emotes: this.emotes
			});

			this.user.addSet(PREFIX, this.set_id);
		} else
			this.user.removeSet(PREFIX, this.set_id);
	}

	destroy() {
		if ( this.user )
			this.user.removeSet(PREFIX, this.set_id);

		this.user = null;
		this.emotes = this.emotesArray = null;
		this.parent = null;
	}
}
