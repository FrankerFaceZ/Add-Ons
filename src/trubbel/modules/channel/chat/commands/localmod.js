import { LocalModeManager } from "./local-modes";

export default async function localmod(event, ctx, inst) {
  if (!ctx.localModeManager) {
    ctx.localModeManager = new LocalModeManager(ctx);
  }

  ctx.localModeManager.toggleModMode(inst);

  const status = ctx.localModeManager.getStatus();
  ctx.log.info(`[Chat Commands - Localmod] Status:`, status);
}