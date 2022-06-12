let num = 0;
let timer, timerMPN;
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

export function addMissingParamNotice() {
  let appender = document.getElementsByClassName("dzmTIk")[0];

  let main_container = document.createElement("section");
  main_container.id = "missingParamNotice";
  appender.appendChild(main_container);

  let top_bar = document.createElement("article");
  top_bar.classList.add("notice-top-bar");
  main_container.appendChild(top_bar);

  let alertIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  alertIcon.setAttribute("width", "30px");
  alertIcon.setAttribute("height", "30px");
  alertIcon.setAttribute("version", "1.1");
  alertIcon.setAttribute("viewBox", "0 0 20 20");
  alertIcon.setAttribute("x", "0px");
  alertIcon.setAttribute("y", "0px");
  alertIcon.classList.add("alertIcon");
  top_bar.appendChild(alertIcon);

  let alertPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  alertPath.setAttribute("d", "M10.954 3.543c-.422-.724-1.486-.724-1.908 0l-6.9 11.844c-.418.719.11 1.613.955 1.613h13.798c.844 0 1.373-.894.955-1.613l-6.9-11.844zM11 15H9v-2h2v2zm0-3H9V7h2v5z");
  alertPath.setAttribute("fill-rule", "evenodd");
  alertPath.setAttribute("clip-rule", "evenodd");
  alertIcon.appendChild(alertPath);

  let alertText = document.createElement("p");
  alertText.innerText = "Missing Parameters";
  top_bar.appendChild(alertText);

  let xBtn = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  xBtn.setAttribute("width", "30px");
  xBtn.setAttribute("height", "30px");
  xBtn.setAttribute("version", "1.1");
  xBtn.setAttribute("viewBox", "0 0 20 20");
  xBtn.setAttribute("x", "0px");
  xBtn.setAttribute("y", "0px");
  xBtn.classList.add("closeMissingParamBtn");
  xBtn.addEventListener("click", destroyMissingParamNotice);
  top_bar.appendChild(xBtn);

  let xBtnPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  xBtnPath.setAttribute("d", "M8.5 10L4 5.5 5.5 4 10 8.5 14.5 4 16 5.5 11.5 10l4.5 4.5-1.5 1.5-4.5-4.5L5.5 16 4 14.5 8.5 10z");
  xBtn.appendChild(xBtnPath);

  let errorMessage = document.createElement("p");
  errorMessage.innerText = "Usage: \"/chant <message>\" - Hype up an exciting moment";
  errorMessage.classList.add("errorMessage");
  main_container.appendChild(errorMessage);

  document.getElementsByClassName("chat-wysiwyg-input__editor")[0].classList.add("yellow-border");

  timerMPN = setTimeout(destroyMissingParamNotice, 30000);
}

export function destroyMissingParamNotice() {
  clearTimeout(timerMPN);
  document.getElementById("missingParamNotice").remove();
  let textbox = document.getElementsByClassName("chat-wysiwyg-input__editor")[0].classList.remove("yellow-border");
}
