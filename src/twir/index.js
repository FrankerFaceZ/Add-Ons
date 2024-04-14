import { Api } from './api.js';
import { Commands } from './commands.js';
import { Badges } from './badges.js';
import { Settings } from './settings.js';

class Twir extends Addon {
	constructor(...args) {
		super(...args);

		this.inject(Api);
		this.inject(Commands);
		this.inject(Badges);
		this.inject(Settings);
	}
}

Twir.register();
