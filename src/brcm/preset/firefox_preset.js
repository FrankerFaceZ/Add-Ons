import {Preset} from './preset.js';

export class FirefoxDarkPreset extends Preset {
	constructor() {
		super('ffdark', 'Firefox (Dark)',
			`#brcm-main-container .show {
	background-color: rgb(59,63,69);
	border:           1px solid rgb(95,98,102);
	border-radius:    0px;
	color:            rgb(255,255,255);
	box-shadow:       0 0 10px rgba(0,0,0,0.75);
	min-width:        190px;
	
	padding-top:      2px;
	padding-bottom:   2px;
	padding-left:     2px;
	padding-right:    2px;
}

#brcm-main-container .show li.separator-header {
	background-color: rgb(71,77,82);
	height:           1px;
	margin-left:      12px;
}

#brcm-main-container .show li.separator-menu-item {
	background-color: rgb(71,77,82);
	height:           1px;
	margin-left:      20px;
}

#brcm-main-container .show li.header {
	background-color: rgb(59,63,69);
	font-size:        14px;
	padding-top:      6px;
	padding-bottom:   6px;
	padding-left:     10px;
	padding-right:    10px;
}

#brcm-main-container .show li:not(.separator-menu-item):not(.separator-header):not(.header) {
	background-color: rgb(59,63,69);
	font-size:        12px;
	padding-top:      3px;
	padding-bottom:   2px;
	padding-left:     23px;
	padding-right:    6px;
}

#brcm-main-container .show li:not(.separator-menu-item):not(.separator-header):not(.header):hover {
	background-color: rgb(87,91,96);
}`);
	}
}

export class FirefoxLightPreset extends Preset {
	constructor() {
		super('fflight', 'Firefox (Light)',
			`#brcm-main-container .show {
	background-color: rgb(242,242,242);
	border:           1px solid rgb(221,221,221);
	border-radius:    0px;
	color:            rgb(0,0,0);
	box-shadow:       0 0 10px rgba(0,0,0,0.75);
	min-width:        190px;
	
	padding-top:      2px;
	padding-bottom:   2px;
	padding-left:     2px;
	padding-right:    2px;
}

#brcm-main-container .show li.separator-header {
	background-color: rgb(221,221,221);
	height:           1px;
	margin-left:      12px;
}

#brcm-main-container .show li.separator-menu-item {
	background-color: rgb(221,221,221);
	height:           1px;
	margin-left:      20px;
}

#brcm-main-container .show li.header {
	background-color: rgb(242,242,242);
	font-size:        14px;
	padding:          6px 10px;
}

#brcm-main-container .show li:not(.separator-menu-item):not(.separator-header):not(.header) {
	background-color: rgb(242,242,242);
	font-size:        12px;
	padding-top:      3px;
	padding-bottom:   2px;
	padding-left:     23px;
	padding-right:    6px;
}

#brcm-main-container .show li:not(.separator-menu-item):not(.separator-header):not(.header):hover {
	background-color: rgb(144,201,246);
}`);
	}
}
