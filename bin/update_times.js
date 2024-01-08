'use strict';

const fs = require('fs');
//const jsonfile = require('jsonfile');
const sgf = require('staged-git-files');
const child = require('child_process');


function readJSON(file) {
	try {
		return JSON.parse(fs.readFileSync(file));
	} catch(err) { /* no-op */ }
}


async function main() {
	const staged = await sgf(),
		modified = new Set;

	if ( ! Array.isArray(staged) )
		return;

	for(const file of staged) {
		const match = /^(?:\.\/)?src\/([^/]+)/.exec(file.filename);
		if ( match )
			modified.add(match[1]);
	}

	if ( ! modified.size )
		return;

	console.log('Modified Add-ons:', [...modified].join(', '));
	const now = new Date;

	for(const addon of modified) {
		const manifest = `src/${addon}/manifest.json`,
			json = readJSON(manifest);

		if ( ! json || ! json.enabled ) {
			console.debug('Skipping add-on:', addon);
			continue;
		}

		if ( ! json.created )
			json.created = now;

		json.updated = now;

		fs.writeFileSync(manifest, JSON.stringify(json, null, '\t'));
		child.spawnSync('git', ['add', manifest]);
	}
}

main();
