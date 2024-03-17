'use strict';

const createElement = FrankerFaceZ.utilities.dom.createElement;
const sanitize = FrankerFaceZ.utilities.dom.sanitize;

import STYLE_RO from './styles.css';

class RagnarokDatabase extends Addon {
	constructor(...args) {
		super(...args);

		this.inject('chat');				
		this.settings.add('addon.rodb.server',{
			default: 'iRO',
			ui: {
					path: 		'Add-Ons > Ragnarok Database >> Server',
					title: 		'Default Server',
					description:'Choose your default server where data should be displayed from. If the item doesn\'t exit on your server it will try iRO next and finally kRO.',
					component: 	'setting-select-box',
					multiple:	false,
					data: 		[
									{ value: 'aRO', 	title: 'aRO' },
									{ value: 'bRO', 	title: 'bRO' },
									{ value: 'fRO', 	title: 'fRO' },
									{ value: 'idRO', 	title: 'idRO' },
									{ value: 'iRO', 	title: 'iRO' },
									{ value: 'jRO', 	title: 'jRO' },
									{ value: 'kROM', 	title: 'kROM' },
									{ value: 'kROZ', 	title: 'kROZ' },
									{ value: 'kROZS', 	title: 'kROZS' },
									{ value: 'GGH', 	title: 'GGH' },
									{ value: 'ropEU', 	title: 'ropEU' },
									{ value: 'ropRU', 	title: 'ropRU' },
									{ value: 'thROG', 	title: 'thROG' },
									{ value: 'twRO', 	title: 'twRO' },
									{ value: 'cRO', 	title: 'cRO' },
									{ value: 'iROC', 	title: 'iROC' }
								]
			},
			changed: (val) => {
					this.server = val;
					this.emit('chat:update-lines');
				}
		});
		
		var self = this;

		this.messageFilter = {
			type: 'rodb',
			priority: 9,

			render(token, createElement){
				return (
					<div class="dp-tooltip dp-tooltip-item">
						<div class="dp-tooltip-head">
							<h3><a href={token.url} target="_newFrame">{token.roname} ({token.roserver})</a></h3>
						</div>
						<div class="dp-tooltip-body">
							<span class="dp-icon dp-icon-item dp-icon-item-large dp-icon-item-white">
								<span class="icon-item-inner icon-item-default" style={{backgroundImage: 'url(https://static.divine-pride.net/images/items/collection/'+token.roid+'.png)'}}>
								</span>
							</span>
							<div class="dp-item-properties">
								<ul>
									<li><font color="#000000" dangerouslySetInnerHTML={{ __html: token.description }}></font></li>
								</ul>
								<span class="clear"></span>
							</div>
						</div>
						<div class="dp-tooltip-foot"></div>
					</div>);
			},
			
			process(tokens, msg) {
				var regex = /.*divine-pride.net\/database\/([a-z]+)\/([0-9]+).*/;
				for(const token of tokens) {
					if (token.type == 'link' && regex.test(token.text)) {
						var parsed = regex.exec(token.text);
						self.fetchXHR(parsed[1], parsed[2], self.server, token, msg);
					}
				}
				return tokens;
			}
		}
		
		this.rodbCSS = null;
		this.server = this.settings.get('addon.rodb.server');
	}

	onEnable() {
		if(this.rodbCSS == null){
			this.rodbCSS = document.head.appendChild(createElement('link', {
				href: STYLE_RO,
				id: 'rodb-css',
				rel: 'stylesheet',
				type: 'text/css',
				crossOrigin: 'anonymous'
			}));
		}
		
		this.log.info('Enabling support for divine-pride links.');
		this.chat.addTokenizer(this.messageFilter);
		this.emit('chat:update-lines');
	}

	onDisable() {
		if(this.rodbCSS != null){
			document.getElementById("rodb-css").remove();
			this.rodbCSS = null;
		}
		this.chat.removeTokenizer(this.messageFilter);
		this.emit('chat:update-lines');
	}
	
	async fetchXHR(from, id, server, token, message){
		var xhr = new XMLHttpRequest();	
		xhr.open("GET", "https://www.divine-pride.net/api/database/"+from+"/" + id + "?apiKey=92f0c44ff2bded0973a905cfc928cd66&server="+server, true);
		
		xhr.onreadystatechange = () => {
			if (xhr.readyState === XMLHttpRequest.DONE) {
				const status = xhr.status;
				if (status === 0 || (status >= 200 && status < 400)) {
					var parsed = JSON.parse(xhr.responseText);					
					if(parsed["status"] != null)
						return;
					
					parsed["description"] = parsed["description"].replaceAll(/<a href.*?>/g, '');
					parsed["description"] = parsed["description"].replaceAll('</a>', '');
					parsed["description"] = sanitize(parsed["description"]);
					parsed["description"] = parsed["description"].replaceAll(/(?:\r\n|\r|\n)/g, '<br>');
					parsed["description"] = parsed["description"].replaceAll('^000000', '</font>');
					parsed["description"] = parsed["description"].replaceAll(/\^([0-9a-fA-F]{6})/g, "<font color=\"#$1\">");
					
					token.type = "rodb";
					token.roname = parsed["name"];
					token.description = parsed["description"];
					token.roid = id;
					token.roserver = server;
					
					this.emit("chat:update-line", message.id, false);
					
				} else {
					if(server == "kRO")
						return
					if(server == "iRO"){
						this.fetchXHR(from, id, "kRO", token, message);
						return;
					}
					this.fetchXHR(from, id, "iRO", token, message);					
				}
			}
		};		
		xhr.send();
	}
}

RagnarokDatabase.register();
