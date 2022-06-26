
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

		this.updateGlobalEmotes();

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

	async updateGlobalEmotes(attempts = 0) {
		const realID = 'addon--aplatypuss--emotes';
		this.emotes.removeDefaultSet('addon--aplatypuss', realID);
		this.emotes.unloadSet(realID);

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
				title: 'Aplatypuss Emotes',
				source: 'Aplatypuss',
				//icon: 'https://cdn.betterttv.net/tags/developer.png',
				_type: 1,
			};
	
			this.emotes.addDefaultSet('addon--aplatypusss', realID, set);
		
		}else {
			if (response.status === 404) return;

			const newAttempts = (attempts || 0) + 1;
			if (newAttempts < 12) {
				this.log.error('Failed to fetch global emotes. Trying again in 5 seconds.');
				setTimeout(this.updateGlobalEmotes.bind(this, newAttempts), 5000);
			}
		}
	}

	async updateChannel(room) {
		const realID = 'addon--aplatypuss--emotes';

		if(room._login != "aplatypuss"){
			console.log("disabling Aplatypuss emotes")
			this.emotes.unloadSet('addon--aplatypuss', realID);
		}
		else{
			console.log("Aplatypuss emotes enabled")
		}

	}

	updateEmotes() {
		this.updateGlobalEmotes();
	}
}

Aplatypuss.register();
