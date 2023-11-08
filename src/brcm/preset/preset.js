export class Preset {
	/**
	 * @type {string}
	 */
	key;

	/**
	 * @type {string}
	 */
	name;

	/**
	 * @type {string}
	 */
	css;

	/**
	 * @param {string} key
	 * @param {string} name
	 * @param {string} css
	 */
	constructor(key, name, css) {
		this.key  = key;
		this.name = name;
		this.css  = css.trim();
	}
}
