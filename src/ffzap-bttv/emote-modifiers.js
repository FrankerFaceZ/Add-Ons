function addModifier(token, flag, name) {
	if (!token || token.type !== 'emote') return;

	token.modifier_flags |= flag;
	
	token.modifiers.push({
		set: 'info',
		id: {
			// icon: 'https://betterttv.com/favicon.png',
			label: name,
		}
	});
}

function process(ffz, tokens) {
	if (!tokens || !tokens.length) {
		return tokens;
	}

	const enabled = ffz.chat.context.get('ffzap.betterttv.emote_modifiers');

	const output = [];

	let i = 0;

	let lastToken = false;
	let currentToken = false;
	let nextToken = tokens[i];

	while (nextToken) {
		lastToken = currentToken;
		currentToken = nextToken;
		nextToken = tokens[++i];

		if (currentToken?.type === 'text' && currentToken.text) {
			// Zero-Spacing
			if (currentToken.text === ' z! ' && lastToken?.type === 'emote' && nextToken?.type === 'emote') {
				if (!enabled) {
					currentToken.text = ' ';
					output.push(currentToken);
				}

				lastToken.text += ' ';
				continue;
			}

			// Other modifiers
			const trimmed = currentToken.text.trim();
			const split = trimmed.split(' ');

			for (let w = split.length - 1; w >= 0; w--) {
				const t_trimmed = split[w].trim();

				let invalid = false;

				switch(t_trimmed) {
					case 'w!': {
						// Wide-Boi
						if (enabled) addModifier(nextToken, ffz.chat.emotes.ModifierFlags.GrowX, 'w! (BTTV Wide)');

						split.splice(w, 1);
						break;
					}
					case 'h!': {
						// Flip Horizontal
						if (enabled) addModifier(nextToken, ffz.chat.emotes.ModifierFlags.FlipX, 'h! (BTTV Horizontal Flip)');

						split.splice(w, 1);
						break;
					}
					case 'v!': {
						// Flip Vertical
						if (enabled) addModifier(nextToken, ffz.chat.emotes.ModifierFlags.FlipY, 'v! (BTTV Vertical Flip)');

						split.splice(w, 1);
						break;
					}
					default: {
						invalid = true;
						break;
					}
				}

				if (invalid) break;
			}

			currentToken.text = currentToken.text.replace(trimmed, split.join(' '));
		}

		output.push(currentToken);
	}

	return output;
}

export default { process };