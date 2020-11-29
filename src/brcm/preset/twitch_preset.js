import {Preset} from './preset.js';

export class TwitchDefaultPreset extends Preset {
	constructor() {
		super('twitch', 'Twitch (Default)',
`#brcm-main-container .show {
	background-color: #1A1A1A;
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
	background-color: #0D0D0D;
	font-size:        15px;
	padding-top:      2px;
	padding-bottom:   2px;
	padding-left:     6px;
	padding-right:    6px;
}

#brcm-main-container .show li:not(.separator-menu-item):not(.separator-header):not(.header) {
	background-color: #1A1A1A;
	font-size:        12px;
	padding-top:      4px;
	padding-bottom:   4px;
	padding-left:     6px;
	padding-right:    6px;
}

#brcm-main-container .show li:not(.separator-menu-item):not(.separator-header):not(.header):hover {
	background-color: #FFFFFF33;
}`);
	}
}

export class TwitchFZZPreset extends Preset {
	constructor() {
		super('twitch_ffz', 'Twitch (FFZ)',
`#brcm-main-container .show {
	background-color: var(--color-background-alt);
	border:           var(--border-width-default) solid var(--color-border-base);
	box-shadow:       var(--shadow-elevation-3);
	border-radius:    var(--border-radius-small);
	color:            var(--color-text-base);
	min-width:        150px;
}

#brcm-main-container .show li.separator-header {
	background-color: var(--color-border-base);
	height:           var(--border-width-default);
}

#brcm-main-container .show li.separator-menu-item {
	background-color: var(--color-border-base);
	height:           var(--border-width-default);
}

#brcm-main-container .show li.header {
	background-color: var(--color-background-base);
	font-size:        var(--font-size-4);
	padding-top:      var(--button-padding-y);
	padding-bottom:   var(--button-padding-y);
	padding-left:     var(--button-padding-x);
	padding-right:    var(--button-padding-x);
}

#brcm-main-container .show li:not(.separator-menu-item):not(.separator-header):not(.header) {
	font-size:        var(--font-size-5);
	padding-top:      var(--button-padding-y);
	padding-bottom:   var(--button-padding-y);
	padding-left:     var(--button-padding-x);
	padding-right:    var(--button-padding-x);
}

#brcm-main-container .show li:not(.separator-menu-item):not(.separator-header):not(.header):hover {
	background-color: var(--color-background-button-text-hover);
}`);
	}
}
