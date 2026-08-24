export type StarLevel = 1 | 2 | 3;
export type MatchPhase =
  | "preparation"
  | "battle"
  | "item-choice"
  | "carousel"
  | "game-over";
export type StageKind = "pve" | "pvp" | "carousel";
export type TraitCategory = "origin" | "role";

export interface Position {
  x: number;
  y: number;
}

export interface UnitStats {
  health: number;
  attack: number;
  defense: number;
  range: number;
  attackIntervalMs: number;
  moveIntervalMs: number;
}

export type AbilityTargeting =
  | "nearest-enemy"
  | "farthest-enemy"
  | "lowest-health-enemy"
  | "lowest-health-ally"
  | "self";
export type AbilityPattern =
  | "single"
  | "adjacent"
  | "line"
  | "all-enemies"
  | "single-ally";
export type AbilityEffectKind = "damage" | "heal" | "shield";

export interface AbilityDefinition {
  id: string;
  name: string;
  description: string;
  targeting: AbilityTargeting;
  pattern: AbilityPattern;
  effect: AbilityEffectKind;
  power: number;
  castTimeMs: number;
  hits?: number;
  stunMs?: number;
  burnPower?: number;
  burnDurationMs?: number;
}

export interface UnitDefinition {
  id: string;
  name: string;
  cost: 1 | 2 | 3 | 4 | 5;
  traits: string[];
  stats: UnitStats;
  ability: AbilityDefinition;
  assetPath: string;
}

export type TraitEffect =
  | { kind: "max-health-percent"; value: number }
  | { kind: "attack-speed-percent"; value: number }
  | { kind: "defense-flat"; value: number }
  | { kind: "omnivamp-percent"; value: number }
  | { kind: "starting-energy"; value: number }
  | { kind: "attack-percent"; value: number }
  | { kind: "stacking-attack-percent"; value: number }
  | { kind: "emergency-shield-percent"; value: number }
  | { kind: "dodge-percent"; value: number }
  | { kind: "critical-chance-percent"; value: number }
  | { kind: "ability-power-percent"; value: number }
  | { kind: "range-flat"; value: number }
  | { kind: "shield-flat"; value: number };

export interface TraitTier {
  required: number;
  effects: TraitEffect[];
  label: string;
}

export interface TraitDefinition {
  id: string;
  name: string;
  category: TraitCategory;
  description: string;
  tiers: TraitTier[];
}

export type ItemEffect =
  | { kind: "health-flat"; value: number }
  | { kind: "attack-flat"; value: number }
  | { kind: "defense-flat"; value: number }
  | { kind: "attack-speed-percent"; value: number }
  | { kind: "critical-chance-percent"; value: number }
  | { kind: "ability-power-percent"; value: number }
  | { kind: "starting-energy"; value: number }
  | { kind: "range-flat"; value: number }
  | { kind: "omnivamp-percent"; value: number };

export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  effects: ItemEffect[];
}

export interface PvEEnemyDefinition {
  id: string;
  name: string;
  stats: UnitStats;
  ability?: AbilityDefinition;
  assetPath: string;
}

export interface PvEWaveEntry {
  enemyId: string;
  count: number;
}

export interface StageDefinition {
  id: string;
  round: number;
  kind: StageKind;
  name: string;
  preparationSeconds: number;
  battleSeconds: number;
  enemyWave?: PvEWaveEntry[];
  itemChoices?: number;
}

export interface BotPersonality {
  id: string;
  name: string;
  economyReserve: number;
  levelAggression: number;
  rerollAggression: number;
  preferredTraits: string[];
  formation: "frontline" | "corner" | "spread";
}

export interface GameConfig {
  boardWidth: number;
  boardHeight: number;
  deployRows: number;
  benchSize: number;
  shopSize: number;
  itemCap: number;
  playerCount: number;
  startHealth: number;
  startGold: number;
  startLevel: number;
  maxLevel: number;
  rerollCost: number;
  buyXpCost: number;
  buyXpAmount: number;
  autoXpPerRound: number;
  baseIncome: number;
  maxInterest: number;
  maxStreakBonus: number;
  pvpWinGold: number;
  poolCopiesByCost: [number, number, number, number, number];
  shopOddsByLevel: Record<string, [number, number, number, number, number]>;
  xpToNextByLevel: Record<string, number>;
  starStatBasisPoints: [number, number, number];
  starAbilityBasisPoints: [number, number, number];
  combatTickMs: number;
  combatMaxTicks: number;
  recordBattleEvents?: boolean;
}

