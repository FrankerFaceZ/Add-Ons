
class Aplatypuss extends Addon {
	constructor(...args) {
		super(...args);

		this.inject('settings');
		this.inject('chat');
		this.inject('chat.emotes');
		this.inject('site');

		this.settings.add('aplatypuss.enable_emoticons', {
			default: true,

			ui: {
				path: 'Add-Ons > APlatypuss >> Emotes',
				title: 'Show Emotes',
				description: 'Enable to show APlatypuss emotes.',
				component: 'setting-check-box',
			},
		});

		this.chat.context.on('changed:aplatypuss.enable_emoticons', this.updateEmotes, this);
		
	}

	onEnable() {
		this.log.debug('Aplatypuss Emotes module was enabled successfully.');
		
		this.on('chat:room-add', this.roomAdd);
		this.on('chat:room-remove', this.roomRemove);

		var set = {
			emoticons: [],
			title: 'Global Emotes',
			source: 'Aplatypuss',
			_type: 1,
		};

		const realID = 'addon--aplatypuss--emotes';

		this.emotes.addDefaultSet('addon--aplatypuss', realID, set);

		//this.updateGlobalEmotes();

		for (const room of this.chat.iterateRooms()) {
			if (room) this.updateChannel(room);
		}

	}

	roomAdd(room) {
		this.updateChannel(room);
	}

	roomRemove(room) {
		this.updateChannel(room);
	}

	async updateChannelEmotes(room, attempts = 0) {
		const realID = 'addon--aplatypuss--emotes';
		room.removeSet('addon--aplatypuss', realID);
		//this.emotes.unloadSet(realID);

		if (!this.chat.context.get('aplatypuss.enable_emoticons')) {
			return;
		}
		
		const BASE_URL = "https://jdude.tv/images/emotes/"
		const response = await fetch('https://jdude.tv/images/emotes/emotes.json');
		if (response.ok) {
			const platyEmotes = [];

			for (const dataEmote of await response.json()) {
				
				const arbitraryEmote = /[^A-Za-z0-9]/.test(dataEmote.code);
		
				const emote = {
					id: dataEmote.code,
					urls: {
						1: undefined,
					},
					name: dataEmote.code,
					width: dataEmote.width,
					height: dataEmote.width,
					require_spaces: arbitraryEmote,
					modifier: false,
					modifier_offset: undefined,
					//click_url: `https://betterttv.com/emotes/${dataEmote.id}`
				};
		
				emote.urls = {
					1: BASE_URL + `${dataEmote.id}` + "28.webp",
					2: BASE_URL + `${dataEmote.id}` + "56.webp",
					4: BASE_URL + `${dataEmote.id}` + "112.webp",
				};
		
		
				platyEmotes.push(emote);
			}
			
	
			let setEmotes = [];
			setEmotes = setEmotes.concat(platyEmotes);
	
			let set = {
				emoticons: setEmotes,
				title: 'Channel Emotes',
				source: 'Aplatypuss',
				icon: 'https://jdude.tv/images/emotes/icon.png',
			};
			room.addSet('addon--aplatypusss', realID, set);
		
		}else {
			if (response.status === 404) return;

			const newAttempts = (attempts || 0) + 1;
			if (newAttempts < 12) {
				this.log.error('Failed to fetch global emotes. Trying again in 5 seconds.');
				setTimeout(this.updateChannelEmotes.bind(this,room, newAttempts), 5000);
			}
		}
	}

	async updateChannel(room) {
		const realID = 'addon--aplatypuss--emotes';

		console.log(room);
		if(room._id != 39464264){ //Platy Twitch ID
			console.log("disabling Aplatypuss emotes")
			this.emotes.unloadSet('addon--aplatypuss', realID);
		}
		else{
			console.log("Aplatypuss emotes enabled")
			this.updateChannelEmotes(room);
			this.emotes.loadSet('addon--aplatypuss', realID);

		}

	}

	updateEmotes() {
		//this.updateGlobalEmotes();
		for (const room of this.chat.iterateRooms()) {
			if (room) this.updateChannel(room);
		}
	}
}

Aplatypuss.register();
