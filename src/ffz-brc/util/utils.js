export const getMousePos = event => ({
	x: event.pageX ? event.pageX : event.clientX + (document.documentElement.scrollLeft ?
		document.documentElement.scrollLeft : document.body.scrollLeft),
	y: event.pageY ? event.pageY : event.clientY + (document.documentElement.scrollTop ?
		document.documentElement.scrollTop : document.body.scrollTop)
});


export const getParentClassNames = (element, parentCount, itr = 0) =>
	itr < parentCount ? [element.className] + getParentClassNames(element.parentElement, parentCount, ++itr) :
		[element.className];


export const sendMessage = (brc, message) => brc.chat.ChatService.first.sendMessage(message);


export const isMod = brc => brc.chat.ChatContainer.first.props.isCurrentUserModerator;
