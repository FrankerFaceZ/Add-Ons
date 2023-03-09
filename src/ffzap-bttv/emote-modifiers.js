function process(ffz, tokens) {
	if (!tokens || !tokens.length) {
		return tokens;
	}

	const enabled = ffz.chat.context.get('ffzap.betterttv.emote_modifiers');

	let output = [];
	const removeTokens = [];

	let flags = 0;
	
	for (let i = 0, l = tokens.length; i < l; i++) {
		const currentToken = tokens[i];
		
		const lastToken = i - 1 >= 0 ? tokens[i - 1] : null;
		const nextToken = i + 1 < l ? tokens[i + 1] : null;

		// Zero-Spacing
		if (currentToken.type === 'text' && currentToken.text === ' z! ') {
			if (!enabled || (lastToken?.type === 'emote' && nextToken?.type === 'emote')) {
				continue;
			}
		}

		if (lastToken?.type === 'text') {
			const trimmed = lastToken?.text?.trim();
			const split = trimmed.split(' ');

			let invalid = false;
			let remove = false;

			for (const t of split) {
				const t_trimmed = t.trim();

				switch(t_trimmed) {
					case 'w!': {
						// Wide-Boi
						flags |= ffz.chat.emotes.ModifierFlags.GrowX;
						break;
					}
					case 'h!': {
						// Flip Horizontal
						flags |= ffz.chat.emotes.ModifierFlags.FlipX;
						break;
					}
					case 'v!': {
						// Flip Vertical
						flags |= ffz.chat.emotes.ModifierFlags.FlipY;
						break;
					}
					default: {
						invalid = true;
						break;
					}
				}
			}

			if (invalid) {
				flags = 0;
			}
			else {
				if (currentToken?.type === 'emote') {
					if (enabled) currentToken.modifier_flags |= flags;

					flags = 0;
					remove = true;
				}
	
				if (remove) removeTokens.push(lastToken);
			}
		}

		output.push(currentToken);
	}

	output = output.filter(token => !removeTokens.includes(token));

	return output;
}

export default { process };