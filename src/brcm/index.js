import {BooleanConfig, Config}                 from './config/config.js';
import * as MenuConfig                         from './config/menu_config.js';
import {ChatModule}                            from './module/chat_module.js';
import {ModuleSeparator, RightClickModule}     from './module/module.js';
import {VideoPlayerModule}                     from './module/video_player_module.js';
import {FirefoxDarkPreset, FirefoxLightPreset} from './preset/firefox_preset.js';
import {Preset}                                from './preset/preset.js';
import {TwitchDefaultPreset, TwitchFZZPreset}  from './preset/twitch_preset.js';
import {getConfigKey, getMousePos}             from './utils.js';

// noinspection JSUnresolvedVariable
/**
 * @type {(function(tagName: string): HTMLElement) |
 * (function(tagName: string, options: ElementCreationOptions): HTMLElement) |
 * (function(tagName: string, options: ElementCreationOptions, innerText: string): HTMLElement)}
 */
const createElement = FrankerFaceZ.utilities.dom.createElement;

export class BetterRightClickMenuAddon extends Addon {
	/**
	 * All modules in this array will be automatically
	 * loaded when the addon is loaded. Modules are
	 * required to extend {@link RightClickModule} and
	 * implement both {@link RightClickModule#onClickElement}
	 * and {@link RightClickModule#checkElement}. This
	 * file requires no other modifications to add a module,
	 * the same applies to presets below.
	 *
	 * @type {RightClickModule[]}
	 */
	modules = [
		new ChatModule(this),
		new VideoPlayerModule(this)
	];
	
	/**
	 * @type {Preset[]}
	 */
	menuPresets = [
		new Preset('empty', 'Custom', ''),
		new TwitchDefaultPreset(),
		new TwitchFZZPreset(),
		new FirefoxDarkPreset(),
		new FirefoxLightPreset()
	];
	
	/**
	 * @type {HTMLElement}
	 */
	customStyleElement;
	
	/**
	 * @type {HTMLElement}
	 */
	staticStyleElement;
	
	/**
	 * @type {HTMLElement}
	 */
	containerElement;
	
	constructor(...args) {
		super(...args);
		
		this.log.info('Constructing BRCM');
		
		const injects = ['chat.actions', 'chat.badges', 'site.chat', 'site.twitch_data'];
		this.modules.forEach(module => module.injects.forEach(inject => injects.push(inject)));
		[...new Set(injects)].forEach(inject => this.inject(inject));
		
		this.loadMenuSettings();
		this.loadModuleSettings();
		this.loadDevBadge();
		
		this.log.info('Successfully constructed BRCM');
	}
	
	//<editor-fold desc="Load Settings">
	/**
	 * @returns {void}
	 */
	loadMenuSettings() {
		let menuSort = 0;
		for (const configKey in MenuConfig) {
			if (!(MenuConfig[configKey] instanceof Config)) continue;
			this.settings.add(getConfigKey('menu', MenuConfig[configKey].key), MenuConfig[configKey].setSort(menuSort++).setOnChangeEvent(() => this.reloadElements()).config);
		}
		
		this.settings.addUI(getConfigKey('menu', 'css'), {
			ui: {
				path       : `${MenuConfig.pathCSS}`,
				sort       : 999999,
				title      : 'Preset',
				description: 'Presets require Custom CSS to be enabled. Twitch (FFZ) preset uses variables provided by FFZ to mimic the custom style set by yourself.',
				data       : this.menuPresets.map(preset => ({value: preset.key, title: preset.name})),
				component  : () => import('./components/preset-combobox.vue'),
				getPreset  : value => this.menuPresets[value],
				onChange   : () => this.reloadElements()
			}
		});
		
		this.settings.add(getConfigKey('menu', 'css'), {
			default: this.menuPresets[0].css,
			ui     : {
				path     : `${MenuConfig.pathCSS}`,
				sort     : Number.MAX_SAFE_INTEGER,
				value    : this.getCSS(),
				component: () => import('./components/setting-css-text-area.vue'),
				isValid  : value => this._getCSS() !== value,
				changed  : () => {
					this.setCSS();
					this.setHTML();
				}
			}
		});
	}
	
