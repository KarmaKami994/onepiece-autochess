import type { BoardUnit } from "../components/PhaserBoard";
import Image from "next/image";
import type { GalleyView } from "./selectors";

export function GalleyTray({ galley, units, selected, planning, onSelect, onServe }: {
  galley: GalleyView; units: BoardUnit[]; selected?: BoardUnit; planning: boolean;
  onSelect: (id: string | null) => void; onServe: (foodId: string) => void;
}) {
  if (!galley.stock.length && !galley.meal) return null;
  const targets = units.filter(unit => unit.team === "player" && unit.zone === "board");
  const reason = !planning ? "Meals can be served during preparation." : galley.meal ? "One meal has already been served for this battle." :
    !selected || !targets.some(unit => unit.id === selected.id) ? "Choose a deployed crew member first." : null;
  return <section className="galley-tray" aria-label="Ship's galley">
    <h3>SHIP'S GALLEY <small>{galley.stock.reduce((n, food) => n + food.count, 0)}/{galley.capacity}</small></h3>
    <p>One meal per preparation. Consumed now; effect lasts the next battle only. Food uses no equipment slot.</p>
    {galley.meal && <p role="status">Served: {galley.meal.name} → {galley.meal.target}.</p>}
    {galley.stock.length > 0 && <>
      <label>Meal recipient<select aria-label="Meal recipient" disabled={!planning || !!galley.meal} value={targets.some(unit => unit.id === selected?.id) ? selected?.id : ""}
        onChange={event => onSelect(event.target.value || null)}><option value="">Choose deployed crew</option>
        {targets.map(unit => <option key={unit.id} value={unit.id}>{unit.name} · {unit.star}★</option>)}</select></label>
      <div className="galley-stock">{galley.stock.map(food => <button type="button" key={food.id} disabled={!!reason} title={reason ?? `Serve ${food.name} to ${selected?.name}`}
        aria-label={`Serve ${food.name} (${food.count} portions)`} onClick={() => onServe(food.id)}>
        <Image src={food.imagePath} alt="" width={40} height={40} unoptimized /><strong>{food.name} ×{food.count}</strong><span>{food.description}</span></button>)}</div>
      <p>{reason ?? `Ready to serve ${selected?.name}.`}</p>
    </>}
    <p>Selling, benching or merging away the recipient before combat forfeits the portion. No refund.</p>
  </section>;
}
