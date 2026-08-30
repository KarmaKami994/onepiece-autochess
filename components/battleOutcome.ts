import {
  DEFAULT_CONTENT,
  getItemDefinition,
  getStageDefinition,
} from "../game/content";
import {
  resolvePersistentFormId,
  resolveUnitDefinition,
} from "../game/forms";
import type {
  BattleUnitSnapshot,
  GameContent,
  MatchBattleResult,
  MatchState,
  PlayerState,
  StarLevel,
  UnitInstance,
} from "../game/types";

export type BattleOutcomeKind = "win" | "loss" | "draw";

export type BattleOutcomeOpponentKind = "player" | "ghost" | "pve";

export interface BattleOutcomeItem {
  id: string;
  name: string;
  icon: string;
}

export interface BattleOutcomeCrewRow {
  unitId: string;
  definitionId: string;
  name: string;
  star: StarLevel;
  starsLabel: string;
  items: BattleOutcomeItem[];
  survived: boolean;
  hp: number;
  maxHp: number;
  hpPercent: number;
  /** Compact copy suitable for an accessible list or a plain-text recap. */
  label: string;
}

export interface BattleOutcomeTraitRow {
  traitId: string;
  name: string;
  count: number;
  tierIndex: number;
  tierLabel: string;
  label: string;
}

export interface BattleOutcomeRecap {
  battleId: string;
  round: number;
  stageId: string;
  playerId: string;
  outcome: BattleOutcomeKind;
  outcomeLabel: "VICTORY" | "DEFEAT" | "DRAW";
  opponentId: string | null;
  opponentName: string;
  opponentKind: BattleOutcomeOpponentKind;
  captainDamage: number;
  humanTeamHpPercent: number;
  opponentTeamHpPercent: number;
  /** Remaining HP of the winning side; null when neither side won. */
  survivorHpPercent: number | null;
  finalCrew: BattleOutcomeCrewRow[];
  activeTraits: BattleOutcomeTraitRow[];
}

