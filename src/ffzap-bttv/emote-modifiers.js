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

		if (currentToken?.type === 'text' && currentToken.text && nextToken?.type === 'emote') {
			const trimmed = currentToken.text.trim();
			const split = trimmed.split(' ');
			let zeroWidth = false;

			for (let w = split.length - 1; w >= 0; w--) {
				const t_trimmed = split[w].trim();

				let invalid = false;

				switch(t_trimmed) {
					// Zero-Spacing
					case 'z!': {
						zeroWidth = true;

						split.splice(w, 1);
						break;
					}
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

			if (enabled && zeroWidth && lastToken) {
				lastToken.text += ' ';
				continue;
			}
		}

		output.push(currentToken);
	}

	return output;
}

export default { process };