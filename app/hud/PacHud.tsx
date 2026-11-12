"use client";

// PAC HUD JSX/CSS adapted from keldaanCommunity/pokemonAutoChess@9ab1e9a.
// Upstream portions: GPL-3.0; source mapping/licence in third_party/pac-hud/.
import type { ReactNode } from "react";
import Image from "next/image";
import { HudTooltip } from "../../components/HudTooltip";
import { VisualIcon } from "../../components/VisualIcon";
import type { BoardUnit } from "../../components/PhaserBoard";
import type { ChoiceView, ShopUnitView, TraitView } from "../selectors";

export function ItemDetail({ item, itemsById, combinations = true }: { item: ChoiceView; itemsById: Map<string, ChoiceView>; combinations?: boolean }) {
  const inspect = (id: string, name: string) => {
    const other = itemsById.get(id); if (!other) return <span>{name}</span>;
    return <HudTooltip nested label={`Recipe: ${other.name} details`} content={<ItemDetail item={other} itemsById={itemsById} combinations={false} />}>
      <button type="button" className="recipe-inspect" aria-label={`Inspect ${other.name}`}><VisualIcon imagePath={other.imagePath} fallback={other.icon} /></button>
    </HudTooltip>;
  };
  return <div className="game-item-detail">
    <VisualIcon className="game-item-detail-icon" imagePath={item.imagePath} fallback={item.icon} />
    <div className="game-item-detail-name">{item.recipeComponents && <div className="game-item-recipe">{item.recipeComponents.map((part, i) => <span key={`${part.id}-${i}`}>{i > 0 && " + "}{inspect(part.id, part.name)}</span>)}</div>}<strong>{item.name}</strong></div>
    <div className="game-item-detail-stats"><i>{item.kind === "component" ? "Component" : "Completed item"}</i>{item.effects.map(effect => <span key={`${effect.kind}-${effect.value}`}>{effect.label}</span>)}{item.grantedTrait && <span>Grants {item.grantedTrait.name}</span>}</div>
    <p className="game-item-detail-description">{item.description}</p>
    {combinations && !!item.recipeResults?.length && <div className="game-item-detail-combinations" aria-label="Item combinations">{item.recipeResults.map(recipe => <div className="game-item-detail-combination" key={recipe.componentId}><span>+</span>{inspect(recipe.componentId, recipe.componentName)}<span>=</span>{inspect(recipe.resultId, recipe.resultName)}</div>)}</div>}
  </div>;
}

export function ItemTooltip({ item, itemsById, children, focusable = false, side = "right" }: { item: ChoiceView; itemsById: Map<string, ChoiceView>; children: ReactNode; focusable?: boolean; side?: "left" | "right" | "top" }) {
  return <HudTooltip label={`${item.name} details`} content={<ItemDetail item={item} itemsById={itemsById} />} focusable={focusable} side={side}>{children}</HudTooltip>;
}

/** Presentation membership only; activation/counts remain authoritative selectors. */
export function matchingTraitUnits(traitId: string, units: readonly BoardUnit[], definitions: Map<string, ShopUnitView>, items: Map<string, ChoiceView>): BoardUnit[] {
  return units.filter(unit => unit.team === "player" && (definitions.get(unit.id)?.traits.includes(traitId) || unit.items.some(id => items.get(id)?.grantedTrait?.id === traitId)));
}

function TraitDetail({ trait, matching }: { trait: TraitView; matching: readonly BoardUnit[] }) {
  const owned = new Set(matching.map(unit => unit.contentId));
  return <div className="pac-synergy-detail"><h3><VisualIcon imagePath={trait.imagePath} fallback={trait.icon} />{trait.name} <small>{trait.count}</small></h3><p>{trait.description}</p>
    {trait.thresholds.map((tier, i) => <section key={tier.required} aria-label={`${tier.required}: ${tier.label}`} className={i + 1 === trait.tier ? "current-tier" : ""}><h4>({tier.required}) {tier.scope}</h4><p>{tier.effects.join(" ") || tier.label}</p></section>)}
    <div className="synergy-members" aria-label={`${trait.name} crew`}>{trait.members.map(unit => <span key={unit.id} className={owned.has(unit.id) ? "acquired" : ""} title={`${unit.name} · ${unit.cost} gold${owned.has(unit.id) ? " · owned" : ""}`}><Image src={unit.portrait} alt={unit.name} width={40} height={40} unoptimized /><small>{unit.name}</small></span>)}</div>
    <p className="detail-note">{trait.semanticDescription} Distinct deployed evolution lines count; reserve portraits do not add to the active count.</p>
    {matching.some(unit => !trait.members.some(member => member.id === unit.contentId)) && <p>Additional holders from equipment: {matching.filter(unit => !trait.members.some(member => member.id === unit.contentId)).map(unit => unit.name).join(", ")}.</p>}
  </div>;
}

export function PacTraits({ traits, units, definitions, itemsById, onHighlight }: { traits: TraitView[]; units: BoardUnit[]; definitions: Map<string, ShopUnitView>; itemsById: Map<string, ChoiceView>; onHighlight: (traitId: string, ids: string[] | null) => void }) {
  return <aside className="side-panel traits-panel" aria-label="Active crew traits"><div className="side-heading"><span>SYNERGIES</span><small>{traits.filter(trait => trait.tier > 0).length} ACTIVE</small></div><div className="trait-list">
    {traits.filter(trait => trait.count > 0).map(trait => {
      const matching = matchingTraitUnits(trait.id, units, definitions, itemsById);
      return <HudTooltip key={trait.id} label={`${trait.name} synergy details`} focusable content={<TraitDetail trait={trait} matching={matching} />} onOpenChange={open => onHighlight(trait.id, open ? matching.map(unit => unit.id) : null)}>
        <span className={`trait-row ${trait.tier > 0 ? "active" : ""}`} aria-label={trait.semanticDescription}>
          <VisualIcon className="trait-icon" imagePath={trait.imagePath} fallback={trait.icon} /><strong className="trait-count">{trait.count}</strong>
          <span className="trait-copy"><span className="trait-thresholds">{trait.thresholds.map((tier, i) => <span key={tier.required} className={i + 1 === trait.tier ? "current" : i < trait.tier ? "reached" : ""}>{tier.required}</span>)}</span><span>{trait.name}</span></span>
        </span>
      </HudTooltip>;
    })}
    {!traits.length && <p className="pac-empty">Field crew to build synergies.</p>}
  </div></aside>;
}
