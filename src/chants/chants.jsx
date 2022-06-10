let num = 0;
let timer;
let tCurrent = 0;

export function chantCooldown() {
  let progress = document.getElementById("chant_progress");
  num = 100;
  tCurrent = Date.now() + 25000;

  timer = setTimeout(function() { IncrementBar() },24);
}

export function IncrementBar ()
{
  let progress = document.getElementById("chant_progress");
  if(num.toFixed(2) <= 0.1) {
	removeChantButton();
	return;
  }
  let tNow = Date.now();
  let iDifference = tCurrent - tNow;
  let iDelay = iDifference / (num*10);
  iDelay = Math.floor(iDelay)
  timer = setTimeout(function() { IncrementBar() },iDelay);
  progress.style.width = num + "%";
  num -= 0.1;
}


export function removeChantButton() {
  document.getElementById("chant_popup").remove();
}

export function addChantButton( callback, username, message, channel) {
  let container = document.createElement("section");
  container.id = "chant_popup";

  let title = document.createElement("h4");
  title.innerText = username + " started a chant";
  container.appendChild(title);

  let xButtonSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  xButtonSvg.id = "chant_close_button";
  xButtonSvg.setAttribute("version", "1.1");
  xButtonSvg.setAttribute("viewBox", "0 0 20 20");
  xButtonSvg.setAttribute("x", "0px");
  xButtonSvg.setAttribute("y", "0px");
  xButtonSvg.addEventListener("click", function() {
	clearTimeout(timer);
    removeChantButton();
  });
  container.appendChild(xButtonSvg);

  let xButtonPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  xButtonPath.setAttribute("d", "M8.5 10L4 5.5 5.5 4 10 8.5 14.5 4 16 5.5 11.5 10l4.5 4.5-1.5 1.5-4.5-4.5L5.5 16 4 14.5 8.5 10z");
  xButtonSvg.appendChild(xButtonPath);

  let messageParagraph = document.createElement("p");
  messageParagraph.id = "chant_message";
  messageParagraph.innerText = message;
  container.appendChild(messageParagraph);

  let chantButton = document.createElement("button");
  chantButton.id = "chant_button";
  chantButton.type = "button";
  chantButton.name = "button";
  chantButton.innerText = "Chant";
  chantButton.addEventListener("click", function() {
	clearTimeout(timer);
    removeChantButton();
	callback.resolve('site.chat').sendMessage(channel, message);
  });
  container.appendChild(chantButton);

  let barContainer = document.createElement("span");
  barContainer.id = "chant_progressbar";
  container.appendChild(barContainer);

  let barProgress = document.createElement("span");
  barProgress.id = "chant_progress";
  barContainer.appendChild(barProgress);

  return container
}