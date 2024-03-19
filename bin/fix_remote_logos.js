'use strict';

const path = require('path');
const glob = require('glob');
const fs = require('fs');

const { Readable } = require('stream');
const { finished } = require('stream/promises');


function getFolderName(file) {
	return path.basename(path.dirname(file));
}

// First, identify every add-on.

const FOLDERS = {},
	MANIFESTS = {};

const NON_LOCAL_ICONS = [];

for(const entry of glob.sync('./src/**/index.{js,jsx}')) {
	const folder = getFolderName(entry);
	
	// Try to read the manifest.
	const fname = path.join(path.dirname(entry), 'manifest.json');
	let json;
	try {
		json = JSON.parse(fs.readFileSync(fname));
	} catch(err) {
		console.warn(`Unable to read manifest for file: ${entry}`);
		continue;
	}
	
	if ( ! json.enabled )
		continue;
	
	if ( json.icon ) {
		const url = new URL(json.icon);
		if ( url.hostname !== 'frankerfacez.com' && ! url.hostname.endsWith('.frankerfacez.com'))
			NON_LOCAL_ICONS.push(folder);
	}
	
	FOLDERS[folder] = path.dirname(entry);
	MANIFESTS[folder] = json;
}

if ( NON_LOCAL_ICONS.length )
	console.warn('The following add-ons use non-local logos:', NON_LOCAL_ICONS.join(', '));

async function downloadLogo(addon) {
	const json = MANIFESTS[addon];
	console.log('addon:', addon, '-- icon:', json?.icon);
	if ( ! json?.icon )
		return;

	const folder = FOLDERS[addon];
	if ( ! folder )
		return;

	const resp = await fetch(json.icon);
	if ( ! resp.ok ) {
		console.log('-- unable to download icon', resp.status, resp.statusText, await resp.text());
		return;
	}

	const dest = path.join(FOLDERS[addon], 'logo.png');
	console.log('-- save to:', dest);
	
	const file = fs.createWriteStream(dest, {flags: 'wx'});
	await finished(Readable.fromWeb(resp.body).pipe(file));

	delete json.icon;
	try {
		fs.writeFileSync(path.join(folder, 'manifest.json'), JSON.stringify(json, null, '\t'));
	} catch(err) {
		console.warn('-- unable to write manifest for:', addon);
	}
}

async function process() {
	for(const addon of NON_LOCAL_ICONS)
		await downloadLogo(addon);
}

process();