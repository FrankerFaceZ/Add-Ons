import {getConfigKey, lang, menu} from './util/constants';
import * as modules               from './modules';
import * as Utils                 from './util/utils';

/*
// Shit to test IE

const getMousePos = (event) => {
	return {
		x: event.pageY ? event.pageY : event.clientY + (document.documentElement.scrollTop ?
			document.documentElement.scrollTop : document.body.scrollTop),
		y: event.pageX ? event.pageX : event.clientX + (document.documentElement.scrollLeft ?
			document.documentElement.scrollLeft : document.body.scrollLeft)
	};
};

document.attachEvent('oncontextmenu', event => {
	console.log(event.constructor.name);
	console.log(event.target.className);
	console.log(event.target.parentElement.className);
	console.log(getMousePos(event));
});
*/

const capitalize = str => str.split('_').map(word => word.charAt(0).toUpperCase() + word.substring(1).toLowerCase()).join(' ');
const lower      = str => str.replace('_', ' ').toLowerCase();

class ValueMissingError extends Error {
	constructor(missingValue) {
		super();
		this.missingValue = missingValue;
	}
}

class UnknownValueTypeError extends Error {
	constructor(value) {
		super();
		this.value = value;
	}
}

// Make IntelliJ stop complaining about stuff that works/is needed
// noinspection JSUnresolvedVariable, JSUnresolvedFunction, JSUnusedGlobalSymbols
class FFZBRC extends Addon {
	constructor(...args) {
		super(...args);
		
		this.inject('chat');
		
		for (const menuKey in menu) {
			if (!{}.hasOwnProperty.call(menu, menuKey)) continue;
			
			const menuLang = lang.menu[menuKey];
			
			for (const submenuKey in menu[menuKey]) {
				if (!{}.hasOwnProperty.call(menu[menuKey], submenuKey)) continue;
				
				const submenu = menu[menuKey][submenuKey];
				
				try {
					this.settings.add(submenu.key, this.loadMenuOps({
						default: submenu.default,
						ui     : {
							path       : `Add-Ons > FFZ: BRC >> ${this.i18n.t(menuLang.name.key, menuLang.name.default)}`,
							title      : this.i18n.t(menuLang.title.key, menuLang.title.default).replace('[key]', capitalize(submenuKey)),
							description: (menuLang.description ? this.i18n.t(menuLang.description.key,
								menuLang.description.default) : submenu.description).replace('[key]', lower(submenuKey))
						},
						changed: () => {
							this.reloadCSS();
							this.reloadHTML();
						}
					}, submenu));
				} catch (e) {
					if (e instanceof ValueMissingError) {
						this.log.info(this.i18n.t(lang.menu.config.missing_value.key, lang.menu.config.missing_value.default)
							.replace('[valueType]', 'list').replace('[module]', capitalize(submenuKey)));
					} else if (e instanceof UnknownValueTypeError) {
						this.log.info(this.i18n.t(lang.menu.config.unknown_type.key, lang.menu.config.unknown_type.default)
							.replace('[valueType]', e.value).replace('[module]', capitalize(submenuKey)));
					}
				}
			}
		}
		
		for (const moduleKey in modules) {
			if (!{}.hasOwnProperty.call(modules, moduleKey)) continue;
			
			const module  = modules[moduleKey];
			const moduleC = capitalize(moduleKey);
			
			this.settings.add(getConfigKey(moduleKey, 'enabled'), {
				default: true,
				ui     : {
					path       : `Add-Ons > FFZ: BRC > ${moduleC} >> ${this.i18n.t(lang.module.enabled.name.key,
						lang.module.enabled.name.default).replace('[module]', moduleC)}`,
					title      : this.i18n.t(lang.module.enabled.title.key, lang.module.enabled.title.default),
					description: `${this.i18n.t(lang.module.enabled.description.key,
						lang.module.enabled.description.default)
						.replace('[module]', lower(moduleKey))}\n`,
					component  : 'setting-check-box'
				},
				changed: () => {
					this.reloadCSS();
					this.reloadHTML();
				}
			});
			
			for (const submoduleKey in module.modules) {
				if (!{}.hasOwnProperty.call(module.modules, submoduleKey)) continue;
				
				const submodule  = module.modules[submoduleKey];
				const submoduleC = capitalize(submoduleKey);
				
				this.settings.add(getConfigKey(moduleKey, submoduleKey), {
					default: submodule.enabledByDefault !== undefined ? submodule.enabledByDefault : true,
					ui     : {
						path       : `Add-Ons > FFZ: BRC > ${moduleC} >> ${
							this.i18n.t(lang.module.toggle.name.key, lang.module.toggle.name.default)}`,
						title      : submoduleC,
						description: this.i18n.t(lang.module.toggle.description.key,
							lang.module.toggle.description.default)
							.replace('[module]', lower(moduleKey))
							.replace('[submodule]', lower(submoduleKey)),
						component  : 'setting-check-box'
					},
					changed: () => {
						this.reloadCSS();
						this.reloadHTML();
					}
				});
				
				if ('config' in submodule) {
					try {
						this.settings.add(submodule.config.key, this.loadMenuOps({
							default: submodule.config.default,
							ui     : {
								path       : `Add-Ons > FFZ: BRC > ${moduleC} >> ${
									this.i18n.t(lang.menu.config.name.key, lang.menu.config.name.default)}`,
								title      : submodule.config.title,
								description: submodule.config.description
							},
							changed: () => {
								this.reloadCSS();
								this.reloadHTML();
							}
						}, submodule.config));
					} catch (e) {
						if (e instanceof ValueMissingError) { // Value missing
							this.log.info(this.i18n.t(lang.menu.config.missing_value.key, lang.menu.config.missing_value.default)
								.replace('[valueType]', e.missingValue).replace('[module]', capitalize(submodule.config.title)));
						} else if (e instanceof UnknownValueTypeError) {
							this.log.info(this.i18n.t(lang.menu.config.unknown_type.key, lang.menu.config.unknown_type.default)
								.replace('[valueType]', e.value).replace('[module]', capitalize(submodule.config.title)));
						} else {
							this.log.info(e);
						}
					}
				}
			}
		}
	}
	
