import { Api } from './api.js';
import { Badges } from './badges.js';
import { Chromas } from './chromas.js';
import { Filters } from './filters.js';
import { Settings } from './settings.js';

class Starlit extends Addon {
	constructor(...args) {
		super(...args);

		this.injectAs('starlit_api', Api);
		this.injectAs('starlit_badges', Badges);
		this.injectAs('starlit_chromas', Chromas);
		this.injectAs('starlit_filters', Filters);
		this.injectAs('starlit_settings', Settings);
	}
}

Starlit.register();
