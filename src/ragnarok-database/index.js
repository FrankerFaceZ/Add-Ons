'use strict';

const createElement = FrankerFaceZ.utilities.dom.createElement;
import STYLE_RO from './styles.css';

class RagnarokDatabase extends Addon {
	constructor(...args) {
		super(...args);

		this.inject('chat');
		
		this.rodbCSS = null;
		
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
			changed: (val) => {this.server = val;}
		});
		
		var self = this;
		
		this.messageFilter = {
			type: 'rodb',
			priority: 9,

			render(token, createElement){
				if (!token.rodb)
					return null;
				if(token.rodb != "item"){
					token.type = "link";
					return (<a href={token.url} target="_newFrame">{token.url}</a>);
				}

				var xhr = self.fetchXHR(token.rodb, token.roid, self.server);

				if(xhr == null){
					if(self.server == 'kRO'){
						token.type = "link";
						return (<a href={token.url} target="_newFrame">{token.url}</a>);
					}
					
					else if(self.server == 'iRO'){
						xhr = self.fetchXHR(token.rodb, token.roid, 'kRO');
						if(xhr == null){
							token.type = "link";
							return (<a href={token.url} target="_newFrame">{token.url}</a>);
						}
					}
					
					else{
						xhr = self.fetchXHR(token.rodb, token.roid, 'iRO');
						if(xhr == null){
							xhr = self.fetchXHR(token.rodb, token.roid, 'kRO');
							if(xhr == null){
								token.type = "link";
								return (<a href={token.url} target="_newFrame">{token.url}</a>);
							}
						}
					}
				}
				console.log(xhr);
				
				xhr["description"] = xhr["description"].replaceAll('<script', '&lt;script');	//just to be save
				xhr["description"] = xhr["description"].replaceAll(/(?:\r\n|\r|\n)/g, '<br>');
				xhr["description"] = xhr["description"].replaceAll('^000000', '</font>');
				xhr["description"] = xhr["description"].replaceAll(/\^([0-9a-fA-F]{6})/g, "<font color=\"#$1\">");
 
				return (
					<div class="dp-tooltip dp-tooltip-item">
						<div class="dp-tooltip-head">
							<h3><a href={token.url} target="_newFrame">{xhr["name"]}</a></h3>
						</div>
						<div class="dp-tooltip-body">
							<span class="dp-icon dp-icon-item dp-icon-item-large dp-icon-item-white">
								<span class="icon-item-inner icon-item-default" style={{backgroundImage: 'url(https://static.divine-pride.net/images/items/collection/'+token.roid+'.png)'}}>
								</span>
							</span>
							<div class="dp-item-properties">
								<ul>
									<li><font color="#000000" dangerouslySetInnerHTML={{ __html: xhr["description"] }}></font></li>
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
					if (token.type === 'link' && regex.test(token.text)) {
						var parsed = regex.exec(token.text);
						token.type = 'rodb';
						token.rodb = parsed[1];
						token.roid = parsed[2];
					}
				}
				return tokens;
			}
		}
		
		this.server = this.settings.get('addon.rodb.server');
	}

	onEnable() {
		if(this.rodbCSS == null){
			this.rodb = document.head.appendChild(createElement('link', {
				href: STYLE_RO,
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
		this.chat.removeTokenizer(this.messageFilter);
		this.emit('chat:update-lines');
	}
	
	fetchXHR(from, id, srv){
		var xhr = new XMLHttpRequest();	
		xhr.open("GET", "https://www.divine-pride.net/api/database/"+from+"/" + id + "?apiKey=92f0c44ff2bded0973a905cfc928cd66&server="+srv, false);
		xhr.send(null);
		
		if(xhr.status != 200)
			return null;
		
		var parsed = JSON.parse(xhr.responseText);
		
		if(parsed["status"] != null)
			return null;
		
		return parsed;
	}

}

RagnarokDatabase.register();
