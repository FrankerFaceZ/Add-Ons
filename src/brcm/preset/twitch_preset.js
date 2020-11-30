import {Preset} from './preset.js';

export class TwitchDefaultPreset extends Preset {
	constructor() {
		super('twitch', 'Twitch (Default)',
			`#brcm-main-container .show {
		border:           1px solid #232223;
		border-radius:    3px;
		color:            #FFFFFF;
		box-shadow:       0 0 3px rgb(0,0,0);
		min-width:        150px;
}

#brcm-main-container .show li.separator-header {
		background-color: #232223;
		height:           1px;
}

#brcm-main-container .show li.separator-menu-item {
		background-color: #232223;
		height:           1px;
}

#brcm-main-container .show li.header {
		background-color: #18181B;
		font-size:        15px;
		padding:          2px 6px;
}

#brcm-main-container .show li:not(.separator-menu-item):not(.separator-header):not(.header) {
		background-color: #1E1E22;
		font-size:        12px;
		padding:          4px 6px;
}

#brcm-main-container .show li:not(.separator-menu-item):not(.separator-header):not(.header):hover {
		background-color: #772CE8;
}`);
	}
}

export class TwitchFZZPreset extends Preset {
	constructor() {
		super('twitch_ffz', 'Twitch (FFZ)',
			`#brcm-main-container .show {
    color:            var(--color-text-base) !important;
    background-color: var(--color-background-alt) !important;
    border:           var(--border-width-default) solid var(--color-border-base) !important;
    box-shadow:       var(--shadow-elevation-3) !important;
    border-radius:    var(--border-radius-small) !important;
    min-width:        150px !important;
}

#brcm-main-container .show li.separator-header {
    background-color: var(--color-border-base) !important;
    height:           var(--border-width-default) !important;
}

#brcm-main-container .show li.separator-menu-item {
    background-color: var(--color-border-base) !important;
    height:           var(--border-width-default) !important;
}

#brcm-main-container .show li.header {
    background-color: var(--color-background-base) !important;
    font-size:        var(--font-size-4) !important;
    padding:          var(--button-padding-y) var(--button-padding-x) !important;
}

#brcm-main-container .show li:not(.separator-menu-item):not(.separator-header):not(.header) {
    font-size:        var(--font-size-5) !important;
    padding:          var(--button-padding-y) var(--button-padding-x) !important;
}

#brcm-main-container .show li:not(.separator-menu-item):not(.separator-header):not(.header):hover {
    background-color: var(--color-background-button-text-hover) !important;
}`);
	}
}
