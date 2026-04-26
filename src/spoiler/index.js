class SpoilerHider extends Addon {
	constructor(...args) {
		super(...args);

		this.inject('chat');
		this.inject('site');
		this.tag = "||";

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
						"transition": "all 0.2s ease",
					}} onClick={
					() => {
						token.revealed = !token.revealed;
						// FIXME: is there anyways to render clicks in replies by messageId?
						// outerThis.emit("chat:update-line", token.message.id, false);
						outerThis.emit("chat:rerender-lines");
					}
				}>{token.revealed ? this.renderTokens(token.children, createElement) : '×××'}</span>)
			},

			process(tokens, msg) {
				// FIXME: Is there a better way of doing this? I don't think modifying msg object here is valid
				// This is meant to prevent Twitch by showing the message, this overrides message body.
				if (msg.reply)
				{
					const replyText = msg.reply.parentMessageBody;
					
					if (replyText.indexOf(outerThis.tag) !== -1)
					{
						msg.reply.parentMessageBody = "(spoiler)";
					}
				}
				
				const tokenized = [];
				
				for (const token of tokens)
				{
					if (token.type === 'text')
					{
						let i = 0;
						let j = 0;
						while ((j = token.text.indexOf(outerThis.tag, i)) !== -1)
						{	
							tokenized.push({type: 'text', text: token.text.slice(i, j)});
							tokenized.push({type: 'text', text: outerThis.tag, tag: true});
							
							i = j + outerThis.tag.length;
						}
						
						tokenized.push({type: 'text', text: token.text.slice(i)});
					}
					else
					{
						tokenized.push(token);
					}
				}

				const stack = [{
					type: 'root', children: []
				}];
				
				for (const token of tokenized)
				{
					const current = stack[stack.length - 1];
					
					if (token.tag)
					{
						if (current.type !== 'spoiler_hidden') {
							const node = {
								type: "spoiler_hidden",
								children: [],
								message: msg,
								revealed: false
							}
							
							current.children.push(node);
							stack.push(node);
						} else {
						    stack.pop();
						}
					}
					else {
						current.children.push(token);
					}
				}

				return stack[0].children;
			}
		}
	}

	async onLoad() {

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
