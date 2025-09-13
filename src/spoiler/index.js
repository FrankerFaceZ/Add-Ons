// Add-Ons should contain a class that extends Addon.
class SpoilerHider extends Addon {
	constructor(...args) {
		super(...args);

		this.inject('chat');
		this.inject('site');

		const outerThis = this;

		this.messageFilter = {
			type: 'spoiler_hidden',
			priority: 9,

			render(token, createElement) {
				return (<span 
					style={{
						"background-color": token.revealed ? "var(--color-background-button-text-hover)" : "var(--color-background-alt)",
						"borderRadius": "var(--border-radius-medium)",
						"cursor": "pointer",
						"display": "inline-block",
					}} onClick={
					() => {
						token.revealed = !token.revealed;
						console.log('Token onClick reveal: ', token)

						// FIXME: is there anyways to render clicks in replies by messageId?
						//outerThis.emit("chat:update-line", token.message.id, false);
						outerThis.emit("chat:rerender-lines");
					}
				}>{token.revealed ? this.renderTokens(token.data, createElement) : '×××'}</span>)
			},

			process(tokens, msg) {
				let i = 0;

				// Is there a better way of doing this?
				// To prevent Twitch interface by showing spoiler, this overrides message body. 
				if (msg.reply)
				{
					const replyText = msg.reply.parentMessageBody;

					const [_, startPos] = outerThis.findSpoilerTag([{type: "text", text: replyText}]);
					if (startPos != null)
					{
						msg.reply.parentMessageBody = "(spoiler)";
					}
				}

				if (msg.messageBody)
				{
					const [_, startPos] = outerThis.findSpoilerTag([{type: "text", text: msg.messageBody}]);
					if (startPos != null)
					{
						msg.messageBody = "(spoiler)";
					}
				}
				
				while (i < tokens.length)
				{
					// first find start of spoiler tag
					const [startIndex, startPos] = outerThis.findSpoilerTag(tokens);
					if (startPos == null)
						break;

					const token = tokens[startIndex];

					const visibleText = token.text.substring(0, startPos);
					const spoilerText = token.text.substring(startPos + 2);
					const newTokens = [
						{ type: 'text', text: visibleText },
					];

					const afterTokens = 
					[
						{type: 'text', text: spoilerText},
						...tokens.slice(startIndex + 1)
					]

					const [endIndex, endPos] = outerThis.findSpoilerTag(afterTokens);

					const spoilerToken = {
						type: 'spoiler_hidden',
						revealed: false,
						message: msg,
						data: afterTokens.slice(0, endIndex)
					};

					newTokens.push(spoilerToken)

					if (endPos != null)
					{
						// found a closing tag
						const endToken = afterTokens[endIndex];

						const beforeEnd = endToken.text.substring(0, endPos);
						const afterEnd = endToken.text.substring(endPos + 2);

						if (beforeEnd)
						{
							spoilerToken.data.push(
								{type: 'text', text: beforeEnd}
							);
						}
						
						if (afterEnd) newTokens.push({ type: 'text', text: afterEnd });
					}

					// Replace tokens
            		tokens.splice(i, endIndex + 1, ...newTokens);
            		i += newTokens.length - 1; // process the text token again for another spoiler  
				}
				return tokens;
			}
		}
	}

	findSpoilerTag(tokens)
	{
		let i = 0;

		while (i < tokens.length)
		{
			const token = tokens[i];

			if (token.type === 'text')
			{
				const spoiler_tag = "||";
				const spoiler_pos = token.text.indexOf(spoiler_tag);
				if (spoiler_pos >= 0)
					return [i, spoiler_pos];	
			}
			i++;
		}
		return [i, null]
	}

	// onLoad is called when the module is being loaded, prior to
	// being enabled. If this method returns a Promise, FFZ will
	// wait for the promise to resolve before considering the
	// module as loaded.
	async onLoad() {
		// We don't actually need to do anything here, but if
		// we did, we'd already have guaranteed access to the
		// metadata module because of the earlier "load_requires"
	}

	onEnable() {
		this.chat.addTokenizer(this.messageFilter);
	}

	onDisable() {
		this.chat.removeTokenizer(this.messageFilter);
	}

	async onUnload() {
		/* no-op */
	}
}

SpoilerHider.register();
