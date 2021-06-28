class SupaEmotes extends Addon {
	constructor(...args) {
		super(...args);

		this.inject('chat');
		this.inject('chat.emotes');
		this.inject('site');
	}

	onEnable() {
		this.log.debug('Supa Emotes module was enabled successfully.');

		this.updateEmotes();
	}

	async updateChannel(room, attempts = 0) {
		const realID = `addon--supaemotes--channel-${room.id}`;
		room.removeSet('addon--supaemotes', realID);
		this.emotes.unloadSet(realID);

		let emotes = [];

		const response = await fetch(`https://emotes.supa.codes/api/users/${room.id}/emotes`);
		if (response.ok) {
			const data = await response.json();

			emotes = data
		} else {
			if (response.status === 404) return;

			const newAttempts = (attempts || 0) + 1;
			if (newAttempts < 12) {
				this.log.error('Failed to fetch emotes. Trying again in 5 seconds.');
				setTimeout(this.updateChannel.bind(this, room, newAttempts), 5000);
			}
		}

		if (emotes.length === 0) return;

		const set = {
			emotes,
			title: 'Channel Emotes',
			source: 'Supa Emotes',
			icon: 'https://emotes.supa.codes/public/logo.png',
		};

		room.addSet('addon--supaemotes', realID, set);
	}

	updateEmotes() {
		for (const room of this.chat.iterateRooms()) {
			if (room) this.updateChannel(room);
		}
	}
}

SupaEmotes.register();