export interface GameContent {
  version: string;
  units: UnitDefinition[];
  traits: TraitDefinition[];
  items: ItemDefinition[];
  enemies: PvEEnemyDefinition[];
  stages: StageDefinition[];
  botPersonalities: BotPersonality[];
  config: GameConfig;
}

export interface UnitInstance {
  id: string;
  definitionId: string;
  star: StarLevel;
  items: string[];
  acquiredOrder: number;
}

export type RecentBattleOutcome = "win" | "loss" | "draw";

export interface RecentBattleRecord {
  round: number;
  opponentId: string;
  outcome: RecentBattleOutcome;
  isGhost: boolean;
  captainDamageDealt: number;
  captainDamageTaken: number;
}

export interface BotFormationPlacement {
  unitId: string;
  position: Position;
}

export interface PlayerState {
  id: string;
  name: string;
  isBot: boolean;
  personalityId: string | null;
  alive: boolean;
  hp: number;
  gold: number;
  level: number;
  xp: number;
  board: Record<string, string>;
  bench: Array<string | null>;
  units: Record<string, UnitInstance>;
  shop: Array<string | null>;
  shopLocked: boolean;
  inventory: string[];
  finalCrew: UnitInstance[];
  ready: boolean;
  winStreak: number;
  lossStreak: number;
  lastOpponents: string[];
  recentBattles: RecentBattleRecord[];
  placement: number | null;
}

export interface MatchPairing {
  playerAId: string;
  playerBId: string | null;
  ghostOfPlayerId: string | null;
}

export interface CarouselChoice {
  id: string;
  itemId: string;
  takenByPlayerId: string | null;
  orbitIndex: number;
  claimedAtTick: number | null;
}

export interface CarouselParticipantState {
  playerId: string;
  rank: number;
  spawnPosition: Position;
  position: Position;
  targetPosition: Position;
  releaseTick: number;
  reactionDelayTicks: number;
  moving: boolean;
  claimedChoiceId: string | null;
}

export type CarouselEvent =
  | { id: string; type: "release"; tick: number; playerId: string }
  | {
      id: string;
      type: "move";
      tick: number;
      playerId: string;
      from: Position;
      to: Position;
    }
  | {
      id: string;
      type: "collision";
      tick: number;
      playerAId: string;
      playerBId: string;
    }
  | {
      id: string;
      type: "claim";
      tick: number;
      playerId: string;
      choiceId: string;
      itemId: string;
    }
  | { id: string; type: "timeout"; tick: number; playerIds: string[] }
  | { id: string; type: "complete"; tick: number };

export interface CarouselSessionState {
  tick: number;
  durationTicks: number;
  finishAtTick: number | null;
  arenaSeed: number;
  participants: CarouselParticipantState[];
  events: CarouselEvent[];
}

export interface MatchBattleResult {
  playerAId: string;
  playerBId: string | null;
  ghostOfPlayerId: string | null;
  winnerId: string | null;
  timedOut: boolean;
  playerADamage: number;
  playerBDamage: number;
  durationTicks: number;
  events: BattleEvent[];
  initialUnits: BattleUnitSnapshot[];
  finalUnits: BattleUnitSnapshot[];
}

export interface MatchState {
  schemaVersion: number;
  contentVersion: string;
  seed: string;
  rngState: number;
  round: number;
  phase: MatchPhase;
  stageId: string;
  players: PlayerState[];
  pool: Record<string, number>;
  pairings: MatchPairing[];
  lastResults: MatchBattleResult[];
  pendingItemChoices: Record<string, string[]>;
  carouselChoices: CarouselChoice[];
  carouselSession: CarouselSessionState | null;
  winnerId: string | null;
  nextUnitSerial: number;
  nextChoiceSerial: number;
}

export type UnitDestination =
  | { zone: "board"; x: number; y: number }
  | { zone: "bench"; slot: number }
  | { kind: "board"; x: number; y: number }
  | { kind: "bench"; index: number };

