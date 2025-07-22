export default async function shrug(event) {
  const message = event?.message?.replace(/^\/shrug\s/, "");
  event.sendMessage(message + " ¯\\_(ツ)_/¯");
}