	/**
	 * @returns {void}
	 */
	loadModuleSettings() {
		let moduleSort = 0;
		let configSort = 0;
		for (const module of this.modules) {
			this.settings.add(getConfigKey(module.key, 'enabled'), new BooleanConfig('enabled', true, module.path.copy().addSegment(`Main ${module.title} Toggle`, -100).toString()).setOnChangeEvent(() => this.reloadElements()).config);
			for (const config of module.configs) {
				this.settings.add(getConfigKey(module.key, config.key), config.setSort(configSort++).setOnChangeEvent(() => this.reloadElements()).config);
			}
			
			for (const submodule of module.modules) {
				if (submodule instanceof ModuleSeparator || submodule.path === null) continue;
				
				const props = {
					default: true,
					ui     : {
						sort     : moduleSort++,
						path     : `${submodule.path}`,
						title    : (module.displayConfigRequirements ? (submodule.requiresMod ? '(Moderator) ' : submodule.requiresBroadcaster ? '(Broadcaster) ' : '') : '') + submodule.title,
						component: 'setting-check-box'
					},
					changed: () => this.reloadElements()
				};
				if (submodule.description) props.ui.description = submodule.description;
				this.settings.add(getConfigKey(module.key, submodule.key), props);
			}
		}
	}
	
	//</editor-fold>
	//<editor-fold desc="FFZ Events">
	/**
	 * @returns {void}
	 */
	onEnable() {
		this.log.info('Setting up BRCM');
		
		document.body.appendChild(this.containerElement = createElement('div', {
			id       : 'brcm-main-container',
			className: 'chat-shell'
		}));
		document.head.appendChild(this.staticStyleElement = createElement('style', null, this.getStaticCSS()));
		this.reloadElements();
		document.addEventListener('contextmenu', event => this.onRightClick(event));
		document.addEventListener('click', event => this.onLeftClick(event));
		this.setupURLChangeEvent();
		window.addEventListener('locationchange', _ => this.reloadElements());
		
		
		this.log.info('Successfully setup BRCM');
	}
	
	/**
	 * @returns {void}
	 */
	onDisable() {
		this.log.info('Disabling BRCM');
		
		document.removeEventListener('contextmenu', event => this.onRightClick(event));
		document.removeEventListener('click', event => this.onLeftClick(event));
		
		if (this.containerElement) {
			this.containerElement.remove();
			this.containerElement = null;
		}
		if (this.customStyleElement) {
			this.customStyleElement.remove();
			this.customStyleElement = null;
		}
		if (this.staticStyleElement) {
			this.staticStyleElement.remove();
			this.staticStyleElement = null;
		}
		
		this.log.info('Successfully disabled BRCM');
	}
	
	//</editor-fold>
	//<editor-fold desc="Document Events">
	setupURLChangeEvent() {
		history.pushState = (f => function pushState() {
			const ret = f.apply(this, arguments);
			window.dispatchEvent(new Event('pushstate'));
			window.dispatchEvent(new Event('locationchange'));
			return ret;
		})(history.pushState);
		
		history.replaceState = (f => function replaceState() {
			const ret = f.apply(this, arguments);
			window.dispatchEvent(new Event('replacestate'));
			window.dispatchEvent(new Event('locationchange'));
			return ret;
		})(history.replaceState);
		
		window.addEventListener('popstate', () => {
			window.dispatchEvent(new Event('locationchange'));
		});
	}
	
