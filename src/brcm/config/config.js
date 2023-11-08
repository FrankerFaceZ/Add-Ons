import {capitalize, range} from '../utils.js';

export class ConfigPath {
	/**
	 * @type {string[]}
	 */
	#segmentList = [];

	/**
	 * @param {string} pathSegment
	 * @param {number} [sort]
	 * @param {string} [description]
	 * @returns {ConfigPath}
	 */
	addSegment(pathSegment, sort, description) {
		const ops = {};
		if (sort) ops.sort = sort;
		if (description) ops.description = description;

		this.#segmentList.push(`${pathSegment}@${JSON.stringify(ops)}`);
		return this;
	}

	/**
	 * @returns {ConfigPath}
	 */
	copy() {
		const copy = new ConfigPath();
		this.#segmentList.forEach(segment => copy.#segmentList.push(segment));
		return copy;
	}

	/**
	 * @returns {string}
	 */
	toString() {
		const starter = 'Add-Ons > BRCM';
		switch (this.#segmentList.length) {
			case 0:
				return starter.replace('>', '>>');
			case 1:
				return `${starter} >> ${this.#segmentList[0]}`;
			case 2:
				return `${starter} > ${this.#segmentList[0]} >> ${this.#segmentList[1]}`;
			default: {
				const end = this.#segmentList.pop();
				return `${starter} > ${this.#segmentList.join(' > ')} >> ${end}`;
			}
		}
	}
}

export class Config {
	/**
	 * @typedef {object} ConfigObject
	 * @template {*} T
	 * @property {T} default
	 * @property {object} ui
	 * @property {function(): void} [changed]
	 * @property {function(*, *): any} [process]
	 * @property {T} [ui.default]
	 * @property {{value: T, title: string}[]} [ui.data]
	 * @property {string} ui.path
	 * @property {string} ui.title
	 * @property {string} [ui.description]
	 * @property {number} [ui.sort]
	 * @property {('setting-check-box'|'setting-select-box'|'setting-color-box'|'setting-text-box')} [ui.component]
	 * @property {function(T): *} [ui.process]
	 */

	/**
	 * @type {ConfigObject}
	 */
	config;

	/**
	 * @type {string}
	 */
	key;

	/**
	 * @param {string} key
	 * @param {ConfigPath} [path]
	 * @param {string} [title]
	 * @param {string} [description]
	 */
	constructor(key, path = new ConfigPath(), title, description) {
		this.key    = key;
		this.config = {
			ui: {
				path : path.toString(),
				title: title || capitalize(key)
			}
		};

		if (description) this.config.ui.description = description;
	}

	/**
	 * @param {string} title
	 * @returns {Config}
	 */
	setTitle(title) {
		this.title = title;
		return this;
	}

	/**
	 * @param {string} description
	 * @returns {Config}
	 */
	setDescription(description) {
		this.config.ui.description = description;
		return this;
	}

	/**
	 * @param {function(): void} func
	 * @returns {Config}
	 */
	setOnChangeEvent(func) {
		this.config.changed = func;
		return this;
	}

	/**
	 * @param {number} sort
	 * @returns {Config}
	 */
	setSort(sort) {
		this.config.ui.sort = sort;
		return this;
	}

	/**
	 * @param {ConfigPath|string} path
	 * @returns {Config}
	 */
	setPath(path) {
		//Wrap in template string to call toString()
		this.config.ui.path = `${path}`;
		return this;
	}

	/**
	 * @param {function(*, *): *} process
	 * @returns {Config}
	 */
	setProcess(process) {
		this.config.process = process;
		return this;
	}

	/**
	 * @template {*} T
	 * @param {function(T): T} process
	 * @returns {Config}
	 */
	setUIProcess(process) {
		this.config.ui.process = process;
		return this;
	}
}

export class BooleanConfig extends Config {
	/**
	 * @param {string} key
	 * @param {boolean} defaultValue
	 * @param {ConfigPath} [path]
	 * @param {string} [title]
	 * @param {string} [description]
	 */
	constructor(key, defaultValue, path, title, description) {
		super(key, path, title, description);
		this.config.default      = defaultValue;
		this.config.ui.component = 'setting-check-box';
	}
}

export class ColorConfig extends Config {
	/**
	 * @param {string} key
	 * @param {string} defaultValue
	 * @param {ConfigPath} [path]
	 * @param {string} [title]
	 * @param {string} [description]
	 */
	constructor(key, defaultValue, path, title, description) {
		super(key, path, title, description);
		this.config.default      = defaultValue;
		this.config.ui.component = 'setting-color-box';
	}
}

export class SelectBoxConfig extends Config {
	/**
	 * @template {*} T
	 * @param {string} key
	 * @param {T} defaultValue
	 * @param {{value: T, title: string}[]} data
	 * @param {ConfigPath} [path]
	 * @param {string} [title]
	 * @param {string} [description]
	 */
	constructor(key, defaultValue, data, path, title, description) {
		super(key, path, title, description);
		this.config.default      = defaultValue;
		this.config.ui.data      = data;
		this.config.ui.component = 'setting-select-box';
	}
}

export class IntSelectBoxConfig extends Config {
	/**
	 * @param {string} key
	 * @param {function(number): string} formatFunc
	 * @param {number} defaultValue
	 * @param {number} min
	 * @param {number} max
	 * @param {number} [step]
	 * @param {ConfigPath} [path]
	 * @param {string} [title]
	 * @param {string} [description]
	 */
	constructor(key, formatFunc, defaultValue, min, max, step = 1, path, title, description) {
		super(key, path, title, description);
		this.config.default      = defaultValue;
		this.config.ui.data      = range(min, max, step).map(n => ({value: n, title: formatFunc(n)}));
		this.config.ui.component = 'setting-select-box';
	}
}

export class TextBoxConfig extends Config {
	/**
	 * @param {string} key
	 * @param {string} defaultValue
	 * @param {ConfigPath} [path]
	 * @param {function(string): *} [valueProcess]
	 * @param {function(*, *): *} [process]
	 * @param {string} [title]
	 * @param {string} [description]
	 */
	constructor(key, defaultValue, path, valueProcess, process, title, description) {
		super(key, path, title, description);
		this.config.default      = defaultValue;
		this.config.ui.component = 'setting-text-box';
		if (process) this.config.process = process;
		if (valueProcess) this.config.ui.process = valueProcess;
	}
}

export class IntTextBoxConfig extends Config {
	/**
	 * @param {string} key
	 * @param {number} defaultValue
	 * @param {number} min
	 * @param {number} max
	 * @param {ConfigPath} [path]
	 * @param {string} [title]
	 * @param {string} [description]
	 */
	constructor(key, defaultValue, min, max, path, title, description) {
		super(key, path, title, description);
		this.config.default      = defaultValue;
		this.config.ui.process   = val => {
			val = parseInt(val, 10);
			if (!max) max = Number.MAX_SAFE_INTEGER;
			if (!min) min = Number.MIN_SAFE_INTEGER;
			return isNaN(val) || !isFinite(val) ? defaultValue : val > max ? max : val < min ? min : val;
		};
		this.config.ui.component = 'setting-text-box';
	}
}