	loadMenuOps(baseMenuOps, module) {
		if ('type' in module) {
			switch (module.type) {
				case 'list':
					if (!('list' in module)) {
						throw new ValueMissingError('list');
					}
					
					baseMenuOps.ui.component = 'setting-select-box';
					baseMenuOps.ui.data      = module.list;
					break;
				case 'boolean':
					baseMenuOps.ui.component = 'setting-check-box';
					break;
				default:
					throw new UnknownValueTypeError(module.type);
			}
		} else {
			baseMenuOps.ui.component = 'setting-color-box';
		}
		
		return baseMenuOps;
	}
	
	onChange(moduleKey, forceDisable = false) {
		const enabled = forceDisable ? false : this.settings.get(getConfigKey(moduleKey, 'enabled'));
		
		if (document.addEventListener) {
			// All modern browsers should have document.addEventListener
			if (enabled) document.addEventListener('contextmenu', event => this.onRightClick(event, this));
			else document.removeEventListener('contextmenu', event => this.onRightClick(event, this));
		} else {
			// Add support for IE version < 11 bc we gotta give them some love <3
			if (enabled) document.attachEvent('oncontextmenu', event => this.onRightClick(event, this));
			else document.detachEvent('oncontextmenu', event => this.onRightClick(event, this));
		}
	}
	
	onEnable() {
		this.log.info('Setting up ffz-brc');
		
		this.setHTML();
		this.setCSS();
		
		document.getElementsByTagName('body')[0].insertAdjacentHTML('beforeend', '<div id="ffzbrc-main-container">');
		const el = document.getElementById('ffzbrc-main-container');
		el.insertAdjacentHTML('afterbegin', this.css);
		
		for (const moduleKey in modules) {
			if (!{}.hasOwnProperty.call(modules, moduleKey)) continue;
			
			el.insertAdjacentHTML('beforeend', this.html[moduleKey]);
			this.onChange(moduleKey);
		}
		
		if (document.addEventListener) document.addEventListener('click', event => this.onLeftClick(event, this));
		else document.attachEvent('onclick', event => this.onLeftClick(event, this));
		
		this.log.info('Successfully setup ffz-brc');
	}
	
	onDisable() {
		this.log.info('Disabling ffz-brc');
		
		document.getElementById(`ffzbrc-main-container`).remove();
		
		for (const moduleKey in modules) {
			if (!{}.hasOwnProperty.call(modules, moduleKey)) continue;
			
			this.onChange(moduleKey, true);
		}
		
		if (document.removeEventListener) document.removeEventListener('click', event => this.onLeftClick(event, this));
		else document.detachEvent('onclick', event => this.onLeftClick(event, this));
		
		this.log.info('Successfully disabled ffz-brc');
	}
	
	onRightClick(event, brc) {
		for (const moduleKey in modules) {
			if (!{}.hasOwnProperty.call(modules, moduleKey)) continue;
			
			if (brc.settings.get(getConfigKey(moduleKey, 'enabled')) && modules[moduleKey].checkElement(event.target)) {
				const el = document.getElementById(`ffzbrc-${moduleKey}-menu`);
				
				if (!modules[moduleKey].onClick(event, el)) continue;
				event.preventDefault();
				
				const mousePos = Utils.getMousePos(event);
				el.className   = 'show';
				el.style.top   = `${mousePos.y}px`;
				el.style.left  = `${mousePos.x}px`;
				
				// Break so only one menu is ever show at once
				break;
			}
		}
	}
	
	// eslint-disable-next-line no-unused-vars
	onLeftClick(event, brc) {
		const el = document.getElementById('ffzbrc-main-container');
		
		for (const child of el.children) {
			if (event.target.parentElement.parentElement === child && child.id.split('-').length === 3) {
				const moduleKey = child.id.split('-')[1];
				if (moduleKey in modules && event.target.className in modules[moduleKey].modules) {
					const ops = {};
					child.getAttributeNames().forEach(attr => ops[attr] = child.getAttribute(attr));
					modules[moduleKey].modules[event.target.className].method(brc, ops);
				}
			}
			
			if (child.className === 'show') {
				child.className = 'hide';
			}
		}
	}
	
