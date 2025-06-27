import { LocalModeManager } from "./local-modes";

export default async function localsub(event, ctx, inst) {
  if (!ctx.localModeManager) {
    ctx.localModeManager = new LocalModeManager(ctx);
  }

  ctx.localModeManager.toggleSubMode(inst);

  const status = ctx.localModeManager.getStatus();
  ctx.log.info(`[Chat Commands - Localsub] Status:`, status);
}