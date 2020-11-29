import {BooleanConfig, Config}                 from './config/config.js';
import * as MenuConfig                         from './config/menu_config.js';
import {ChatModule}                            from './module/chat_module.js';
import {RightClickModule}                      from './module/module.js';
import {VideoPlayerModule}                     from './module/video_player_module.js';
import {FirefoxDarkPreset, FirefoxLightPreset} from './preset/firefox_preset.js';
import {Preset}                                from './preset/preset.js';
import {TwitchDefaultPreset, TwitchFZZPreset}  from './preset/twitch_preset.js';
import {getConfigKey, getMousePos}             from './utils.js';

// noinspection JSUnresolvedVariable
const {createElement} = FrankerFaceZ.utilities.dom;

// noinspection JSUnusedGlobalSymbols,JSUnresolvedVariable,JSUnresolvedFunction,SpellCheckingInspection
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
				path     : `${MenuConfig.pathCSS}`,
				sort     : 999999,
				title    : 'Preset',
				data     : this.menuPresets.map(preset => ({value: preset.key, title: preset.name})),
				component: () => import('./components/preset-combobox.vue'),
				getPreset: value => this.menuPresets[value],
				onChange : () => this.reloadElements()
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
			this.settings.add(getConfigKey(module.key, 'enabled'), new BooleanConfig('enabled', true, module.path.copy().addSegment(`Main ${module.name} Toggle`, -100).toString()).setOnChangeEvent(() => this.reloadElements()).config);
			for (const config of module.configs) {
				this.settings.add(getConfigKey(module.key, config.key), config.setSort(configSort++).setOnChangeEvent(() => this.reloadElements()).config);
			}
			
			for (const submodule of module.modules) {
				const props = {
					default: true,
					ui     : {
						sort     : moduleSort++,
						path     : `${submodule.path}`,
						title    : (submodule.requiresMod ? '(Moderator) ' : '') + submodule.title,
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
		
		document.body.appendChild(this.containerElement = createElement('div', {id: 'brcm-main-container'}));
		document.head.appendChild(this.staticStyleElement = createElement('style', null, this.getStaticCSS()));
		this.reloadElements();
		document.addEventListener('contextmenu', event => this.onRightClick(event));
		document.addEventListener('click', event => this.onLeftClick(event));
		
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
	
	//<editor-fold desc="Mouse Events">
	/**
	 * @param {MouseEvent} event
	 * @returns {void}
	 */
	onRightClick(event) {
		for (const child of this.containerElement.children) {
			if (child === event.target.parentElement) {
				this.onLeftClick(event);
				event.preventDefault();
				return;
			}
		}
		
		for (const child of this.containerElement.children) {
			if (child.className === 'show') {
				child.className = 'hide';
				event.preventDefault();
				return;
			}
		}
		
		for (const module of this.modules) {
			if (this.settings.get(getConfigKey(module.key, 'enabled')) && module.checkElement(event.target)) {
				const menuElement = document.getElementById(`brcm-${module.key}-menu`);
				if (module.onClickElement(event, menuElement)) continue;
				event.preventDefault();
				
				const mousePos         = getMousePos(event);
				menuElement.className  = 'show';
				menuElement.style.top  = `${mousePos.y - (window.innerHeight - event.pageY > menuElement.offsetHeight ? 0 : menuElement.offsetHeight)}px`;
				menuElement.style.left = `${mousePos.x - (window.innerWidth - event.pageX > menuElement.offsetWidth ? 0 : menuElement.offsetWidth)}px`;
				break;
			}
		}
	}
	
	/**
	 * @param {MouseEvent} event
	 * @returns {void}
	 */
	onLeftClick(event) {
		for (const child of this.containerElement.children) {
			if (child.className === 'show') {
				child.className = 'hide';
			}
			
			if (event.target.parentElement === child && child.id.split('-').length === 3) {
				const moduleKey       = child.id.split('-')[1];
				const modulesFiltered = this.modules.filter(module => module.key === moduleKey);
				
				if (modulesFiltered.length === 1) {
					const module            = modulesFiltered[0];
					const submoduleFiltered = module.modules.filter(submodule => submodule.key === event.target.className);
					
					if (submoduleFiltered.length === 1) {
						const submodule = submoduleFiltered[0];
						
						if ((submodule.requiresMod ? this.isMod() : true))
							submodule.onClick(this);
					}
				}
			}
		}
	}
	
	//</editor-fold>
	
	//<editor-fold desc="Document manipulation (Need a better name)">
	/**
	 * @returns {void}
	 */
	reloadElements() {
		console.log('reloading');
		
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
		document.body.appendChild(this.containerElement = createElement('div', {id: 'brcm-main-container'}));
		
		this.modules.forEach(module => {
			const moduleElement = createElement('ul', {id: `brcm-${module.key}-menu`, className: 'hide'});
			
			if (this.getMenuSetting(MenuConfig.config_displayHeader) && module.supportsHeader) {
				moduleElement.appendChild(createElement('li', {className: 'header'}));
				
				if (this.getMenuSetting(MenuConfig.config_displayHeaderSeparators))
					moduleElement.appendChild(createElement('li', {className: 'separator-header'}));
			}
			
			module.modules.filter(submodule => this.settings.get(getConfigKey(module.key, submodule.key)) && (submodule.requiresMod ? this.isMod() : true))
				.forEach(submodule => {
					if (this.getMenuSetting(MenuConfig.config_displayMenuItemSeparators) && moduleElement.childElementCount > 0
						&& (moduleElement.lastElementChild ? !moduleElement.lastElementChild.className.includes('separator') : true)) moduleElement.appendChild(createElement('li', {className: 'separator-menu-item'}));
					moduleElement.appendChild(createElement('li', {className: submodule.key}, submodule.title));
				});
			
			this.containerElement.appendChild(moduleElement);
		});
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
		return this.getMenuSetting('css_enabled') ? (this.getMenuSetting('css') ? this.getMenuSetting('css') : this._getCSS()) : this._getCSS();
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
	z-index:            ${Number.MAX_SAFE_INTEGER};
}

#brcm-main-container .hide {
	display:            none;
}

#brcm-main-container .show li {
	list-style-type:    none;
}

#brcm-main-container .show li:not(.separator-menu-item):not(.separator-header):not(.header):hover {
	background-color: var(--color-background-accent);
	cursor:           default;
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
	 * @returns {boolean}
	 */
	isMod() {
		return this.chat.ChatContainer.first.props.isCurrentUserModerator;
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
		
		this.resolve('chat').getUser(523772148, 'l3afme').addBadge('add_ons.brcm', 'add_ons.brcm--badge-developer');
	}
	
	//</editor-fold>
}

BetterRightClickMenuAddon.register();
