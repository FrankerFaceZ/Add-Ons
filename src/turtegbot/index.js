import { Api } from "./api";
import { Badges } from "./badges";
import { Commands } from "./commands";

class TurtegBot extends Addon {
	constructor(...args) {
		super(...args);

		this.inject('site');
		this.inject('site.chat');

		this.injectAs('turtegbot_api', Api);
		this.injectAs('turtegbot_badges', Badges);
		this.injectAs('turtegbot_commands', Commands);

		this.twitchUser = this.site.getUser();
		this.roomId = null;
		this.roomPrefix = "#";
		this.userId = null;
		this.userGlobalPower = 0;
		this.userChannelPower = 0;


		this.settings.add('addon.turtegbot.global.fetchuser', {
			default: true,
			ui: {
				sort: 1,
				path: 'Add-Ons > TurtegBot >> Global',
				title: 'Fetch User Data',
				description: 'Determines whether to fetch your user data from TurtegBot. This enables suggestions only for commands you have permission to use. If disabled, commands will not be filtered by your permissions.',
				component: 'setting-check-box'
			}
		});

		this.settings.add('addon.turtegbot.global.fetchroom', {
			default: true,
			ui: {
				sort: 2,
				path: 'Add-Ons > TurtegBot >> Global',
				title: 'Fetch Room Data',
				description: 'Determines whether to fetch the current room data from TurtegBot. This ensures commands are sent with the correct prefix. If disabled, commands will use the default (“#”) prefix, which may not always trigger the bot.',
				component: 'setting-check-box'
			}
		});

		if (this.settings.get('addon.turtegbot.global.fetchuser'))
			this.registerUser(this.twitchUser.id);

		if (this.settings.get('addon.turtegbot.global.fetchroom'))
			this.on('chat:room-add', this.registerRoom, this);
	}

	onEnable() {
		this.log.info("Enabled!");
	}

	onDisable() {
		for (const child of Object.values(this.children)) {
			child.disable();
		}

		this.off('chat:room-add', this.registerRoom, this);

		this.log.info("Disabled!");
	}

	async registerRoom(room) {
		this.roomId = await this.turtegbot_api.room.getRoomId(room.id);
		if(!this.roomId) {
			this.log.info(`Room not found for Twitch ID: ${room.id}`);
			return;
		}

		const roomSettings = await this.turtegbot_api.room.getRoomSettings(this.roomId);
		if(!roomSettings.isBotAdded)
		{
			this.roomId = undefined;
			return;
		}

		this.roomPrefix = roomSettings.prefix || "#";

		if (this.userId)
			this.userChannelPower = await this.turtegbot_api.ffz.getUserPower(this.roomId, this.userId);
		
		if(this.userChannelPower === null)
			if(this.chat.ChatContainer.first.props.commandPermissionLevel === 3) // Broadcaster
				this.userChannelPower = 10;
			else if(this.chat.ChatContainer.first.props.commandPermissionLevel === 2) // Moderator
				this.userChannelPower = 5;

		this.log.info(`Fetched room with ID: ${this.roomId}, prefix: ${this.roomPrefix}, userChannelPower: ${this.userChannelPower}`);
	}
	async registerUser(twitchId) {
		this.userId = await this.turtegbot_api.users.getUserId(twitchId);
		if(!this.userId) {
			this.log.info(`User not found for Twitch ID: ${twitchId}`);
			return;
		}

		const user = await this.turtegbot_api.users.getUser(this.userId);
		this.userGlobalPower = user.role.power || 0;
		
		this.log.info(`Fetched user with ID: ${this.userId}, globalPower: ${this.userGlobalPower}`);
	}
}

TurtegBot.register();