export interface BuildBattleOutcomeOptions {
  state: MatchState;
  playerId: string;
  content?: GameContent;
  /** Defaults to the player's entry in state.lastResults. */
  result?: MatchBattleResult;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function oneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function isHumanSnapshot(
  snapshot: BattleUnitSnapshot,
  playerId: string,
): boolean {
  return (
    snapshot.teamId === playerId ||
    snapshot.id.startsWith(`${playerId}:`)
  );
}

function teamHpPercent(
  snapshots: readonly BattleUnitSnapshot[],
  includes: (snapshot: BattleUnitSnapshot) => boolean,
): number {
  const team = snapshots.filter(includes);
  const maximum = team.reduce(
    (sum, snapshot) => sum + Math.max(1, snapshot.maxHp),
    0,
  );
  if (maximum <= 0) {
    return 0;
  }
  const remaining = team.reduce(
    (sum, snapshot) =>
      sum + clamp(snapshot.hp, 0, Math.max(1, snapshot.maxHp)),
    0,
  );
  return oneDecimal((remaining / maximum) * 100);
}

function battleInstanceId(battleUnitId: string, playerId: string): string {
  const prefix = `${playerId}:`;
  return battleUnitId.startsWith(prefix)
    ? battleUnitId.slice(prefix.length)
    : battleUnitId;
}

function playerInstances(player: PlayerState): Map<string, UnitInstance> {
  return new Map(
    [...Object.values(player.units), ...player.finalCrew].map((instance) => [
      instance.id,
      instance,
    ]),
  );
}

function crewRows(
  player: PlayerState,
  playerId: string,
  result: MatchBattleResult,
  content: GameContent,
): BattleOutcomeCrewRow[] {
  const finalSnapshots = result.finalUnits.filter((snapshot) =>
    isHumanSnapshot(snapshot, playerId),
  );
  const snapshots =
    finalSnapshots.length > 0
      ? finalSnapshots
      : result.initialUnits.filter((snapshot) =>
          isHumanSnapshot(snapshot, playerId),
        );
  const instances = playerInstances(player);

  return snapshots
    .map((snapshot) => {
      const instanceId = battleInstanceId(snapshot.id, playerId);
      const instance = instances.get(instanceId);
      const definition = resolveUnitDefinition(
        snapshot.definitionId,
        snapshot.formId,
        content,
      );
      const name = definition?.name ?? snapshot.definitionId;
      const star = snapshot.star;
      const items = (instance?.items ?? []).map((itemId) => {
        const item = getItemDefinition(itemId, content);
        return {
          id: itemId,
          name: item?.name ?? itemId,
          icon: item?.icon ?? "",
        };
      });
      const maxHp = Math.max(1, snapshot.maxHp);
      const hp = clamp(snapshot.hp, 0, maxHp);
      const hpPercent = oneDecimal((hp / maxHp) * 100);
      const survived = snapshot.state !== "dead" && hp > 0;
      const itemCopy = items.length
        ? ` · ${items.map((item) => item.name).join(", ")}`
        : "";
      return {
        row: {
          unitId: snapshot.id,
          definitionId: snapshot.definitionId,
          name,
          star,
          starsLabel: "★".repeat(star),
          items,
          survived,
          hp,
          maxHp,
          hpPercent,
          label: `${name} ${"★".repeat(star)} · ${
            survived ? `${hpPercent}% HP` : "Defeated"
          }${itemCopy}`,
        } satisfies BattleOutcomeCrewRow,
        acquiredOrder: instance?.acquiredOrder ?? Number.MAX_SAFE_INTEGER,
      };
    })
    .sort(
      (left, right) =>
        left.acquiredOrder - right.acquiredOrder ||
        left.row.name.localeCompare(right.row.name) ||
        left.row.unitId.localeCompare(right.row.unitId),
    )
    .map(({ row }) => row);
}

function activeTraitRows(
  player: PlayerState,
  playerId: string,
  result: MatchBattleResult,
  content: GameContent,
): BattleOutcomeTraitRow[] {
  const contributorsByTrait = new Map<string, Set<string>>();
  const addDefinition = (
    definitionId: string,
    formId: string | undefined,
  ): void => {
    const definition = resolveUnitDefinition(definitionId, formId, content);
    for (const traitId of definition?.traits ?? []) {
      const contributors = contributorsByTrait.get(traitId) ?? new Set<string>();
      contributors.add(definitionId);
      contributorsByTrait.set(traitId, contributors);
    }
  };
  const snapshots = result.initialUnits.filter((snapshot) =>
    isHumanSnapshot(snapshot, playerId),
  );
  for (const snapshot of snapshots) {
    addDefinition(snapshot.definitionId, snapshot.formId);
  }

  if (snapshots.length === 0) {
    for (const unitId of Object.values(player.board)) {
      const instance = player.units[unitId];
      if (instance) {
        addDefinition(
          instance.definitionId,
          resolvePersistentFormId(instance, content) ?? undefined,
        );
      }
    }
  }

  return content.traits.flatMap((trait) => {
    const count = contributorsByTrait.get(trait.id)?.size ?? 0;
    let tierIndex = -1;
    trait.tiers.forEach((tier, index) => {
      if (count >= tier.required) {
        tierIndex = index;
      }
    });
    if (tierIndex < 0) {
      return [];
    }
    const tier = trait.tiers[tierIndex];
    return [
      {
        traitId: trait.id,
        name: trait.name,
        count,
        tierIndex,
        tierLabel: tier.label,
        label: `${trait.name} ${count} · ${tier.label}`,
      },
    ];
  });
}

function inferOutcome(
  result: MatchBattleResult,
  playerId: string,
  captainDamage: number,
): BattleOutcomeKind {
  if (result.winnerId === playerId) {
    return "win";
  }
  if (result.winnerId !== null || captainDamage > 0) {
    return "loss";
  }
  return "draw";
}

function outcomeLabel(
  outcome: BattleOutcomeKind,
): BattleOutcomeRecap["outcomeLabel"] {
  return outcome === "win"
    ? "VICTORY"
    : outcome === "loss"
      ? "DEFEAT"
      : "DRAW";
}

export function buildBattleOutcome({
  state,
  playerId,
  content = DEFAULT_CONTENT,
  result: suppliedResult,
}: BuildBattleOutcomeOptions): BattleOutcomeRecap | null {
  const player = state.players.find((candidate) => candidate.id === playerId);
  const result =
    suppliedResult ??
    state.lastResults.find(
      (candidate) =>
        candidate.playerAId === playerId || candidate.playerBId === playerId,
    );
  if (!player || !result) {
    return null;
  }

  const playerIsA = result.playerAId === playerId;
  const playerIsB = result.playerBId === playerId;
  if (!playerIsA && !playerIsB) {
    return null;
  }

  const captainDamage = Math.max(
    0,
    Math.round(playerIsA ? result.playerADamage : result.playerBDamage),
  );
  const outcome = inferOutcome(result, playerId, captainDamage);
  const finalSnapshots =
    result.finalUnits.length > 0 ? result.finalUnits : result.initialUnits;
  const humanTeamHpPercent = teamHpPercent(finalSnapshots, (snapshot) =>
    isHumanSnapshot(snapshot, playerId),
  );
  const opponentTeamHpPercent = teamHpPercent(
    finalSnapshots,
    (snapshot) => !isHumanSnapshot(snapshot, playerId),
  );

  const directOpponentId = playerIsA
    ? result.playerBId
    : result.playerAId;
  const ghostOpponentId = playerIsA ? result.ghostOfPlayerId : null;
  const isPve = directOpponentId === null && ghostOpponentId === null;
  const opponentKind: BattleOutcomeOpponentKind = isPve
    ? "pve"
    : ghostOpponentId
      ? "ghost"
      : "player";
  const opponentId = isPve
    ? finalSnapshots.find(
        (snapshot) => !isHumanSnapshot(snapshot, playerId),
      )?.teamId ?? null
    : ghostOpponentId ?? directOpponentId;
  const opponentPlayer = opponentId
    ? state.players.find((candidate) => candidate.id === opponentId)
    : null;
  const stage = getStageDefinition(state.round, content);
  const opponentName = isPve
    ? stage.name
    : ghostOpponentId
      ? `${opponentPlayer?.name ?? ghostOpponentId}'s Ghost`
      : opponentPlayer?.name ?? opponentId ?? "Unknown Rival";

  return {
    battleId: `${state.round}:${result.playerAId}:${
      result.playerBId ?? result.ghostOfPlayerId ?? stage.id
    }`,
    round: state.round,
    stageId: state.stageId,
    playerId,
    outcome,
    outcomeLabel: outcomeLabel(outcome),
    opponentId,
    opponentName,
    opponentKind,
    captainDamage,
    humanTeamHpPercent,
    opponentTeamHpPercent,
    survivorHpPercent:
      outcome === "win"
        ? humanTeamHpPercent
        : outcome === "loss"
          ? opponentTeamHpPercent
          : null,
    finalCrew: crewRows(player, playerId, result, content),
    activeTraits: activeTraitRows(player, playerId, result, content),
  };
}