	/**
	 * @param {MouseEvent} event
	 * @returns {void}
	 */
	onRightClick(event) {
		if (event.shiftKey)
			return;
		
		for (const moduleKey of this.modules.map(module => module.key)) {
			if (event.target.id && event.target.id.startsWith(`brcm-${moduleKey}-`)) {
				this.onLeftClick(event);
				event.preventDefault();
				return;
			}
		}
		
		for (const child of this.containerElement.children) {
			if (child.classList.contains('show')) {
				child.classList.remove('show');
				if (!child.classList.contains('hide'))
					child.classList.add('hide');
				event.preventDefault();
				return;
			}
		}
		
		for (const module of this.modules) {
			if (this.settings.get(getConfigKey(module.key, 'enabled')) && module.checkElement(event.target)) {
				const menuElement = document.getElementById(`brcm-${module.key}-menu`);
				if (module.onClickElement(event, menuElement)) continue;
				event.preventDefault();
				
				const mousePos = getMousePos(event);
				if (menuElement.classList.contains('hide'))
					menuElement.classList.remove('hide');
				menuElement.classList.add('show');
				
				menuElement.style.top  = `${mousePos.y - (mousePos.y + menuElement.offsetHeight > window.innerHeight ? menuElement.offsetHeight + mousePos.y - window.innerHeight : 0)}px`;
				menuElement.style.left = `${mousePos.x - (mousePos.x + menuElement.offsetWidth > window.innerWidth ? menuElement.offsetWidth + mousePos.x - window.innerWidth : 0)}px`;
				
				// Hacky work around to hide the BetterTTV ban popup
				const bttvElement = document.getElementById('bttv-custom-timeout-contain');
				if (bttvElement) bttvElement.style.top = `${Number.MAX_SAFE_INTEGER}px`;
				
				break;
			}
		}
	}
	
	/**
	 * @param {MouseEvent} event
	 * @returns {void}
	 */
	onLeftClick(event) {
		if (event.shiftKey)
			return;
		
		for (const child of this.containerElement.children) {
			if (child.classList.contains('show'))
				child.classList.remove('show');
			
			if (!child.classList.contains('hide'))
				child.classList.add('hide');
		}
		
		try {
			let target = event.target.tagName === 'P' ? event.target.parentElement : event.target;
			if (!target.id.startsWith('brcm-')) return;
			
			const ids = target.id.split('-');
			ids.shift();
			
			let id     = ids.shift();
			let module = this.modules.filter(module => module.key === id)[0];
			while (ids.length !== 0) {
				id     = ids.shift();
				module = module.modules.filter(module => module.key === id)[0];
			}
			
			if ((module.requiresVIP ? this.isVIP() : true) &&
				(module.requiresMod ? this.isMod() : true) &&
				(module.requiresBroadcaster ? this.isBroadcaster() : true))
				module.onClick();
		} catch (e) {
			this.log.error(e);
		}
	}
	
	//</editor-fold>
	//<editor-fold desc="Document Manipulation (Need a better name)">
	/**
	 * @returns {void}
	 */
	reloadElements() {
		this.setCSS();
		this.setHTML();
		
		const textArea = document.getElementById('brcm-css-text-area');
		if (textArea && !this.getMenuSetting('css')) textArea.textContent = this.getCSS();
	}
	
	/**
	 * @returns {void}
	 */
	setHTML() {
		if (!this.containerElement) return;
		
		this.containerElement.remove();
		document.body.appendChild(this.containerElement = createElement('div', {
			id       : 'brcm-main-container',
			className: 'chat-shell'
		}));
		
		this.modules.map(module => this.createModuleElement(module))
			.forEach(element => this.containerElement.appendChild(element));
	}
	
