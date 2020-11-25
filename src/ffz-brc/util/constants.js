const keyStarter          = 'add_ons.ffz-brc';
export const getLangKey   = (...keys) => `${keyStarter}.lang.${keys.join('.')}`;
export const getConfigKey = (moduleName, configName) => `${keyStarter}.config.${moduleName}.${configName === 'enabled' ? '' : 'config.'}${configName}`;
const getMenuKey          = (isColor, configName) => `${keyStarter}.config.menu.${isColor ? 'color' : 'config'}.${configName}`;

export const lang = {
	module: {
		enabled       : {
			name       : {
				default: '(A) Main [module] Toggle',
				key    : getLangKey('module', 'enabled', 'name')
			},
			title      : {
				default: 'Enabled',
				key    : getLangKey('module', 'enabled', 'title')
			},
			description: {
				default: 'Toggle the [module] module',
				key    : getLangKey('module', 'enabled', 'description')
			}
		},
		toggle        : {
			name       : {
				default: 'Toggles',
				key    : getLangKey('module', 'toggle', 'name')
			},
			title      : {
				default: '[toggleName]',
				key    : getLangKey('module', 'toggle', 'title')
			},
			description: {
				default: 'Toggle the [module] [submodule] module',
				key    : getLangKey('module', 'toggle', 'description')
			}
		},
		unknown_module: {
			default: 'Caught unknown module: [module]',
			key    : getLangKey('module', 'unknown')
		}
	},
	menu  : {
		colors       : {
			name       : {
				default: 'Colors',
				key    : getLangKey('menu', 'color', 'name')
			},
			title      : {
				default: '[key] Color',
				key    : getLangKey('menu', 'color', 'title')
			},
			description: {
				default: 'Sets the [key] color',
				key    : getLangKey('menu', 'color', 'description')
			}
		},
		config       : {
			name         : {
				default: 'Config',
				key    : getLangKey('menu', 'config', 'name')
			},
			title        : {
				default: '[key]',
				key    : getLangKey('menu', 'config', 'title')
			},
			missing_value: {
				default: `Missing value '[valueType]' in module [module]`,
				key    : getLangKey('menu', 'config', 'missing')
			},
			unknown_type : {
				default: `Unknown config type '[valueType]' in module [module]`,
				key    : getLangKey('menu', 'config', 'unknown')
			}
		},
		config_common: {
			name : {
				default: 'Config: Common',
				key    : getLangKey('menu', 'config_common', 'name')
			},
			title: {
				default: '[key]',
				key    : getLangKey('menu', 'config_common', 'title')
			}
		},
		config_expert: {
			name : {
				default: 'Config: Expert',
				key    : getLangKey('menu', 'config_expert', 'name')
			},
			title: {
				default: '[key]',
				key    : getLangKey('menu', 'config_expert', 'title')
			}
		}
	}
};

