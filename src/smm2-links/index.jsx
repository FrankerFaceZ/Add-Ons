'use strict';

import { Code, OCW_COURSE_META, OCW_MAKER_META, NSO_COURSE_META, NSO_MAKER_META } from '@wizulus/code';

const SMM2_CODE = /\b(?:[0-9BCDFGHJKLMNPQRSTVWXY]{3}-?){2}[0-9BCDFGHJKLMNPQRSTVWXY]{3}\b/gi;


class SMM2Links extends Addon {

	constructor(...args) {
		super(...args);

		this.inject('chat');
		this.inject('settings');

		this.settings.add('addon.smm2-links.enabled', {
			default: null,
			requires: ['context.categoryID'],

			process(ctx, val) {
				if ( val == null )
					return ctx.get('context.categoryID') == 511399;
				return val;
			},

			ui: {
				sort: -1,
				path: 'Add-Ons > SMM2 Links >> General',
				title: 'Enable clickable Mario Maker 2 IDs.',
				description: 'By default, this is only enabled if the current category is Super Mario Maker 2.',
				component: 'setting-check-box'
			}
		});

		this.settings.add('addon.smm2-links.allow-embed', {
			default: false,
			ui: {
				path: 'Add-Ons > SMM2 Links >> General',
				title: 'Allow rich embeds for Mario Maker 2 IDs.',
				description: '**Note:** This only works when the IDs are clickable. Make sure to enable rich embeds in [Chat >> Appearance > Rich Content](~chat.appearance.rich_content).',
				component: 'setting-check-box',
				extra: {
					component: 'chat-rich-example',
					getChat: () => this.chat,
					url: `https://smm2.wizul.us/smm2/course/SYG-7FR-QLG`
				}
			}
		});

		this.settings.add('addon.smm2-links.viewer_link', {
			default: 0,
			ui: {
				path: 'Add-Ons > SMM2 Links >> General',
				title: 'Wizulus\'s Viewer Link',
				description: 'You can optionally include a link to view makers and courses using Wizulus\'s SMM2 Viewer.',
				component: 'setting-select-box',

				data: [
					{ value: 0, title: 'Disabled' },
					{ value: 1, title: 'Replace ID link' },
					{ value: 2, title: 'Add [Viewer] next to ID link' },
				]
			}
		});

		const t = this;

		this.tokenizer = {
			type: 'smm_link',
			priority: 0,

			render(token, createElement) {
				return (<strong>{token.meta}: {token.code}</strong>)
			},

			process(tokens) {
				if ( ! tokens || ! tokens.length || ! this.context.get('addon.smm2-links.enabled') )
					return;

				const out = [],
					allow_rich = this.context.get('addon.smm2-links.allow-embed'),
					viewer_link = this.context.get('addon.smm2-links.viewer_link');
				
				
				for(const token of tokens) {
					if ( token.type !== 'text' ) {
						out.push(token);
						continue;
					}

					SMM2_CODE.lastIndex = 0;
					const text = token.text;
					let idx = 0, match;

					while((match = SMM2_CODE.exec(text))) {
						const code = match[0];

						let parsed, meta;
						try {
							parsed = new Code(code);
							meta = parsed.getMeta();
						} catch(err) {
							t.log.debug('Unable to parse code:', code, err);
							continue;
						}


						let dashes = true,
							base;
						if ( viewer_link === 1 )
							base = 'https://smm2.wizul.us/smm2/course/';
						else if ( meta === OCW_COURSE_META )
							base = 'https://opencourse.world/courses/';
						else if ( meta === OCW_MAKER_META )
							base = 'https://opencourse.world/makers/';
						else if ( meta === NSO_COURSE_META ) {
							base = 'https://makercentral.io/levels/view/';
							dashes = false;
						} else if ( meta === NSO_MAKER_META ) {
							base = 'https://makercentral.io/users/';
							dashes = false;
						} else {
							continue;
						}

						const nix = match.index;
						if ( idx !== nix )
							out.push({type: 'text', text: text.slice(idx, nix)});

						let url = parsed.toString();
						if ( ! dashes )
							url = url.replace(/-/g, '');

						url = base + url;

						out.push({
							type: 'link',
							allow_rich,
							url,
							is_mail: false,
							text: code
						});

						if ( viewer_link === 2 ) {
							out.push({type: 'text', text: ' ['});
							out.push({
								type: 'link',
								allow_rich : false,
								url : `https://smm2.wizul.us/smm2/course/${parsed.toString()}`,
								is_mail: false,
								text: 'Viewer'
							});
							out.push({type: 'text', text: ']'});
						}

						idx = nix + code.length;
					}

					if ( idx === 0 )
						out.push(token);
					else if ( idx < text.length )
						out.push({type: 'text', text: text.slice(idx)});
				}

				return out;
			}

		}

	}

	onEnable() {
		this.chat.addTokenizer(this.tokenizer);

		for(const setting of [
			'addon.smm2-links.enabled',
			'addon.smm2-links.allow-embed',
			'addon.smm2-links.viewer_link'
		])
			this.chat.context.on(`changed:${setting}`, this.onChanged, this);
	}

	onDisable() {
		this.chat.removeTokenizer(this.tokenizer);

		for(const setting of [
			'addon.smm2-links.enabled',
			'addon.smm2-links.allow-embed',
			'addon.smm2-links.viewer_link'
		])
			this.chat.context.off(`changed:${setting}`, this.onChanged, this);
	}

	onChanged() {
		this.emit('chat:update-line-tokens');
	}

}

SMM2Links.register();