	/**
	 * @param {RightClickModule} module
	 * @param {string[]} [parentKeys = ['brcm']]
	 * @returns {HTMLElement}
	 */
	createModuleElement(module, parentKeys = ['brcm']) {
		parentKeys = parentKeys.slice();
		parentKeys.push(module.key);
		
		const moduleElement = createElement('ul', {
			id       : `${parentKeys.join('-')}-menu`,
			className: 'hide'
		});
		
		if (this.getMenuSetting(MenuConfig.config_displayHeader) && module.supportsHeader) {
			moduleElement.appendChild(createElement('li', {className: 'header'}));
			
			if (this.getMenuSetting(MenuConfig.config_displayHeaderSeparators))
				moduleElement.appendChild(createElement('li', {className: 'separator-header'}));
		}
		
		
		const filteredList = module.modules
			.filter(submodule => submodule.requiresVIP ? this.isVIP() : true)
			.filter(submodule => submodule.requiresMod ? this.isMod() : true)
			.filter(submodule => submodule.requiresBroadcaster ? this.isBroadcaster() : true);
		
		for (const submodule of filteredList) {
			if (submodule instanceof ModuleSeparator) {
				if (this.getMenuSetting(MenuConfig.config_displayMenuItemSeparators))
					moduleElement.appendChild(createElement('li', {className: 'separator-menu-item'}));
				continue;
			}
			
			if (parentKeys.length === 2 ? this.settings.get(getConfigKey(module.key, submodule.key)) : true) {
				const submoduleElement = createElement('li', {id: `${parentKeys.join('-')}-${submodule.key}`});
				submoduleElement.appendChild(createElement('p', {}, (module.displayMenuRequirements ? (submodule.requiresVIP ? '(VIP) ' : submodule.requiresMod ? '(Mod) ' : submodule.requiresBroadcaster ? '(Streamer) ' : '') : '') + submodule.title));
				
				if (submodule.modules.length > 0) {
					const chevronElement      = createElement('p', {className: 'chevron'}, ' >');
					chevronElement.style.top  = `${submoduleElement.offsetTop}px`;
					chevronElement.style.left = `${submoduleElement.offsetLeft + submoduleElement.offsetWidth - chevronElement.offsetWidth - 10}px`;
					submoduleElement.appendChild(chevronElement);
					
					const childElement = this.createModuleElement(submodule, parentKeys);
					submoduleElement.addEventListener('mouseover', () => {
						if (childElement.classList.contains('hide'))
							childElement.classList.remove('hide');
						if (!childElement.classList.contains('show'))
							childElement.classList.add('show');
						
						const pos               = submoduleElement.getBoundingClientRect();
						childElement.style.top  = `${submoduleElement.offsetTop - (pos.top + childElement.offsetHeight > window.innerHeight ? pos.top + childElement.offsetHeight - window.innerHeight : 0)}px`;
						childElement.style.left = `${submoduleElement.offsetLeft + (pos.left + submoduleElement.offsetWidth + childElement.offsetWidth > window.innerWidth ? -childElement.offsetWidth : submoduleElement.offsetWidth)}px`;
					});
					
					submoduleElement.addEventListener('mouseleave', () => {
						if (!childElement.classList.contains('hide'))
							childElement.classList.add('hide');
						if (childElement.classList.contains('show'))
							childElement.classList.remove('show');
					});
					
					submoduleElement.appendChild(childElement);
				}
				
				moduleElement.appendChild(submoduleElement);
			}
		}
		
		return moduleElement;
	}
	
	/**
	 * @returns {void}
	 */
	setCSS() {
		const css = this.getCSS();
		if (this.customStyleElement) {
			this.customStyleElement.textContent = css;
		} else {
			document.head.appendChild(this.customStyleElement = createElement('style', null, css));
		}
	}
	
	/**
	 * @returns {string}
	 */
	getCSS() {
		return this.getMenuSetting(MenuConfig.css_enabled) ? (this.getMenuSetting('css') ? this.getMenuSetting('css') : this._getCSS()) : this._getCSS();
	}
	
