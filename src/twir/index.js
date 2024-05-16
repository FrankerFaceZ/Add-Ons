import { Api } from './api.js';
import { Commands } from './commands.js';
import { Badges } from './badges.js';
import { Settings } from './settings.js';

class Twir extends Addon {
	constructor(...args) {
		super(...args);

		this.injectAs('twir_api', Api);
		this.injectAs('twir_commands', Commands);
		this.injectAs('twir_badges', Badges);
		this.injectAs('twir_settings', Settings);
	}
}

Twir.register();
