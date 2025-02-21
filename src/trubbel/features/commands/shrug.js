export default async function shrug(context, inst, event) {
  const message = event?.message?.replace(/^\/shrug\s/, "");
  event.sendMessage(message + " ¯\\_(ツ)_/¯");
}