import {Config, ConfigPath}                from '../config/config.js';
import * as MenuConfig                     from '../config/menu_config.js';
import {BetterRightClickMenuAddon}         from '../index.js';
import {capitalize, getConfigKey, titlize} from '../utils.js';

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
	title;
	
	/**
	 * @type {string}
	 */
	description;
	
	/**
	 * @type {boolean}
	 */
	supportsHeader = false;
	
	/**
	 * @type {string[]}
	 */
	injects = [];
	
	/**
	 * @type {(RightClickSubmodule)[]}
	 */
	modules = [];
	
	/**
	 * @type {Config[]}
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
	 * @param {BetterRightClickMenuAddon} brcm
	 * @param {string} key Unique key associated with the module
	 * @param {string} [title]
	 */
	constructor(brcm, key, title) {
		this.brcm  = brcm;
		this.key   = key;
		this.title = title || titlize(this.key);
		this.path  = new ConfigPath().addSegment(this.title);
	}
	
	/**
	 * @returns {this}
	 */
	setRequiresVIP() {
		this.requiresVIP = true;
		return this;
	}
	
	/**
	 * @returns {this}
	 */
	setRequiresMod() {
		this.requiresMod = true;
		return this;
	}
	
	/**
	 * @returns {this}
	 */
	setRequiresBroadcaster() {
		this.requiresBroadcaster = true;
		return this;
	}
	
	/**
	 * @param {string} title
	 * @returns {this}
	 */
	setTitle(title) {
		this.title = title;
		return this;
	}
	
	/**
	 * @param {string} description
	 * @returns {this}
	 */
	setDescription(description) {
		this.description = description;
		return this;
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
	
	/**
	 * @param {RightClickSubmodule|string} module
	 * @param {ConfigPath} [path]
	 * @param {function(): void} [clickFunc]
	 * @returns {RightClickSubmodule}
	 */
	addSubmodule(module, path, clickFunc) {
		if (module instanceof RightClickSubmodule) {
			this.modules.push(module);
			return module;
		}
		
		const submodule = new RightClickSubmodule(module, path, clickFunc);
		this.modules.push(submodule);
		return submodule;
	}
	
	/**
	 * @param {Config} config
	 */
	addConfig(config) {
		this.configs.push(config);
		return config;
	}
}

export class RightClickSubmodule extends RightClickModule {
	/**
	 * @type {ConfigPath}
	 */
	path;
	
	/**
	 * @type {function(): void}
	 */
	clickFunc;
	
	/**
	 * @param {string} key
	 * @param {ConfigPath} path
	 * @param {function(): void} [clickFunc]
	 */
	constructor(key, path, clickFunc) {
		super(null, key, capitalize(key));
		
		this.path      = path;
		this.clickFunc = clickFunc;
	}
	
	onClick() {
		if (this.clickFunc && typeof this.clickFunc === 'function')
			this.clickFunc();
	}
}

export class ModuleSeparator extends RightClickSubmodule {
	constructor() {
		// noinspection JSCheckFunctionSignatures
		super('separator');
	}
}