export type GameCommand =
  | { type: "BUY_UNIT"; playerId: string; shopIndex: number }
  | { type: "REROLL_SHOP"; playerId: string }
  | { type: "TOGGLE_SHOP_LOCK"; playerId: string }
  | { type: "BUY_XP"; playerId: string }
  | {
      type: "MOVE_UNIT";
      playerId: string;
      unitId: string;
      to: UnitDestination;
    }
  | { type: "SELL_UNIT"; playerId: string; unitId: string }
  | {
      type: "EQUIP_ITEM";
      playerId: string;
      unitId: string;
      itemId: string;
    }
  | { type: "END_PREPARATION"; playerId: string }
  | { type: "CHOOSE_ITEM"; playerId: string; choiceId: string }
  | {
      type: "CAROUSEL_SET_TARGET";
      playerId: string;
      x: number;
      y: number;
    }
  | { type: "TIMER_EXPIRED" };

export interface CommandError {
  code: string;
  message: string;
}

export type CommandResult =
  | { ok: true; state: MatchState }
  | { ok: false; state: MatchState; error: CommandError };

export interface ActiveTrait {
  traitId: string;
  count: number;
  tierIndex: number;
  tier: TraitTier | null;
}

export interface BattleSetupUnit {
  id: string;
  definitionId: string;
  star: StarLevel;
  items: string[];
  position: Position;
}

export interface BattleTeam {
  id: string;
  units: BattleSetupUnit[];
  activeTraits?: ActiveTrait[];
}

export type BattleUnitState =
  | "seek"
  | "move"
  | "attack-windup"
  | "attack-recovery"
  | "cast"
  | "stunned"
  | "dead";

export interface BattleUnitSnapshot {
  id: string;
  definitionId: string;
  teamId: string;
  star: StarLevel;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  shield: number;
  energy: number;
  attack: number;
  defense: number;
  range: number;
  state: BattleUnitState;
}

export type BattleEvent =
  | {
      type: "battle-start";
      tick: number;
      teamAId: string;
      teamBId: string;
    }
  | {
      type: "unit-move";
      tick: number;
      unitId: string;
      from: Position;
      to: Position;
    }
  | {
      type: "attack";
      tick: number;
      sourceId: string;
      targetId: string;
      critical: boolean;
    }
  | {
      type: "cast";
      tick: number;
      sourceId: string;
      abilityId: string;
      targetIds: string[];
    }
  | {
      type: "damage";
      tick: number;
      sourceId: string;
      targetId: string;
      /** Total damage dealt. Kept for backwards-compatible event consumers. */
      amount: number;
      healthDamage: number;
      shieldDamage: number;
      damageKind: "attack" | "ability" | "burn";
    }
  | {
      type: "energy";
      tick: number;
      unitId: string;
      /** Effective signed delta after applying the 0-100 energy cap. */
      amount: number;
      /** Energy after this event has been applied. */
      value: number;
      reason: "attack" | "damaged" | "cast-reset";
    }
  | {
      type: "dodge";
      tick: number;
      sourceId: string;
      targetId: string;
    }
  | {
      type: "buff";
      tick: number;
      sourceId: string;
      targetId: string;
      stat: "attack";
      amount: number;
      value: number;
      reason: "stacking-attack";
    }
  | {
      type: "heal";
      tick: number;
      sourceId: string;
      targetId: string;
      amount: number;
    }
  | {
      type: "shield";
      tick: number;
      sourceId: string;
      targetId: string;
      amount: number;
    }
  | {
      type: "status";
      tick: number;
      sourceId: string;
      targetId: string;
      status: "stun" | "burn" | "emergency-shield";
      durationTicks: number;
    }
  | {
      type: "death";
      tick: number;
      unitId: string;
      sourceId: string | null;
    }
  | {
      type: "battle-end";
      tick: number;
      winnerId: string | null;
      timedOut: boolean;
    };

export interface BattleOptions {
  seed: string | number;
  maxTicks?: number;
  recordEvents?: boolean;
}

export interface BattleResult {
  winner: "a" | "b" | "draw";
  winnerId: string | null;
  timedOut: boolean;
  durationTicks: number;
  events: BattleEvent[];
  initialUnits: BattleUnitSnapshot[];
  finalUnits: BattleUnitSnapshot[];
}

export interface SaveEnvelope {
  schemaVersion: number;
  contentVersion: string;
  savedAt: string;
  match: MatchState;
}

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