	/**
	 * @returns {string}
	 */
	_getCSS() {
		return `#brcm-main-container .show {
	background-color: ${this.getMenuSetting(MenuConfig.color_background)};
	border:           ${this.getMenuSetting(MenuConfig.config_borderWidth)} solid ${this.getMenuSetting(MenuConfig.color_border)};
	border-radius:    ${this.getMenuSetting(MenuConfig.config_borderRadius)};
	color:            ${this.getMenuSetting(MenuConfig.color_text)};
	box-shadow:       0 0 3px rgb(0,0,0);
	min-width:        ${this.getMenuSetting(MenuConfig.config_menuWidth)};
}

#brcm-main-container .show li.separator-header {
	background-color: ${this.getMenuSetting(MenuConfig.color_header_separators)};
	height:           1px;
}

#brcm-main-container .show li.separator-menu-item {
	background-color: ${this.getMenuSetting(MenuConfig.color_menu_item_separators)};
	height:           1px;
}

#brcm-main-container .show li.header {
	background-color: ${this.getMenuSetting(MenuConfig.color_header_background)};
	font-size:        ${this.getMenuSetting(MenuConfig.config_headerTextSize)};
	padding-top:      2px;
	padding-bottom:   2px;
	padding-left:     6px;
	padding-right:    6px;
}

#brcm-main-container .show li:not(.separator-menu-item):not(.separator-header):not(.header) {
	background-color: ${this.getMenuSetting(MenuConfig.color_menu_item_background)};
	font-size:        ${this.getMenuSetting(MenuConfig.config_menuItemTextSize)};
	padding-top:      4px;
	padding-bottom:   4px;
	padding-left:     6px;
	padding-right:    6px;
}

#brcm-main-container .show li:not(.separator-menu-item):not(.separator-header):not(.header):hover {
	background-color: ${this.getMenuSetting(MenuConfig.color_highlight)};
}`;
	}
	
	getStaticCSS() {
		return `#brcm-css-text-area {
	font-family:        "Roboto Mono";
}

#brcm-main-container .show {
	display:            block;
	position:           absolute;
	cursor:             default;
	z-index:            ${Number.MAX_SAFE_INTEGER};
}

#brcm-main-container .hide {
	display:            none;
}

#brcm-main-container .show li {
	list-style-type:    none;
	display:            flex;
	flex-grow:          1;
}

#brcm-main-container .show li p.chevron {
	margin-left:        auto;
}`;
	}
	
	//</editor-fold>
	//<editor-fold desc="Util Methods">
	/**
	 * @param {string} message
	 * @returns {void}
	 */
	sendMessage(message) {
		this.chat.ChatService.first.sendMessage(message);
	}
	
	/**
	 * @param {boolean} [explicit = false]
	 * @returns {boolean}
	 */
	isVIP(explicit = false) {
		return (explicit ? false : this.isMod()) || this.chat.ChatContainer.first.props.commandPermissionLevel === 1;
	}
	
	/**
	 * @param {boolean} [explicit = false]
	 * @returns {boolean}
	 */
	isMod(explicit) {
		return (explicit ? false : this.isBroadcaster()) || this.chat.ChatContainer.first.props.commandPermissionLevel === 2;
	}
	
	/**
	 * @returns {boolean}
	 */
	isBroadcaster() {
		return this.chat.ChatContainer.first.props.commandPermissionLevel === 3;
	}
	
	/**
	 * @param {Config||string} config
	 * @returns {*}
	 */
	getMenuSetting(config) {
		return this.settings.get(getConfigKey('menu', config.key || config));
	}
	
	/**
	 * @returns {void}
	 */
	loadDevBadge() {
		this.badges.loadBadgeData('add_ons.brcm--badge-developer', {
			id   : 'brcm_developer',
			title: 'BRCM Developer',
			slot : 7,
			color: '#71D400',
			image: 'https://i.imgur.com/OFA5S7d.png',
			urls : {
				1: 'https://i.imgur.com/OFA5S7d.png',
				2: 'https://i.imgur.com/bkIP2Sq.png',
				4: 'https://i.imgur.com/rrD2aTS.png'
			}
		});
		
		this.resolve('chat').getUser(523772148).addBadge('add_ons.brcm', 'add_ons.brcm--badge-developer');
	}
	
	/**
	 * @returns {Object}
	 */
	getMe() {
		return this.resolve('site').getUser();
	}
	
	//</editor-fold>
}

BetterRightClickMenuAddon.register();