export const menu = {
	colors       : {
		background: {
			default: 'rgb(24,24,27)',
			key    : getMenuKey(true, 'background')
		},
		border    : {
			default: 'rgb(14,14,16)',
			key    : getMenuKey(true, 'border')
		},
		highlight : {
			default: 'rgb(14,14,16)',
			key    : getMenuKey(true, 'highlight')
		},
		text      : {
			default: 'rgb(255,255,255)',
			key    : getMenuKey(true, 'text')
		},
		separators: {
			default: 'rgb(36,36,39)',
			key    : getMenuKey(true, 'separators')
		}
	},
	config_common: {
		border_radius     : {
			default    : 0,
			description: 'Corner radius of the menu',
			key        : getMenuKey(false, 'border_radius'),
			list       : [
				{value: 0, title: '0px'}, {value: 1, title: '1px'},
				{value: 2, title: '2px'}, {value: 3, title: '3px'},
				{value: 4, title: '4px'}, {value: 5, title: '5px'},
				{value: 6, title: '6px'}, {value: 7, title: '7px'},
				{value: 8, title: '8px'}, {value: 9, title: '9px'},
				{value: 10, title: '10px'}, {value: 11, title: '11px'},
				{value: 12, title: '12px'}, {value: 13, title: '13px'},
				{value: 14, title: '14px'}, {value: 15, title: '15px'}
			],
			type       : 'list'
		},
		border_width      : {
			default    : 2,
			description: 'Border width of the menu',
			key        : getMenuKey(false, 'border_width'),
			list       : [
				{value: 0, title: '0px'}, {value: 1, title: '1px'},
				{value: 2, title: '2px'}, {value: 3, title: '3px'},
				{value: 4, title: '4px'}, {value: 5, title: '5px'},
				{value: 6, title: '6px'}, {value: 7, title: '7px'},
				{value: 8, title: '8px'}, {value: 9, title: '9px'},
				{value: 10, title: '10px'}
			],
			type       : 'list'
		},
		menu_width        : {
			default    : 150,
			description: 'Width of the menu',
			key        : getMenuKey(false, 'menu_width'),
			list       : [
				{value: 75, title: '75px'}, {value: 100, title: '100px'},
				{value: 125, title: '125px'}, {value: 150, title: '150px'},
				{value: 175, title: '175px'}, {value: 200, title: '200px'}
			],
			type       : 'list'
		},
		display_separators: {
			default    : true,
			description: 'Enable to display separators',
			key        : getMenuKey(false, 'display_separators'),
			type       : 'boolean'
		}
	},
	config_expert: {
		border_padding_bottom : {
			default    : 0,
			description: 'Border padding width of bottom of the menu',
			key        : getMenuKey(false, 'border_padding_bottom'),
			list       : [
				{value: 0, title: '0px'}, {value: 1, title: '1px'},
				{value: 2, title: '2px'}, {value: 3, title: '3px'},
				{value: 4, title: '4px'}, {value: 5, title: '5px'},
				{value: 6, title: '6px'}, {value: 7, title: '7px'},
				{value: 8, title: '8px'}, {value: 9, title: '9px'},
				{value: 10, title: '10px'}
			],
			type       : 'list'
		},
		border_padding_left   : {
			default    : 6,
			description: 'Border padding width of left of the menu',
			key        : getMenuKey(false, 'border_padding_left'),
			list       : [
				{value: 0, title: '0px'}, {value: 1, title: '1px'},
				{value: 2, title: '2px'}, {value: 3, title: '3px'},
				{value: 4, title: '4px'}, {value: 5, title: '5px'},
				{value: 6, title: '6px'}, {value: 7, title: '7px'},
				{value: 8, title: '8px'}, {value: 9, title: '9px'},
				{value: 10, title: '10px'}
			],
			type       : 'list'
		},
		border_padding_right  : {
			default    : 6,
			description: 'Border padding width of right of the menu',
			key        : getMenuKey(false, 'border_padding_right'),
			list       : [
				{value: 0, title: '0px'}, {value: 1, title: '1px'},
				{value: 2, title: '2px'}, {value: 3, title: '3px'},
				{value: 4, title: '4px'}, {value: 5, title: '5px'},
				{value: 6, title: '6px'}, {value: 7, title: '7px'},
				{value: 8, title: '8px'}, {value: 9, title: '9px'},
				{value: 10, title: '10px'}
			],
			type       : 'list'
		},
		border_padding_top    : {
			default    : 0,
			description: 'Border padding width of top of the menu',
			key        : getMenuKey(false, 'border_padding_top'),
			list       : [
				{value: 0, title: '0px'}, {value: 1, title: '1px'},
				{value: 2, title: '2px'}, {value: 3, title: '3px'},
				{value: 4, title: '4px'}, {value: 5, title: '5px'},
				{value: 6, title: '6px'}, {value: 7, title: '7px'},
				{value: 8, title: '8px'}, {value: 9, title: '9px'},
				{value: 10, title: '10px'}
			],
			type       : 'list'
		},
		border_margin_bottom  : {
			default    : 0,
			description: 'Border margin width of bottom of the menu',
			key        : getMenuKey(false, 'border_margin_bottom'),
			list       : [
				{value: 0, title: '0px'}, {value: 1, title: '1px'},
				{value: 2, title: '2px'}, {value: 3, title: '3px'},
				{value: 4, title: '4px'}, {value: 5, title: '5px'},
				{value: 6, title: '6px'}, {value: 7, title: '7px'},
				{value: 8, title: '8px'}, {value: 9, title: '9px'},
				{value: 10, title: '10px'}
			],
			type       : 'list'
		},
		border_margin_left    : {
			default    : 0,
			description: 'Border margin width of left of the menu',
			key        : getMenuKey(false, 'border_margin_left'),
			list       : [
				{value: 0, title: '0px'}, {value: 1, title: '1px'},
				{value: 2, title: '2px'}, {value: 3, title: '3px'},
				{value: 4, title: '4px'}, {value: 5, title: '5px'},
				{value: 6, title: '6px'}, {value: 7, title: '7px'},
				{value: 8, title: '8px'}, {value: 9, title: '9px'},
				{value: 10, title: '10px'}
			],
			type       : 'list'
		},
		border_margin_right   : {
			default    : 0,
			description: 'Border margin width of right of the menu',
			key        : getMenuKey(false, 'border_margin_right'),
			list       : [
				{value: 0, title: '0px'}, {value: 1, title: '1px'},
				{value: 2, title: '2px'}, {value: 3, title: '3px'},
				{value: 4, title: '4px'}, {value: 5, title: '5px'},
				{value: 6, title: '6px'}, {value: 7, title: '7px'},
				{value: 8, title: '8px'}, {value: 9, title: '9px'},
				{value: 10, title: '10px'}
			],
			type       : 'list'
		},
		border_margin_top     : {
			default    : 0,
			description: 'Border margin width of top of the menu',
			key        : getMenuKey(false, 'border_margin_top'),
			list       : [
				{value: 0, title: '0px'}, {value: 1, title: '1px'},
				{value: 2, title: '2px'}, {value: 3, title: '3px'},
				{value: 4, title: '4px'}, {value: 5, title: '5px'},
				{value: 6, title: '6px'}, {value: 7, title: '7px'},
				{value: 8, title: '8px'}, {value: 9, title: '9px'},
				{value: 10, title: '10px'}
			],
			type       : 'list'
		},
		module_margin_bottom  : {
			default    : 0,
			description: 'Margin on the bottom of each module',
			key        : getMenuKey(false, 'module_margin_bottom'),
			list       : [
				{value: 0, title: '0px'}, {value: 1, title: '1px'},
				{value: 2, title: '2px'}, {value: 3, title: '3px'},
				{value: 4, title: '4px'}, {value: 5, title: '5px'},
				{value: 6, title: '6px'}, {value: 7, title: '7px'},
				{value: 8, title: '8px'}, {value: 9, title: '9px'},
				{value: 10, title: '10px'}
			],
			type       : 'list'
		},
		module_margin_top     : {
			default    : 0,
			description: 'Margin on the top of each module',
			key        : getMenuKey(false, 'module_margin_top'),
			list       : [
				{value: 0, title: '0px'}, {value: 1, title: '1px'},
				{value: 2, title: '2px'}, {value: 3, title: '3px'},
				{value: 4, title: '4px'}, {value: 5, title: '5px'},
				{value: 6, title: '6px'}, {value: 7, title: '7px'},
				{value: 8, title: '8px'}, {value: 9, title: '9px'},
				{value: 10, title: '10px'}
			],
			type       : 'list'
		},
		module_padding_bottom : {
			default    : 4,
			description: 'Padding on the bottom of each module',
			key        : getMenuKey(false, 'module_padding_bottom'),
			list       : [
				{value: 0, title: '0px'}, {value: 1, title: '1px'},
				{value: 2, title: '2px'}, {value: 3, title: '3px'},
				{value: 4, title: '4px'}, {value: 5, title: '5px'},
				{value: 6, title: '6px'}, {value: 7, title: '7px'},
				{value: 8, title: '8px'}, {value: 9, title: '9px'},
				{value: 10, title: '10px'}
			],
			type       : 'list'
		},
		module_padding_top    : {
			default    : 4,
			description: 'Padding on the top of each module',
			key        : getMenuKey(false, 'module_padding_top'),
			list       : [
				{value: 0, title: '0px'}, {value: 1, title: '1px'},
				{value: 2, title: '2px'}, {value: 3, title: '3px'},
				{value: 4, title: '4px'}, {value: 5, title: '5px'},
				{value: 6, title: '6px'}, {value: 7, title: '7px'},
				{value: 8, title: '8px'}, {value: 9, title: '9px'},
				{value: 10, title: '10px'}
			],
			type       : 'list'
		},
		separator_height      : {
			default    : 1,
			description: 'Height of all separators',
			key        : getMenuKey(false, 'separator_height'),
			list       : [
				{value: 0, title: '0px'}, {value: 1, title: '1px'},
				{value: 2, title: '2px'}, {value: 3, title: '3px'},
				{value: 4, title: '4px'}, {value: 5, title: '5px'}
			],
			type       : 'list'
		},
		separator_margin_left : {
			default    : 12,
			description: 'Left margin for all separators',
			key        : getMenuKey(false, 'separator_margin_left'),
			list       : [
				{value: 0, title: '0px'}, {value: 2, title: '2px'},
				{value: 4, title: '4px'}, {value: 6, title: '6px'},
				{value: 8, title: '8px'}, {value: 10, title: '10px'},
				{value: 12, title: '12px'}, {value: 14, title: '14px'},
				{value: 16, title: '16px'}, {value: 18, title: '18px'},
				{value: 20, title: '20px'}, {value: 22, title: '22px'},
				{value: 24, title: '24px'}, {value: 26, title: '26px'},
				{value: 28, title: '28px'}, {value: 30, title: '30px'}
			],
			type       : 'list'
		},
		separator_margin_right: {
			default    : 0,
			description: 'Right margin for all separators',
			key        : getMenuKey(false, 'separator_margin_right'),
			list       : [
				{value: 0, title: '0px'}, {value: 2, title: '2px'},
				{value: 4, title: '4px'}, {value: 6, title: '6px'},
				{value: 8, title: '8px'}, {value: 10, title: '10px'},
				{value: 12, title: '12px'}, {value: 14, title: '14px'},
				{value: 16, title: '16px'}, {value: 18, title: '18px'},
				{value: 20, title: '20px'}, {value: 22, title: '22px'},
				{value: 24, title: '24px'}, {value: 26, title: '26px'},
				{value: 28, title: '28px'}, {value: 30, title: '30px'}
			],
			type       : 'list'
		}
	}
};