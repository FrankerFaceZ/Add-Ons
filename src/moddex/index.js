import Badges from './modules/badges';
import Socket from './modules/socket';

class Moddex extends Addon {
	constructor(...args) {
		super(...args);

		this.settings.add('addon.moddex.live', {
			default: true,
			ui: {
				path: 'Add-Ons > moddex >> Badges',
				title: 'Update badges live',
				description:
					'Hold a connection to moddex so a badge someone puts on or takes off appears without reloading Twitch. With this off, badges are read once when the add-on starts.',
				component: 'setting-check-box'
			}
		});

		this.register('badges', Badges, true);
		this.register('socket', Socket, true);
	}

	async onEnable() {
		await this.badges.enable();
		await this.socket.enable();
	}

	async onDisable() {
		await this.socket.disable();
		await this.badges.disable();
	}
}

Moddex.register();
