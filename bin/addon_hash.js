'use strict';

const fs = require('fs'),
	crypto = require('crypto');

const hash = crypto.createHash('md5');
hash.update(fs.readFileSync('dist/addons.json'));
const hex = hash.digest('hex');

fs.renameSync('dist/addons.json', `dist/addons.${hex}.json`);

const data = JSON.parse(fs.readFileSync('dist/addons/manifest.json', {encoding: 'utf8'}));

data['addons.json'] = `addons.${hex}.json`;

fs.writeFileSync('dist/addons/manifest.json', JSON.stringify(data));