	reloadCSS() {
		const el = document.getElementById('ffzbrc-main-container');
		if (!el) return;
		
		for (const style of el.getElementsByTagName('style')) {
			style.remove();
		}
		
		this.setCSS();
		el.insertAdjacentHTML('afterbegin', this.css);
	}
	
	setCSS() {
		this.css = `
<style>
#ffzbrc-main-container .show {
  background-color: ${this.settings.get(menu.colors.background.key)};
  border: ${this.settings.get(menu.config_common.border_width.key)}px solid ${this.settings.get(menu.colors.border.key)};
  border-radius: ${this.settings.get(menu.config_common.border_radius.key)}px;
  color: ${this.settings.get(menu.colors.text.key)};
  display: block;
  position: absolute;
  width: ${this.settings.get(menu.config_common.menu_width.key)}px;
  z-index: 10000;
}

#ffzbrc-main-container .hide {
  display: none;
}

#ffzbrc-main-container .show li:not(.separator) {
  padding-left: ${this.settings.get(menu.config_expert.border_padding_left.key)}px;
  padding-right: ${this.settings.get(menu.config_expert.border_padding_right.key)}px;
  margin-left: ${this.settings.get(menu.config_expert.border_margin_left.key)}px;
  margin-right: ${this.settings.get(menu.config_expert.border_margin_right.key)}px;
}

#ffzbrc-main-container .show li.separator {
  background-color: ${this.settings.get(menu.colors.separators.key)};
  height: ${this.settings.get(menu.config_expert.separator_height.key)}px;
  margin-left: ${this.settings.get(menu.config_expert.separator_margin_left.key)}px;
  margin-right: ${this.settings.get(menu.config_expert.separator_margin_right.key)}px;
}

#ffzbrc-main-container .show li {
  list-style-type: none;
}

#ffzbrc-main-container .show a:link, a:visited, a:hover, a:active {
  color: ${this.settings.get(menu.colors.text.key)};
  cursor: default;
  text-decoration: none;
}

#ffzbrc-main-container .show li:first-child {
  padding-top: ${this.settings.get(menu.config_expert.border_padding_top.key) +
		this.settings.get(menu.config_expert.module_padding_top.key)}px;
  margin-top: ${this.settings.get(menu.config_expert.border_margin_top.key) +
		this.settings.get(menu.config_expert.module_margin_top.key)}px;
}

#ffzbrc-main-container .show li:last-child {
  padding-bottom: ${this.settings.get(menu.config_expert.border_padding_bottom.key) +
		this.settings.get(menu.config_expert.module_padding_bottom.key)}px;
  margin-bottom: ${this.settings.get(menu.config_expert.border_margin_bottom.key) +
		this.settings.get(menu.config_expert.module_margin_bottom.key)}px;
}

#ffzbrc-main-container .show li:not(.separator):not(:first-child) {
  padding-top: ${this.settings.get(menu.config_expert.module_padding_top.key)}px;
  margin-top: ${this.settings.get(menu.config_expert.module_margin_top.key)}px;
}

#ffzbrc-main-container .show li:not(.separator):not(:last-child) {
  padding-bottom: ${this.settings.get(menu.config_expert.module_padding_bottom.key)}px;
  margin-bottom: ${this.settings.get(menu.config_expert.module_margin_bottom.key)}px;
}

#ffzbrc-main-container .show li:not(.separator):hover {
  background-color: ${this.settings.get(menu.colors.highlight.key)};
  cursor: default;
}
</style>`;
	}
	
	reloadHTML() {
		const el = document.getElementById('ffzbrc-main-container');
		if (!el) return;
		
		for (const div of el.getElementsByTagName('div')) {
			div.remove();
		}
		
		this.setHTML();
		for (const moduleKey in modules) {
			if (!{}.hasOwnProperty.call(modules, moduleKey)) continue;
			
			el.insertAdjacentHTML('beforeend', this.html[moduleKey]);
			this.onChange(moduleKey);
		}
	}
	
	setHTML() {
		this.html = {};
		
		for (const moduleKey in modules) {
			if (!{}.hasOwnProperty.call(modules, moduleKey)) continue;
			
			let html = `<div id="ffzbrc-${moduleKey}-menu" class="hide"><ul>`;
			for (const submoduleKey in modules[moduleKey].modules) {
				if (!{}.hasOwnProperty.call(modules[moduleKey].modules, submoduleKey)) continue;
				
				if(this.settings.get(menu.config_common.display_separators.key) && html.endsWith('</li>'))
					html += `<li class="separator"/>`
				
				if (this.settings.get(getConfigKey(moduleKey, submoduleKey)))
					html += `<li class="${submoduleKey}">${capitalize(submoduleKey)}</li>`;
			}
			html += `</ul></div>`;
			this.html[moduleKey] = html;
		}
	}
}

FFZBRC.register();