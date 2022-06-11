// A lot of helpful stuff is tucked away in FrankerFaceZ's utilities.
// You're recommended to go over it to see what's available before
// pulling in external dependencies.
import * as Chants from './Chants.jsx'
import STYLE_URL from './styles.scss'
const createElement = FrankerFaceZ.utilities.dom.createElement;
let current_chantmessage = "";
let current_chanttime = 0; 
let chant_delay = 25000;

// Add-Ons should contain a class that extends Addon.
export class TwitchChants extends Addon {
	constructor(...args) {
		super(...args);
		this.inject('chat');
		this.inject('site');
		this.injectAs('site_chat', 'site.chat');
		let user = this.site.getUser();
		

		// Within the constructor, modules can inject dependencies.
		// A module will not be enabled until all its dependencies
		// have been loaded and enabled.

		// In this case, we're depending on the FFZ module "metadata".
		this.inject('metadata');

		// All add-ons, by default, depend on the "settings" and
		// "i18n" modules.

		// If you need to ensure a dependency is loaded before
		// onLoad is called, you need to create a list on the
		// Addon here with the names of the dependencies.
		this.load_requires = ['metadata'];
		
		const ChantsProcessor = {
			process(tokens, msg) {
				if (!msg.isHistorical) {
					if (msg.badges.moderator || msg.badges.broadcaster) {
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////// leave for now for compatibility //////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
						if (msg.message.split(" ")[0] == "!chant") {
							let current_chantmessage = msg.message.split("!chant")[1].trim();
							if(current_chantmessage == "") {
								this.log.info("no chant message included");
								if (user.login == msg.user.login) { this.resolve('site.chat').addNotice(msg.roomLogin, "Correct usage of the command is: !chant <message>"); }
							}
							else {
								let message_time = parseInt(msg.timestamp);
								if (message_time > current_chanttime + chant_delay) {
									let box = Chants.addChantButton( this, msg.user.login, current_chantmessage, msg.roomLogin);
									document.getElementsByClassName("chat-input")[0].children[0].appendChild(box);
									Chants.chantCooldown();
									current_chanttime = message_time;
								}
								else
								{
									this.log.info ("chant on cooldown");
									if (user.login == msg.user.login) { this.resolve('site.chat').addNotice(msg.roomLogin, "A chant is already running."); }
								}
							}
						}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
						if (msg.message[0] == "⠀")
						{
							this.log.info("special character");
							let current_chantmessage = msg.message.split("⠀")[1].trim()
							this.log.info (msg.message);
							this.log.info (current_chantmessage);
							if(current_chantmessage == "") {
								this.log.info("no chant message included");
								//if (user.login == msg.user.login) { this.resolve('site.chat').addNotice(msg.roomLogin, "Correct usage of the command is: !chant <message>"); }
							}
							else {
								let message_time = parseInt(msg.timestamp);
								if (message_time > current_chanttime + chant_delay) {
									let box = Chants.addChantButton( this, msg.user.login, current_chantmessage, msg.roomLogin);
									document.getElementsByClassName("chat-input")[0].children[0].appendChild(box);
									Chants.chantCooldown();
									current_chanttime = message_time;
								}
								else
								{
									this.log.info ("chant on cooldown");
									//if (user.login == msg.user.login) { this.resolve('site.chat').addNotice(msg.roomLogin, "A chant is already running."); }
								}
							}
						}
					}
				}
				return tokens; 
			}
		}
		this.chat.addTokenizer(ChantsProcessor);
	}
	
	// onLoad is called when the module is being loaded, prior to
	// being enabled. If this method returns a Promise, FFZ will
	// wait for the promise to resolve before considering the
	// module as loaded.
	async onLoad() {
		// We don't actually need to do anything here, but if
		// we did, we'd already have guaranteed access to the
		// metadata module because of the earlier "load_requires"
	}

	// onEnable is called when the module is ready and should be
	// enabled. This happens when an Addon is registered, when a
	// module instance's ".enable()" method is called, or when a
	// module that depends on this module is enabled. If this
	// method returns a Promise, FFZ will wait for the promise
	// to resolve before considering the module as enabled.
	onEnable() {
		// All modules have a logger instance by default. Module
		// loggers prepend the name of the module to output.
		this.log.info('Chants Extension Enabled');

		
		this.createStyle();
		
		this.on('chat:get-tab-commands', e => {
			this.log.info ("permission level: " + e.permissionLevel);
			if ( e.permissionLevel >= 2 )
			{
				e.commands.push({
					name: 'chant',
					description: 'Send viewers a prompt for a hype message they can send to chat with one click',
					permissionLevel: 2,
					ffz_group: 'Chants',
					commandArgs: [
						{name: 'message', isRequired: true}
					]
				})
			}
        });
		
		this.on('chat:pre-send-message', e => {
			const msg = e.message;
			if (msg.split(" ")[0].toLowerCase() == "/chant") {
                e.preventDefault();
				let message = msg.slice(7).trim();
				this.log.info ("chant message: " + message );
				if (e.context._context.moderator)
				{
					this.log.info ("we are a mod");
					if(message == "") {
						this.log.info("no chant message included");
						this.resolve('site.chat').addNotice(e.channel, "Correct usage of the command is: /chant <message>");
					}
					else
					{
						let tNow = new Date().getTime();
						if (tNow > current_chanttime + chant_delay) {
							this.resolve('site.chat').sendMessage(e.channel, "⠀" + message);
							current_chanttime = tNow;
						}
						else { this.resolve('site.chat').addNotice(e.channel, "A chant is already running."); }
					}
				}
				else { this.log.info ("not a mod"); this.resolve('site.chat').addNotice(e.channel, "Only moderators can start a chant"); }
            }
		});
	}

	// onDisable is called when the module should be disabled.
	// This happens when a module instance's ".disable()" method
	// is explicitly called, when a module instance's ".unload()"
	// method is explicitly called, or when a user clicks a module's
	// "Disable" button in the Add-On listing. If a module cannot
	// be fully disabled, this method should be omitted. If this
	// method is omitted, attempting to disable the module will
	// fail. The Add-Ons UI will tell users they must refresh
	// the pages for changes to apply. If this method returns a
	// Promise, FFZ will wait for the promise to resolve before
	// considering the module as disabled.
	onDisable() {
		this.destroyStyle();
	}

	// onUnload is called when the module should be unloaded.
	// This happens when a module instance's ".unload()" method
	// is explicitly called. Just disabling a module will not
	// cause it to be unloaded. If a module cannot be unloaded
	// meaningfully, this method should be omitted. If this method
	// is omitted, attempting to unload the module will fail.
	async onUnload() {
		/* no-op */
	}
	
	destroyStyle() {
		if ( this.style ) {
			this.style.remove();
			this.style = null;
		}
	}

	createStyle() {
		if ( this.style )
			return;

		this.style = createElement('link', {
			href: STYLE_URL,
			rel: 'stylesheet',
			type: 'text/css',
			crossOrigin: 'anonymous'
		});

		document.head.appendChild(this.style);
	}
}

// Addons should register themselves. Doing so adds
// them to FFZ's map of known modules, and also attempts
// to enable the module.
TwitchChants.register();