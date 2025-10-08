const TURTEG_COMMAND_SYMBOL = '\u200B';
const COMMAND_MATCHER = new RegExp(`^/(\\w+)${TURTEG_COMMAND_SYMBOL}(.+)`);

export class Commands extends FrankerFaceZ.utilities.module.Module {
    constructor(...args) {
        super(...args);

        this.inject('chat');
        this.inject('settings');

        this.commands = [];

        this.settings.add('addon.turtegbot.commands.enabled', {
            default: true,
            ui: {
                sort: 1,
                path: 'Add-Ons > TurtegBot >> Commands',
                title: 'Commands',
                description: 'Suggest TurtegBot channel commands.',
                component: 'setting-check-box'
            }
        });

        this.settings.add('addon.turtegbot.commands.all', {
            default: false,
            ui: {
                sort: 2,
                path: 'Add-Ons > TurtegBot >> Commands',
                title: 'Show All Existing Commands',
                description: 'Ignore your permissions and show all existing commands.',
                component: 'setting-check-box'
            }
        });
    }

    onEnable() {
        this.settings.getChanges('addon.turtegbot.commands.enabled', enabled => {
            if (enabled) this.loadCommands();
        });

        this.on('chat:get-tab-commands', this.getTabCommands, this);
        this.on('chat:pre-send-message', this.handlePreSendMessage, this);

        this.log.info("Commands loaded.");
    }

    onDisable() {
        this.off('chat:get-tab-commands', this.getTabCommands, this);
        this.off('chat:pre-send-message', this.handlePreSendMessage, this);

        this.log.info("Commands unloaded.");
    }

    handlePreSendMessage(e) {
        if (!this.settings.get('addon.turtegbot.commands.enabled')) return;

        const msg = e.message;
            
        const match = COMMAND_MATCHER.exec(msg);
        if (!match)
            return;
        
        e.preventDefault();

        e.sendMessage(`${this.parent.roomPrefix}${match[1]} ${match[2]}`);
    }

    getTabCommands(event) {
        if (!this.settings.get('addon.turtegbot.commands.enabled')) return;
        event.commands.push(...this.getCommands());

    }

    getCommands() {
        if (this.commands.length < 1 || !this.settings.get('addon.turtegbot.commands.enabled') || !this.parent.roomId) return;

        return this.commands.map(cmd => {
            if ((cmd.requiredGlobalPower == null || this.parent.userGlobalPower < cmd.requiredGlobalPower) &&
                (cmd.requiredChannelPower == null || this.parent.userChannelPower < cmd.requiredChannelPower) &&
                !this.settings.get('addon.turtegbot.commands.all'))
                return null;

            if(cmd.category === "Special")
                return null;

            return {
                name: `${cmd.name}${TURTEG_COMMAND_SYMBOL}`,
                description: "",
                permissionLevel: 0,
                ffz_group: `TurtegBot${cmd.category ? ` (${cmd.category})` : ''}`,
            };
        }).filter(Boolean);
    }

    async loadCommands() {
        if (!this.settings.get('addon.turtegbot.commands.enabled')) return;
        this.commands = [];
        const commands = await this.parent.turtegbot_api.ffz.getCommands();
        if (commands)
            this.commands = commands;
    }
}