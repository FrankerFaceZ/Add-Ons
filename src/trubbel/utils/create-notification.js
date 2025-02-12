const { createElement } = FrankerFaceZ.utilities.dom;

export function showNotification(icon = "", message, timeout = 6000) {
  // Create notification element
  const notification = createElement("div", {
    className: "dynamic-notification",
    style: `
    position: fixed;
    bottom: 20px;
    left: 20px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 16px;
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 8px;
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.3s ease, transform 0.3s ease;
  `
  });

  // Stack notifications vertically
  const existingNotifications = document.getElementsByClassName("dynamic-notification");
  if (existingNotifications.length > 0) {
    const offset = existingNotifications.length * 50; // Adjust spacing as needed
    notification.style.bottom = `${20 + offset}px`;
  }

  if (icon) {
    const iconElement = createElement("div", {
      textContent: icon,
      style: "font-size: 16px;"
    });
    notification.appendChild(iconElement);
  }

  const text = createElement("span", {
    textContent: message,
    style: "font-size: 16px;"
  });
  notification.appendChild(text);
  document.body.appendChild(notification);

  requestAnimationFrame(() => {
    notification.style.opacity = "1";
    notification.style.transform = "translateY(0)";
  });

  setTimeout(() => {
    notification.style.opacity = "0";
    notification.style.transform = "translateY(20px)";
    setTimeout(() => {
      notification.remove();
      // Reposition remaining notifications
      const remainingNotifications = document.getElementsByClassName("dynamic-notification");
      Array.from(remainingNotifications).forEach((notif, index) => {
        notif.style.bottom = `${20 + (index * 50)}px`;
      });
    }, 300);
  }, timeout);
}
// These can all exist simultaneously
// showNotification("🔄", "Loading data...", 3000);
// showNotification("✅", "Data saved successfully!", 3000);
// showNotification("⚠️", "Warning: Connection slow", 5000);