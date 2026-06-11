// Elevation drag logic for TokenElevGizmo — extracted to keep gizmo file under line limit.
import { canvasZoom, gridDistance, startPointerDrag } from "../core";
import { clientToGlobal } from "../gizmos";

export interface TokenElevDrag {
  token: Token;
  startGX: number; startGY: number;
  startElev: number;
}

export function beginElevDrag(
  lastCommittedElev: Map<string, number>,
  token: Token, gx: number, gy: number, elev: number,
): void {
  lastCommittedElev.set(token.id ?? '', elev);
  const drag: TokenElevDrag = { token, startGX: gx, startGY: gy, startElev: elev };
  startPointerDrag(drag,
    (d, e) => { const { y } = clientToGlobal(e.clientX, e.clientY); commitElevDrag(lastCommittedElev, d, y); },
    (d, e) => { const { y } = clientToGlobal(e.clientX, e.clientY); pushElevHistory(d); commitElevDrag(lastCommittedElev, d, y); },
  );
}

function pushElevHistory(drag: TokenElevDrag): void {
  const id = drag.token.id;
  if (!id) return;
  const layer = canvas.tokens as unknown as { history: { type: string; data: unknown[]; options: object }[] };
  const original = { _id: id, elevation: drag.startElev };
  layer.history.push({ type: "update", data: [original], options: {} });
  console.debug(`[isoroll] storeDragHistory | type=elevation token=${id} startElev=${drag.startElev}`);
}

function commitElevDrag(lastCommittedElev: Map<string, number>, drag: TokenElevDrag, gy: number): void {
  const zoom      = canvasZoom();
  const gridSize  = canvas.grid?.size ?? 100;
  const gridDist  = gridDistance();
  const deltaFeet = -(gy - drag.startGY) / (zoom * gridSize / gridDist);
  const elev = Math.round(drag.startElev + deltaFeet);
  const id = drag.token.id ?? '';
  if (lastCommittedElev.get(id) === elev) return;
  lastCommittedElev.set(id, elev);
  void (drag.token.document as unknown as { update(d: object, o?: object): Promise<unknown> })
    .update({ elevation: elev }, { animate: false, isUndo: true });
}
