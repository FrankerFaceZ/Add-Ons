import {BooleanConfig, ColorConfig, Config, ConfigPath, IntSelectBoxConfig, SelectBoxConfig} from '../config/config.js';
import {BetterRightClickMenuAddon}                                                           from '../index.js';
import {capitalize, titlize}                                                                 from '../utils.js';

export class RightClickSubModule {
	/**
	 * @type {string}
	 */
	key;

	/**
	 * @type {ConfigPath}
	 */
	path;

	/**
	 * @type {string}
	 */
	title;

	/**
	 * @type {string}
	 */
	description;

	/**
	 * @type {function(BetterRightClickMenuAddon): void}
	 */
	clickFunc;

	/**
	 * @type {boolean}
	 */
	requiresVIP = false;

	/**
	 * @type {boolean}
	 */
	requiresMod = false;

	/**
	 * @type {boolean}
	 */
	requiresBroadcaster = false;

	/**
	 * @param {string} key
	 * @param {ConfigPath} path
	 * @param {function(BetterRightClickMenuAddon): void} clickFunc
	 */
	constructor(key, path, clickFunc) {
		this.key       = key;
		this.path      = path;
		this.clickFunc = clickFunc;
		this.title     = capitalize(key);
	}

	/**
	 * @returns {RightClickSubModule}
	 */
	setRequiresVIP() {
		this.requiresVIP = true;
		return this;
	}

	/**
	 * @returns {RightClickSubModule}
	 */
	setRequiresMod() {
		this.requiresMod = true;
		return this;
	}

	/**
	 * @returns {RightClickSubModule}
	 */
	setRequiresBroadcaster() {
		this.requiresBroadcaster = true;
		return this;
	}

	/**
	 * @param {string} title
	 * @returns {RightClickSubModule}
	 */
	setTitle(title) {
		this.title = title;
		return this;
	}

	/**
	 * @param {string} description
	 * @returns {RightClickSubModule}
	 */
	setDescription(description) {
		this.description = description;
		return this;
	}

	/**
	 * @param {BetterRightClickMenuAddon} brcm
	 * @returns {void}
	 */
	onClick(brcm) {
		this.clickFunc(brcm);
	}
}

export class RightClickModule {
	/**
	 * @type {BetterRightClickMenuAddon} brcm
	 */
	brcm;

	/**
	 * @type {string}
	 */
	key;

	/**
	 * @type {string}
	 */
	name;

	/**
	 * @type {ConfigPath}
	 */
	path;

	/**
	 * @type {boolean}
	 */
	supportsHeader = false;

	/**
	 * @type {string[]}
	 */
	injects = [];

	/**
	 * @type {RightClickSubModule[]}
	 */
	modules = [];

	/**
	 * @type {(Config|BooleanConfig|ColorConfig|ConfigPath|IntSelectBoxConfig|SelectBoxConfig)[]}
	 */
	configs = [];

	/**
	 * @type {boolean}
	 */
	displayConfigRequirements = true;

	/**
	 * @type {boolean}
	 */
	displayMenuRequirements = true;

	/**
	 * @param {BetterRightClickMenuAddon} brcm
	 * @param {string} key Unique key associated with the module
	 * @param {string} [name]
	 */
	constructor(brcm, key, name) {
		this.brcm = brcm;
		this.key  = key;
		this.name = name || titlize(this.key);
	}

	/**
	 * Checks whether the element is a valid element to show the menu when right clicking it
	 * @param {EventTarget} element
	 * @returns {boolean}
	 */
	checkElement(element) {
		return false;
	}

	/**
	 * @param {MouseEvent} event
	 * @param {HTMLElement} menuElement
	 * @returns {boolean}
	 */
	onClickElement(event, menuElement) {
		return false;
	}
}
