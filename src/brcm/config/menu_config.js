import {BooleanConfig, ColorConfig, ConfigPath, TextBoxConfig} from './config.js';

/*
 * Everything exported from this class will be created
 * as if it extends the Config class. If something is
 * exported that does not, it will cause the everything
 * after that value to not be loaded.
 */

const process = (val, defaultVal) => {
	if(val.endsWith('rem')){
		const n = parseInt(val.split('rem')[0]);
		return isNaN(n) || !isFinite(n) ? `${defaultVal}px` : val;
	} else if(val.endsWith('px')){
		const n = parseInt(val.split('px')[0]);
		return isNaN(n) || !isFinite(n) ? `${defaultVal}px` : val;
	} else {
		const n = parseInt(val);
		return isNaN(n) || !isFinite(n) ? `${defaultVal}px` : `${val}px`;
	}
};

let sort                                      = 0;
export const pathConfig                       = new ConfigPath().addSegment('Config', sort++);
export const config_displayHeader             = new BooleanConfig('display_header', true, pathConfig);
export const config_displayHeaderSeparators   = new BooleanConfig('display_header_separator', true, pathConfig);
export const config_displayMenuItemSeparators = new BooleanConfig('display_menu_item_separators', true, pathConfig);
export const config_headerTextSize            = new TextBoxConfig('header_text_size', `15px`, pathConfig).setUIProcess(n => process(n, 15));
export const config_menuItemTextSize          = new TextBoxConfig('menu_item_text_size', `12px`, pathConfig).setUIProcess(n => process(n, 12));
export const config_borderRadius              = new TextBoxConfig('border_radius', `3px`, pathConfig).setUIProcess(n => process(n, 3));
export const config_borderWidth               = new TextBoxConfig('border_width', `1px`, pathConfig).setUIProcess(n => process(n, 1));
export const config_menuWidth                 = new TextBoxConfig('menu_width', `150px`, pathConfig).setUIProcess(n => process(n, 150));

export const pathColors                 = new ConfigPath().addSegment('Colors', sort++);
export const color_header_background    = new ColorConfig('header_background', 'rgb(24,24,27)', pathColors);
export const color_menu_item_background = new ColorConfig('menu_item_background', 'rgb(31,31,35)', pathColors);
export const color_background           = new ColorConfig('background', 'rgb(31,31,35)', pathColors);
export const color_border               = new ColorConfig('border', 'rgb(54,54,57)', pathColors);
export const color_highlight            = new ColorConfig('highlight', 'rgb(76,76,79)', pathColors);
export const color_header_separators    = new ColorConfig('header_separators', 'rgb(53,53,57)', pathColors);
export const color_menu_item_separators = new ColorConfig('menu_item_separators', 'rgb(53,53,57)', pathColors);
export const color_text                 = new ColorConfig('text', 'rgb(255,255,255)', pathColors);

export const pathCSS     = new ConfigPath().addSegment('Custom CSS', sort++);
export const css_enabled = new BooleanConfig('css_enabled', false, pathCSS, 'Enabled').setSort(0);
