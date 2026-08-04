"use client";

import { useEffect, useRef, useState } from "react";
import {
  ALL_CREW_ANIMATION_DEFINITIONS,
  crewAnimationKey,
  crewSheetKey,
  getCrewAnimationDefinitions,
  type CrewAnimationDefinition,
  type CrewAnimationState,
} from "./crewAnimationManifest";
import { battleVfx } from "./battleVfx";
import {
  BOARD_MAP_LIST,
  getBoardMapDefinition,
  type BoardSkin,
} from "./boardMapManifest";
import {
  facingFromHorizontalDelta,
  initialBoardFacing,
  mirroredOriginX,
  type BoardFacing,
} from "./boardFacing";

export type BoardZone = "board" | "bench";

export type BoardUnit = {
  id: string;
  contentId: string;
  name: string;
  shortName: string;
  color: number;
  team: "player" | "enemy";
  zone: BoardZone;
  x: number;
  y: number;
  slot: number;
  star: number;
  items: string[];
  hp: number;
  maxHp: number;
  finalHp?: number;
  portrait?: string;
};

export type BoardMove = {
  unitId: string;
  zone: BoardZone;
  x?: number;
  y?: number;
  slot?: number;
};

export type CombatFxEvent = {
  id: string;
  tick: number;
  kind: "move" | "attack" | "ability" | "damage" | "heal" | "defeat";
  sourceId?: string;
  targetId?: string;
  amount?: number;
  label?: string;
  toX?: number;
  toY?: number;
};

type BoardPayload = {
  units: BoardUnit[];
  selectedId: string | null;
  interactive: boolean;
  phase: string;
  capacity: number;
  boardSkin: BoardSkin;
};

type PhaserBoardProps = BoardPayload & {
  phase: string;
  combatEvents: CombatFxEvent[];
  eventSequence: number;
  speed: number;
  particles: boolean;
  onMoveUnit: (move: BoardMove) => boolean;
  onSelectUnit: (unitId: string | null) => void;
};

type SceneBridge = {
  sync: (payload: BoardPayload) => void;
  animateEvents: (
    events: CombatFxEvent[],
    speed: number,
    particles: boolean,
  ) => void;
};

type BoardDestination =
  | {
      zone: "board";
      x: number;
      y: number;
    }
  | {
      zone: "bench";
      slot: number;
    };

const CANVAS_WIDTH = 760;
const CANVAS_HEIGHT = 420;
const CELL_W = 78;
const CELL_H = 48;
const GRID_X = 68;
const GRID_Y = 34;
const BENCH_Y = 365;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function destinationKey(destination: BoardDestination) {
  return destination.zone === "bench"
    ? `bench:${destination.slot}`
    : `board:${destination.x}:${destination.y}`;
}

function unitDestination(unit: BoardUnit): BoardDestination {
  return unit.zone === "bench"
    ? { zone: "bench", slot: unit.slot }
    : { zone: "board", x: unit.x, y: unit.y };
}

function isSameDestination(
  unit: BoardUnit,
  destination: BoardDestination,
) {
  if (unit.zone !== destination.zone) return false;
  return destination.zone === "bench"
    ? unit.slot === destination.slot
    : unit.x === destination.x && unit.y === destination.y;
}

export default function PhaserBoard({
  units,
  selectedId,
  interactive,
  phase,
  capacity,
  boardSkin,
  combatEvents,
  eventSequence,
  speed,
  particles,
  onMoveUnit,
  onSelectUnit,
}: PhaserBoardProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<import("phaser").Game | null>(null);
  const bridgeRef = useRef<SceneBridge | null>(null);
  const animatedSequenceRef = useRef<number | null>(null);
  const latestRef = useRef<BoardPayload>({
    units,
    selectedId,
    interactive,
    phase,
    capacity,
    boardSkin,
  });
  const moveRef = useRef(onMoveUnit);
  const selectRef = useRef(onSelectUnit);
  const [isReady, setIsReady] = useState(false);
  const [failed, setFailed] = useState(false);

  latestRef.current = {
    units,
    selectedId,
    interactive,
    phase,
    capacity,
    boardSkin,
  };
  moveRef.current = onMoveUnit;
  selectRef.current = onSelectUnit;

  useEffect(() => {
    let cancelled = false;

    async function mountBoard() {
      if (!hostRef.current || gameRef.current) return;

      try {
        const PhaserModule = await import("phaser");
        if (cancelled || !hostRef.current) return;
        const Phaser = PhaserModule.default;

        class GrandLineBoard extends Phaser.Scene implements SceneBridge {
          private mapLayer?: Phaser.GameObjects.Container;
          private ambientLayer?: Phaser.GameObjects.Container;
          private currentBoardSkin?: BoardSkin;
          private tokenLayer?: Phaser.GameObjects.Container;
          private tokenObjects = new Map<
            string,
            Phaser.GameObjects.Container
          >();
          private animatedUnitSprites = new Map<
            string,
            {
              assetKey: string;
              definition: CrewAnimationDefinition;
              sprite: Phaser.GameObjects.Sprite;
            }
          >();
          private unitFacings = new Map<string, BoardFacing>();
          private destinationTargets = new Map<
            string,
            {
              destination: BoardDestination;
              surface: Phaser.GameObjects.Rectangle;
              swapCue: Phaser.GameObjects.Text;
            }
          >();
          private draggingUnitId: string | null = null;
          private hoverDestinationKey: string | null = null;
          private invalidDropNotice?: Phaser.GameObjects.Text;
          private hpBars = new Map<string, Phaser.GameObjects.Rectangle>();
          private hpState = new Map<
            string,
            { current: number; max: number }
          >();
          private animationGeneration = 0;
          private requestedTextures = new Set<string>();
          private failedTextures = new Set<string>();
          private payload: BoardPayload = latestRef.current;

          constructor() {
            super("grand-line-board");
          }

          preload() {
            BOARD_MAP_LIST.forEach((map) => {
              this.load.image(map.textureKey, map.assetPath);
            });
            ALL_CREW_ANIMATION_DEFINITIONS.forEach((definition) => {
              this.load.spritesheet(
                crewSheetKey(definition.assetKey),
                definition.sheetPath,
                {
                  frameWidth: definition.frameWidth,
                  frameHeight: definition.frameHeight,
                },
              );
            });
          }

          create() {
            this.createCrewAnimations();
            this.drawMap(this.payload.boardSkin);
            this.createDestinationTargets();
            this.tokenLayer = this.add.container(0, 0).setDepth(20);
            this.sync(latestRef.current);
            bridgeRef.current = this;
            if (!cancelled) setIsReady(true);
          }

          private createCrewAnimations() {
            ALL_CREW_ANIMATION_DEFINITIONS.forEach((definition) => {
              const sheetKey = crewSheetKey(definition.assetKey);
              Object.entries(definition.clips).forEach(([state, clip]) => {
                const key = crewAnimationKey(
                  definition.assetKey,
                  state as CrewAnimationState,
                );
                if (this.anims.exists(key)) return;
                this.anims.create({
                  key,
                  frameRate: clip.frameRate,
                  repeat: clip.repeat,
                  frames: this.anims.generateFrameNumbers(sheetKey, {
                    start: clip.start,
                    end: clip.end,
                  }),
                });
              });
            });
          }

          private playCrewAnimation(
            unitId: string | undefined,
            animation: Exclude<CrewAnimationState, "idle">,
            playbackSpeed = 1,
          ) {
            if (!unitId) return;
            const animatedUnit = this.animatedUnitSprites.get(unitId);
            if (!animatedUnit) return;
            const sprite = animatedUnit.sprite;
            if (!sprite?.active) return;
            const key = crewAnimationKey(animatedUnit.assetKey, animation);
            sprite.anims.timeScale = Math.max(0.5, playbackSpeed);
            sprite.play(key, true);
            sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
              if (sprite.active && sprite.anims.currentAnim?.key === key) {
                if (animation !== "defeat") {
                  sprite.play(
                    crewAnimationKey(animatedUnit.assetKey, "idle"),
                    true,
                  );
                }
              }
            });
            return true;
          }

          private crewAnimationDuration(
            unitId: string | undefined,
            state: CrewAnimationState,
          ) {
            if (!unitId) return 0;
            const definition = this.animatedUnitSprites.get(unitId)?.definition;
            const clip = definition?.clips[state];
            if (!clip) return 0;
            return ((clip.end - clip.start + 1) / clip.frameRate) * 1_000;
          }

          private faceUnit(unitId: string, targetX?: number) {
            const unit = this.payload.units.find((item) => item.id === unitId);
            const token = this.tokenObjects.get(unitId);
            if (!unit || !token) return;
            const current =
              this.unitFacings.get(unitId) ?? initialBoardFacing(unit.team);
            const facing =
              targetX === undefined
                ? current
                : facingFromHorizontalDelta(targetX - token.x, current);
            this.unitFacings.set(unitId, facing);

            const animated = this.animatedUnitSprites.get(unitId);
            if (!animated) return;
            const originX = animated.definition.originX ?? 0.5;
            animated.sprite
              .setOrigin(
                mirroredOriginX(originX, facing),
                animated.definition.originY ?? 0.5,
              )
              .setFlipX(facing === "left");
          }

          private faceUnitsTowardOpponents() {
            const deployed = this.payload.units.filter(
              (unit) => unit.zone === "board",
            );
            deployed.forEach((unit) => {
              const nearest = deployed
                .filter((candidate) => candidate.team !== unit.team)
                .sort((left, right) => {
                  const leftDistance =
                    Math.abs(left.x - unit.x) + Math.abs(left.y - unit.y);
                  const rightDistance =
                    Math.abs(right.x - unit.x) + Math.abs(right.y - unit.y);
                  return leftDistance - rightDistance || left.id.localeCompare(right.id);
                })[0];
              const nearestToken = nearest
                ? this.tokenObjects.get(nearest.id)
                : undefined;
              this.faceUnit(unit.id, nearestToken?.x);
            });
          }

          private playCombatVfx(
            event: CombatFxEvent,
            source: Phaser.GameObjects.Container | undefined,
            target: Phaser.GameObjects.Container | undefined,
            speed: number,
          ) {
            const sourceUnit = event.sourceId
              ? this.payload.units.find((unit) => unit.id === event.sourceId)
              : undefined;
            const targetUnit = event.targetId
              ? this.payload.units.find((unit) => unit.id === event.targetId)
              : undefined;
            const team = sourceUnit?.team ?? targetUnit?.team ?? "player";
            const from = source
              ? { x: source.x, y: source.y - 4 }
              : target
                ? { x: target.x, y: target.y - 4 }
                : undefined;
            const to = target
              ? { x: target.x, y: target.y - 4 }
              : from;

            if (event.kind === "heal" && to) {
              battleVfx.heal(this, { at: to, team, speed });
              return;
            }
            if (event.kind === "damage" && to) {
              battleVfx.impact(this, { at: to, team, speed });
              return;
            }
            if (event.kind === "defeat" && to) {
              battleVfx.smokeBurst(this, {
                at: to,
                team: targetUnit?.team ?? team,
                speed,
                radius: 23,
              });
              return;
            }
            if (!from || !to || !sourceUnit) return;

            const contentId = sourceUnit.contentId;
            if (event.kind === "attack") {
              if (["ace", "sabo", "usopp"].includes(contentId)) {
                battleVfx.fireProjectile(this, {
                  from,
                  to,
                  team,
                  speed,
                  color: contentId === "usopp" ? 0xf4c454 : undefined,
                });
              } else {
                battleVfx.slash(this, { from, to, team, speed, width: 3 });
              }
              return;
            }

            if (contentId === "nami") {
              battleVfx.lightningStrike(this, { at: to, team, speed });
            } else if (["ace", "sabo", "sanji"].includes(contentId)) {
              battleVfx.fireProjectile(this, { from, to, team, speed });
            } else if (["smoker", "crocodile"].includes(contentId)) {
              battleVfx.smokeBurst(this, { at: to, team, speed, radius: 28 });
            } else if (contentId === "chopper") {
              battleVfx.heal(this, { at: to, team, speed, radius: 25 });
              battleVfx.shield(this, { at: to, team, speed, radius: 24 });
            } else if (
              ["zoro", "tashigi", "mihawk", "law", "doflamingo"].includes(
                contentId,
              )
            ) {
              battleVfx.slash(this, { from, to, team, speed, width: 6 });
            } else {
              battleVfx.impact(this, { at: to, team, speed, radius: 17 });
            }
          }

          private clearMapLayers() {
            this.ambientLayer?.list.forEach((object) => {
              this.tweens.killTweensOf(object);
            });
            this.ambientLayer?.destroy(true);
            this.mapLayer?.destroy(true);
            this.ambientLayer = undefined;
            this.mapLayer = undefined;
          }

          private drawMap(boardSkin: BoardSkin) {
            this.clearMapLayers();
            const map = getBoardMapDefinition(boardSkin);
            this.currentBoardSkin = map.id;
            this.cameras.main.setBackgroundColor(0x061d2a);

            const mapLayer = this.add.container(0, 0).setDepth(0);
            this.mapLayer = mapLayer;
            if (this.textures.exists(map.textureKey)) {
              mapLayer.add(
                this.add
                  .image(0, 0, map.textureKey)
                  .setOrigin(0)
                  .setDisplaySize(CANVAS_WIDTH, CANVAS_HEIGHT),
              );
            } else {
              const fallback = this.add.graphics();
              fallback.fillStyle(0x082a34, 1);
              fallback.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
              fallback.fillStyle(0x755033, 1);
              fallback.fillRoundedRect(
                GRID_X - 14,
                GRID_Y - 14,
                CELL_W * 8 + 28,
                CELL_H * 6 + 28,
                12,
              );
              mapLayer.add(fallback);
            }

            const bench = this.add.graphics();
            bench.fillStyle(0x041318, 0.45);
            bench.fillRoundedRect(
              GRID_X - 9,
              BENCH_Y - 20,
              CELL_W * 8 + 18,
              50,
              8,
            );
            bench.lineStyle(2, map.accentColor, 0.62);
            bench.strokeRoundedRect(
              GRID_X - 9,
              BENCH_Y - 20,
              CELL_W * 8 + 18,
              50,
              8,
            );
            for (let column = 1; column < 8; column += 1) {
              bench.lineStyle(1, map.accentColor, 0.18);
              bench.lineBetween(
                GRID_X + column * CELL_W,
                BENCH_Y - 15,
                GRID_X + column * CELL_W,
                BENCH_Y + 25,
              );
            }
            mapLayer.add(bench);
            mapLayer.add(
              this.add
                .text(GRID_X - 2, BENCH_Y - 18, "RESERVES", {
                  fontFamily: '"Courier New", monospace',
                  fontStyle: "bold",
                  fontSize: "8px",
                  color: `#${map.accentColor.toString(16).padStart(6, "0")}`,
                  stroke: "#07131a",
                  strokeThickness: 2,
                })
                .setAlpha(0.78),
            );

            const ambientLayer = this.add.container(0, 0).setDepth(2);
            this.ambientLayer = ambientLayer;
            map.waveZones.forEach((zone, zoneIndex) => {
              const horizontal = zone.width >= zone.height;
              for (let waveIndex = 0; waveIndex < 2; waveIndex += 1) {
                const wave = this.add.graphics();
                wave.lineStyle(1, map.ambientColor, 0.2 + waveIndex * 0.07);
                wave.beginPath();
                if (horizontal) {
                  const y =
                    zone.y +
                    ((zone.height * (waveIndex + 1)) / 3) +
                    (zoneIndex % 2) * 2;
                  const segment = Math.max(22, Math.min(72, zone.width / 7));
                  for (let x = zone.x + 4; x < zone.x + zone.width; x += segment) {
                    wave.moveTo(x, y);
                    wave.lineTo(Math.min(x + segment * 0.35, zone.x + zone.width), y - 2);
                    wave.lineTo(Math.min(x + segment * 0.7, zone.x + zone.width), y);
                  }
                } else {
                  const x = zone.x + (zone.width * (waveIndex + 1)) / 3;
                  const segment = Math.max(22, Math.min(66, zone.height / 6));
                  for (let y = zone.y + 4; y < zone.y + zone.height; y += segment) {
                    wave.moveTo(x, y);
                    wave.lineTo(x + 2, Math.min(y + segment * 0.35, zone.y + zone.height));
                    wave.lineTo(x, Math.min(y + segment * 0.7, zone.y + zone.height));
                  }
                }
                wave.strokePath();
                ambientLayer.add(wave);
                this.tweens.add({
                  targets: wave,
                  x: horizontal ? 7 : 2,
                  y: horizontal ? 2 : 7,
                  alpha: { from: 0.4, to: 0.9 },
                  duration: 1_850 + zoneIndex * 170 + waveIndex * 260,
                  ease: "Sine.InOut",
                  yoyo: true,
                  repeat: -1,
                  delay: zoneIndex * 90 + waveIndex * 310,
                });
              }
            });
          }

          private createDestinationTargets() {
            for (let row = 3; row < 6; row += 1) {
              for (let col = 0; col < 8; col += 1) {
                this.registerDestinationTarget(
                  { zone: "board", x: col, y: row },
                  GRID_X + col * CELL_W + CELL_W / 2,
                  GRID_Y + row * CELL_H + CELL_H / 2,
                  CELL_W - 7,
                  CELL_H - 7,
                );
              }
            }

            for (let slot = 0; slot < 8; slot += 1) {
              this.registerDestinationTarget(
                { zone: "bench", slot },
                GRID_X + slot * CELL_W + CELL_W / 2,
                BENCH_Y + 5,
                CELL_W - 7,
                38,
              );
            }
          }

          private registerDestinationTarget(
            destination: BoardDestination,
            x: number,
            y: number,
            width: number,
            height: number,
          ) {
            const key = destinationKey(destination);
            const surface = this.add
              .rectangle(x, y, width, height, 0x3b9f91, 0)
              .setStrokeStyle(2, 0x7fe4cc, 0)
              .setDepth(10)
              .setInteractive({ cursor: "pointer" });
            const swapCue = this.add
              .text(x + width / 2 - 11, y - height / 2 + 8, "↔", {
                fontFamily: "Arial, sans-serif",
                fontStyle: "bold",
                fontSize: "14px",
                color: "#fff1a5",
                stroke: "#301b0c",
                strokeThickness: 3,
              })
              .setOrigin(0.5)
              .setDepth(35)
              .setVisible(false);

            surface.on("pointerover", () => {
              this.hoverDestinationKey = key;
              this.refreshDestinationCues();
            });
            surface.on("pointerout", () => {
              if (this.hoverDestinationKey === key) {
                this.hoverDestinationKey = null;
                this.refreshDestinationCues();
              }
            });
            surface.on("pointerdown", () => {
              this.moveSelectedTo(destination);
            });

            this.destinationTargets.set(key, {
              destination,
              surface,
              swapCue,
            });
          }

          private selectedPlayerUnit(preferredId?: string | null) {
            const unitId = preferredId ?? this.payload.selectedId;
            if (!this.payload.interactive || !unitId) return undefined;
            const unit = this.payload.units.find((item) => item.id === unitId);
            return unit?.team === "player" ? unit : undefined;
          }

          private unitAtDestination(destination: BoardDestination) {
            return this.payload.units.find(
              (unit) =>
                unit.team === "player" &&
                isSameDestination(unit, destination),
            );
          }

          private refreshDestinationCues(preferredId?: string | null) {
            const selected = this.selectedPlayerUnit(
              preferredId ?? this.draggingUnitId,
            );

            for (const [key, target] of this.destinationTargets) {
              if (target.surface.input) {
                target.surface.input.enabled = Boolean(selected);
              }

              if (!selected) {
                target.surface
                  .setFillStyle(0x3b9f91, 0)
                  .setStrokeStyle(2, 0x7fe4cc, 0);
                target.swapCue.setVisible(false);
                continue;
              }

              const occupant = this.unitAtDestination(target.destination);
              const isOrigin = isSameDestination(
                selected,
                target.destination,
              );
              const isSwap = Boolean(occupant && occupant.id !== selected.id);
              const deployed = this.payload.units.filter(
                (unit) =>
                  unit.team === "player" && unit.zone === "board",
              ).length;
              const isIllegal =
                target.destination.zone === "board" &&
                selected.zone === "bench" &&
                !occupant &&
                deployed >= this.payload.capacity;
              const isHovered = this.hoverDestinationKey === key;
              const color = isIllegal
                ? 0xd95f58
                : isSwap
                  ? 0xf0b74f
                  : 0x55c9b5;
              const fillAlpha = isHovered ? 0.34 : isOrigin ? 0.08 : 0.17;
              const strokeAlpha = isHovered ? 1 : isOrigin ? 0.45 : 0.78;

              target.surface
                .setFillStyle(color, fillAlpha)
                .setStrokeStyle(isHovered ? 3 : 2, color, strokeAlpha);
              target.swapCue
                .setText(isIllegal ? "×" : "↔")
                .setVisible(isSwap || isIllegal)
                .setScale(isHovered ? 1.18 : 1)
                .setColor(
                  isHovered
                    ? "#ffffff"
                    : isIllegal
                      ? "#ffb2aa"
                      : "#fff1a5",
                );
            }
          }

          private moveSelectedTo(destination: BoardDestination) {
            const selected = this.selectedPlayerUnit();
            if (!selected || isSameDestination(selected, destination)) return;
            return moveRef.current({
              unitId: selected.id,
              ...destination,
            });
          }

          private destinationAt(x: number, y: number) {
            if (
              y >= BENCH_Y - 18 &&
              y <= BENCH_Y + 28 &&
              x >= GRID_X &&
              x < GRID_X + CELL_W * 8
            ) {
              return {
                zone: "bench",
                slot: clamp(Math.floor((x - GRID_X) / CELL_W), 0, 7),
              } satisfies BoardDestination;
            }

            if (
              x < GRID_X ||
              x >= GRID_X + CELL_W * 8 ||
              y < GRID_Y + CELL_H * 3 ||
              y >= GRID_Y + CELL_H * 6
            ) {
              return undefined;
            }

            return {
              zone: "board",
              x: clamp(Math.floor((x - GRID_X) / CELL_W), 0, 7),
              y: clamp(Math.floor((y - GRID_Y) / CELL_H), 3, 5),
            } satisfies BoardDestination;
          }

          private destinationPosition(destination: BoardDestination) {
            return destination.zone === "bench"
              ? {
                  x:
                    GRID_X +
                    clamp(destination.slot, 0, 7) * CELL_W +
                    CELL_W / 2,
                  y: BENCH_Y + 4,
                }
              : {
                  x:
                    GRID_X +
                    clamp(destination.x, 0, 7) * CELL_W +
                    CELL_W / 2,
                  y:
                    GRID_Y +
                    clamp(destination.y, 3, 5) * CELL_H +
                    CELL_H / 2,
                };
          }

          private returnDraggedToken(
            container: Phaser.GameObjects.Container,
            origin: { x: number; y: number },
            shake: boolean,
            onComplete?: () => void,
          ) {
            this.tweens.add({
              targets: container,
              x: origin.x,
              y: origin.y,
              duration: 105,
              ease: "Back.Out",
              onComplete: () => {
                if (!shake) {
                  onComplete?.();
                  return;
                }
                this.tweens.add({
                  targets: container,
                  x: origin.x + 6,
                  duration: 32,
                  ease: "Sine.InOut",
                  yoyo: true,
                  repeat: 2,
                  onComplete: () => {
                    container.setPosition(origin.x, origin.y);
                    onComplete?.();
                  },
                });
              },
            });
          }

          private showInvalidDropNotice() {
            this.invalidDropNotice?.destroy();
            const notice = this.add
              .text(
                CANVAS_WIDTH / 2,
                CANVAS_HEIGHT - 15,
                "PLACE CREW ON YOUR DECK OR BENCH",
                {
                  fontFamily: '"Courier New", monospace',
                  fontStyle: "bold",
                  fontSize: "10px",
                  color: "#ffe6a1",
                  backgroundColor: "#3a2024e8",
                  padding: { x: 9, y: 5 },
                  stroke: "#120b0d",
                  strokeThickness: 2,
                },
              )
              .setOrigin(0.5, 1)
              .setDepth(220);
            this.invalidDropNotice = notice;
            this.tweens.add({
              targets: notice,
              y: notice.y - 7,
              alpha: 0,
              delay: 900,
              duration: 180,
              onComplete: () => {
                if (this.invalidDropNotice === notice) {
                  this.invalidDropNotice = undefined;
                }
                notice.destroy();
              },
            });
          }

          private handleUnitClick(unit: BoardUnit) {
            if (!this.payload.interactive || unit.team !== "player") {
              selectRef.current(
                this.payload.selectedId === unit.id ? null : unit.id,
              );
              return;
            }

            const selected = this.selectedPlayerUnit();
            if (!selected) {
              selectRef.current(unit.id);
            } else if (selected.id === unit.id) {
              selectRef.current(null);
            } else {
              this.moveSelectedTo(unitDestination(unit));
            }
          }

          sync(payload: BoardPayload) {
            if (payload.phase !== this.payload.phase) {
              this.animationGeneration += 1;
              this.draggingUnitId = null;
              this.hoverDestinationKey = null;
            }
            if (payload.boardSkin !== this.currentBoardSkin) {
              this.drawMap(payload.boardSkin);
            }
            this.payload = payload;
            if (!this.tokenLayer) return;
            this.requestPortraitTextures(payload.units);
            this.tokenLayer.removeAll(true);
            this.tokenObjects.clear();
            this.animatedUnitSprites.clear();
            this.unitFacings.clear();
            this.hpBars.clear();
            this.hpState.clear();

            payload.units.forEach((unit) => {
              const token = this.makeToken(unit, payload);
              this.tokenLayer?.add(token);
              this.tokenObjects.set(unit.id, token);
            });
            this.faceUnitsTowardOpponents();
            this.refreshDestinationCues();
          }

          private portraitKey(unit: BoardUnit) {
            return `crew-${unit.contentId.replace(/[^a-z0-9_-]/gi, "-")}`;
          }

          private requestPortraitTextures(unitsToLoad: BoardUnit[]) {
            const pending = unitsToLoad.filter(
              (unit) =>
                Boolean(unit.portrait) &&
                !this.textures.exists(this.portraitKey(unit)) &&
                !this.requestedTextures.has(this.portraitKey(unit)) &&
                !this.failedTextures.has(this.portraitKey(unit)),
            );
            if (!pending.length) return;

            pending.forEach((unit) => {
              const key = this.portraitKey(unit);
              this.requestedTextures.add(key);
              this.load.image(key, unit.portrait);
            });
            this.load.once(
              "loaderror",
              (file: Phaser.Loader.File) => {
                this.failedTextures.add(file.key);
              },
              this,
            );
            this.load.once(
              "complete",
              () => {
                this.sync(this.payload);
              },
              this,
            );
            if (!this.load.isLoading()) this.load.start();
          }

          private makeToken(unit: BoardUnit, payload: BoardPayload) {
            const position =
              unit.zone === "bench"
                ? {
                    x: GRID_X + clamp(unit.slot, 0, 7) * CELL_W + CELL_W / 2,
                    y: BENCH_Y + 4,
                  }
                : {
                    x:
                      GRID_X +
                      clamp(unit.x, 0, 7) * CELL_W +
                      CELL_W / 2,
                    y:
                      GRID_Y +
                      clamp(unit.y, 0, 5) * CELL_H +
                      CELL_H / 2,
                  };

            const container = this.add.container(position.x, position.y);
            const shadow = this.add.ellipse(2, 15, 43, 13, 0x07131a, 0.54);
            const ring = this.add.circle(
              0,
              -2,
              unit.zone === "bench" ? 17 : 20,
              unit.team === "enemy" ? 0x6d2733 : 0x183e43,
              1,
            );
            const isSelected = payload.selectedId === unit.id;
            const selectionHalo = this.add
              .circle(
                0,
                -2,
                unit.zone === "bench" ? 22 : 26,
                0xffe189,
                0.08,
              )
              .setStrokeStyle(3, 0xffed9c, 0.95)
              .setVisible(isSelected);
            ring.setStrokeStyle(
              isSelected ? 4 : 2,
              isSelected
                ? 0xffd768
                : unit.team === "enemy"
                  ? 0xe36b72
                  : 0xe2bd66,
              1,
            );
            const body = this.add.circle(
              0,
              -3,
              unit.zone === "bench" ? 14 : 17,
              unit.color,
              1,
            );
            const portraitKey = this.portraitKey(unit);
            const animationDefinition = [
              ...getCrewAnimationDefinitions(unit.contentId),
            ]
              .reverse()
              .find((candidate) =>
                this.textures.exists(crewSheetKey(candidate.assetKey)),
              );
            const usesPilotAnimation =
              Boolean(animationDefinition) &&
              unit.zone === "board";
            const hasPortrait =
              this.textures.exists(portraitKey) &&
              !this.failedTextures.has(portraitKey);
            const startingFacing = initialBoardFacing(unit.team);
            this.unitFacings.set(unit.id, startingFacing);
            const animatedSprite = usesPilotAnimation
              ? this.add
                  .sprite(
                    0,
                    animationDefinition?.yOffset ?? -6,
                    crewSheetKey(animationDefinition?.assetKey ?? unit.contentId),
                    0,
                  )
                  .setOrigin(
                    mirroredOriginX(
                      animationDefinition?.originX ?? 0.5,
                      startingFacing,
                    ),
                    animationDefinition?.originY ?? 0.5,
                  )
                  .setDisplaySize(
                    animationDefinition?.displaySize ?? 46,
                    animationDefinition?.displaySize ?? 46,
                  )
                  .setFlipX(startingFacing === "left")
                  .play(
                    crewAnimationKey(
                      animationDefinition?.assetKey ?? unit.contentId,
                      "idle",
                    ),
                  )
              : null;
            if (animatedSprite) {
              this.animatedUnitSprites.set(unit.id, {
                assetKey: animationDefinition?.assetKey ?? unit.contentId,
                definition: animationDefinition!,
                sprite: animatedSprite,
              });
            }
            const portrait = hasPortrait && !animatedSprite
              ? this.add
                  .image(0, unit.zone === "bench" ? -4 : -6, portraitKey)
                  .setDisplaySize(
                    unit.zone === "bench" ? 29 : 36,
                    unit.zone === "bench" ? 32 : 42,
                  )
              : null;
            const initial = this.add
              .text(0, -4, unit.shortName.slice(0, 2).toUpperCase(), {
                fontFamily: '"Courier New", monospace',
                fontStyle: "bold",
                fontSize: unit.zone === "bench" ? "10px" : "12px",
                color: "#fff3c5",
                stroke: "#06151c",
                strokeThickness: 3,
              })
              .setOrigin(0.5)
              .setVisible(!hasPortrait && !animatedSprite);
            const name = this.add
              .text(0, unit.zone === "bench" ? 18 : 22, unit.shortName, {
                fontFamily: '"Courier New", monospace',
                fontStyle: "bold",
                fontSize: "8px",
                color: "#f6e7be",
                stroke: "#07131a",
                strokeThickness: 2,
              })
              .setOrigin(0.5);
            const hpBack = this.add.rectangle(
              0,
              unit.zone === "bench" ? -23 : -28,
              38,
              4,
              0x170f12,
              1,
            );
            const ratio = clamp(unit.hp / Math.max(1, unit.maxHp), 0, 1);
            const hp = this.add
              .rectangle(
                -19,
                unit.zone === "bench" ? -23 : -28,
                38 * ratio,
                3,
                ratio > 0.45 ? 0x5ad27a : 0xe26052,
                1,
              )
              .setOrigin(0, 0.5);
            this.hpBars.set(unit.id, hp);
            this.hpState.set(unit.id, {
              current: unit.hp,
              max: Math.max(1, unit.maxHp),
            });
            const stars = this.add
              .text(0, unit.zone === "bench" ? -15 : -20, "★".repeat(unit.star), {
                fontFamily: "Arial",
                fontSize: "8px",
                color: "#ffd45a",
                stroke: "#3b210d",
                strokeThickness: 1,
              })
              .setOrigin(0.5);
            const selectionMarker = this.add
              .text(0, unit.zone === "bench" ? -36 : -42, "▼", {
                fontFamily: "Arial, sans-serif",
                fontStyle: "bold",
                fontSize: "13px",
                color: "#fff0a2",
                stroke: "#4a280d",
                strokeThickness: 3,
              })
              .setOrigin(0.5)
              .setVisible(isSelected);
            const itemPips = unit.items.slice(0, 3).map((itemId, index) =>
              this.add
                .rectangle(
                  -8 + index * 8,
                  unit.zone === "bench" ? 12 : 15,
                  5,
                  5,
                  hashItemColor(itemId),
                  1,
                )
                .setStrokeStyle(1, 0xf1d47d, 0.8),
            );

            container.add([shadow, selectionHalo, ring, body]);
            if (animatedSprite) container.add(animatedSprite);
            if (portrait) container.add(portrait);
            container.add([
              initial,
              name,
              hpBack,
              hp,
              stars,
              selectionMarker,
              ...itemPips,
            ]);
            if (isSelected) {
              this.tweens.add({
                targets: selectionHalo,
                scale: 1.13,
                alpha: 0.72,
                duration: 460,
                ease: "Sine.InOut",
                yoyo: true,
                repeat: -1,
              });
            }
            container.setSize(50, 52);
            container.setDepth(unit.team === "enemy" ? unit.y + 1 : unit.y + 10);
            container.setInteractive({ cursor: "pointer" });
            let wasDragged = false;
            container.on("pointerup", () => {
              if (wasDragged) {
                wasDragged = false;
                return;
              }
              this.handleUnitClick(unit);
            });

            if (payload.interactive && unit.team === "player") {
              this.input.setDraggable(container);
              container.on("dragstart", () => {
                wasDragged = true;
                this.draggingUnitId = unit.id;
                this.hoverDestinationKey = destinationKey(
                  unitDestination(unit),
                );
                this.refreshDestinationCues(unit.id);
                container.setDepth(100);
                this.tweens.add({
                  targets: container,
                  scale: 1.14,
                  duration: 80,
                });
              });
              container.on(
                "drag",
                (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
                  container.setPosition(dragX, dragY);
                  const destination = this.destinationAt(dragX, dragY);
                  const nextHover = destination
                    ? destinationKey(destination)
                    : null;
                  if (nextHover !== this.hoverDestinationKey) {
                    this.hoverDestinationKey = nextHover;
                    this.refreshDestinationCues(unit.id);
                  }
                },
              );
              container.on("dragend", () => {
                this.tweens.add({
                  targets: container,
                  scale: 1,
                  duration: 80,
                });
                const destination = this.destinationAt(
                  container.x,
                  container.y,
                );
                const origin = this.destinationPosition(unitDestination(unit));
                this.draggingUnitId = null;
                this.hoverDestinationKey = null;

                if (destination && !isSameDestination(unit, destination)) {
                  const accepted = moveRef.current({
                    unitId: unit.id,
                    ...destination,
                  });
                  if (accepted) {
                    const targetPosition =
                      this.destinationPosition(destination);
                    container.setPosition(targetPosition.x, targetPosition.y);
                    selectRef.current(unit.id);
                    this.refreshDestinationCues();
                  } else {
                    this.returnDraggedToken(container, origin, true, () => {
                      selectRef.current(unit.id);
                    });
                  }
                } else if (destination) {
                  this.returnDraggedToken(container, origin, false, () => {
                    selectRef.current(unit.id);
                  });
                } else {
                  this.showInvalidDropNotice();
                  this.returnDraggedToken(container, origin, true, () => {
                    selectRef.current(unit.id);
                  });
                }
              });
            }

            return container;
          }

          animateEvents(
            events: CombatFxEvent[],
            animationSpeed: number,
            showParticles: boolean,
          ) {
            const speed = Math.max(0.5, animationSpeed);
            const generation = ++this.animationGeneration;
            const setHealth = (unitId: string, nextHealth: number) => {
              const state = this.hpState.get(unitId);
              const bar = this.hpBars.get(unitId);
              if (!state || !bar) return;
              state.current = clamp(nextHealth, 0, state.max);
              const ratio = state.current / state.max;
              bar
                .setDisplaySize(Math.max(0.1, 38 * ratio), 3)
                .setFillStyle(ratio > 0.45 ? 0x5ad27a : 0xe26052, 1)
                .setVisible(ratio > 0);
            };

            events.forEach((event) => {
              const delay = Math.max(0, Math.round((event.tick * 100) / speed));
              this.time.delayedCall(delay, () => {
                if (generation !== this.animationGeneration) return;
                const source = event.sourceId
                  ? this.tokenObjects.get(event.sourceId)
                  : undefined;
                const target = event.targetId
                  ? this.tokenObjects.get(event.targetId)
                  : undefined;

                if (
                  event.kind === "move" &&
                  source &&
                  event.toX !== undefined &&
                  event.toY !== undefined
                ) {
                  this.playCrewAnimation(event.sourceId, "move", speed);
                  const destinationX =
                    GRID_X + clamp(event.toX, 0, 7) * CELL_W + CELL_W / 2;
                  this.faceUnit(event.sourceId ?? "", destinationX);
                  this.tweens.add({
                    targets: source,
                    x: destinationX,
                    y: GRID_Y + clamp(event.toY, 0, 5) * CELL_H + CELL_H / 2,
                    duration: Math.round(
                      125 / Math.max(0.5, animationSpeed),
                    ),
                  });
                  return;
                }

                if (
                  source &&
                  target &&
                  (event.kind === "attack" || event.kind === "ability")
                ) {
                  this.playCrewAnimation(
                    event.sourceId,
                    event.kind === "ability" ? "cast" : "attack",
                    speed,
                  );
                  this.faceUnit(event.sourceId ?? "", target.x);
                  this.faceUnit(event.targetId ?? "", source.x);
                  if (showParticles) {
                    this.playCombatVfx(event, source, target, speed);
                  }
                  const sourceX = source.x;
                  const sourceY = source.y;
                  this.tweens.add({
                    targets: source,
                    x: sourceX + (target.x - sourceX) * 0.12,
                    y: sourceY + (target.y - sourceY) * 0.12,
                    yoyo: true,
                    duration: Math.round(90 / speed),
                  });
                }

                if (target && event.kind === "damage") {
                  this.playCrewAnimation(event.targetId, "hit", speed);
                  if (source) this.faceUnit(event.targetId ?? "", source.x);
                  const hp = this.hpState.get(event.targetId ?? "");
                  if (hp) {
                    setHealth(
                      event.targetId ?? "",
                      hp.current - Math.max(0, event.amount ?? 0),
                    );
                  }
                } else if (target && event.kind === "heal") {
                  const hp = this.hpState.get(event.targetId ?? "");
                  if (hp) {
                    setHealth(
                      event.targetId ?? "",
                      hp.current + Math.max(0, event.amount ?? 0),
                    );
                  }
                } else if (target && event.kind === "defeat") {
                  setHealth(event.targetId ?? "", 0);
                  this.playCrewAnimation(event.targetId, "defeat", speed);
                }

                if (
                  showParticles &&
                  (event.kind === "damage" ||
                    event.kind === "heal" ||
                    event.kind === "defeat")
                ) {
                  this.playCombatVfx(event, source, target, speed);
                }

                const reacts =
                  target &&
                  (event.kind === "damage" ||
                    event.kind === "heal" ||
                    event.kind === "ability" ||
                    event.kind === "defeat");
                if (target && reacts) {
                  const delaysAnimatedDefeat =
                    event.kind === "defeat" &&
                    this.animatedUnitSprites.has(event.targetId ?? "");
                  this.tweens.add({
                    targets: target,
                    scaleX: event.kind === "defeat" ? 0.86 : 1.2,
                    scaleY: event.kind === "defeat" ? 0.86 : 1.2,
                    alpha: event.kind === "defeat" ? 0 : 1,
                    yoyo: event.kind !== "defeat",
                    delay: delaysAnimatedDefeat
                      ? Math.round(
                          this.crewAnimationDuration(
                            event.targetId,
                            "defeat",
                          ) / speed,
                        )
                      : 0,
                    duration: Math.round(
                      (event.kind === "defeat" ? 260 : 85) /
                        Math.max(0.5, animationSpeed),
                    ),
                  });

                  if (
                    event.kind !== "ability" &&
                    (event.amount || event.label)
                  ) {
                    const floater = this.add
                      .text(
                        target.x,
                        target.y - 25,
                        event.label ??
                          `${event.kind === "heal" ? "+" : "−"}${Math.abs(event.amount ?? 0)}`,
                        {
                          fontFamily: '"Courier New", monospace',
                          fontStyle: "bold",
                          fontSize: "13px",
                          color:
                            event.kind === "heal" ? "#74ed99" : "#ff8b72",
                          stroke: "#07131a",
                          strokeThickness: 3,
                        },
                      )
                      .setOrigin(0.5)
                      .setDepth(150);
                    this.tweens.add({
                      targets: floater,
                      y: floater.y - 24,
                      alpha: 0,
                      duration: Math.round(
                        520 / Math.max(0.5, animationSpeed),
                      ),
                      onComplete: () => floater.destroy(),
                    });
                  }

                }
              });
            });

            const maxTick = events.reduce(
              (highest, event) => Math.max(highest, event.tick),
              0,
            );
            this.time.delayedCall(
              Math.round((maxTick * 100) / speed) + Math.round(720 / speed),
              () => {
                if (generation !== this.animationGeneration) return;
                for (const unit of this.payload.units) {
                  if (unit.finalHp === undefined) continue;
                  setHealth(unit.id, unit.finalHp);
                  if (unit.finalHp <= 0) {
                    const token = this.tokenObjects.get(unit.id);
                    token?.setAlpha(0).setScale(0.86);
                  }
                }
              },
            );
          }
        }

        const game = new Phaser.Game({
          type: Phaser.CANVAS,
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          parent: hostRef.current,
          backgroundColor: "#061d2a",
          transparent: false,
          render: {
            antialias: false,
            pixelArt: true,
            roundPixels: true,
          },
          scene: GrandLineBoard,
          audio: { noAudio: true },
          scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
          },
        });
        gameRef.current = game;
      } catch (error) {
        console.error("Unable to start the local board renderer", error);
        if (!cancelled) setFailed(true);
      }
    }

    void mountBoard();

    return () => {
      cancelled = true;
      bridgeRef.current = null;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    bridgeRef.current?.sync({
      units,
      selectedId,
      interactive,
      phase,
      capacity,
      boardSkin,
    });
  }, [units, selectedId, interactive, phase, capacity, boardSkin]);

  useEffect(() => {
    if (
      !isReady ||
      !eventSequence ||
      !combatEvents.length ||
      animatedSequenceRef.current === eventSequence
    ) {
      return;
    }
    animatedSequenceRef.current = eventSequence;
    bridgeRef.current?.animateEvents(combatEvents, speed, particles);
  }, [combatEvents, eventSequence, isReady, speed, particles]);

  if (failed) {
    return (
      <CssBoardFallback
        units={units}
        selectedId={selectedId}
        interactive={interactive}
        capacity={capacity}
        boardSkin={boardSkin}
        onMoveUnit={onMoveUnit}
        onSelectUnit={onSelectUnit}
      />
    );
  }

  const activeMap = getBoardMapDefinition(boardSkin);
  return (
    <div
      className="phaser-stage-frame"
      data-phase={phase}
      data-board-skin={boardSkin}
    >
      {!isReady && (
        <div className="board-loading" aria-live="polite">
          Charting the waters…
        </div>
      )}
      <div
        ref={hostRef}
        className="phaser-host"
        role="application"
        aria-label={`${activeMap.ariaLabel}. Drag your crew to arrange them.`}
      />
      <ul className="sr-only" aria-label="Units on the tactical board">
        {units.map((unit) => (
          <li key={unit.id}>
            {unit.name}, {unit.star} star, {unit.team},{" "}
            {unit.zone === "bench"
              ? `bench slot ${unit.slot + 1}`
              : `column ${unit.x + 1}, row ${unit.y + 1}`}
            {unit.items.length ? `, ${unit.items.length} items equipped` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

function hashItemColor(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33 + value.charCodeAt(index)) >>> 0;
  }
  return [0x77b9d1, 0xd77a62, 0xe6c35b, 0x8bc477, 0xa986c8][hash % 5];
}

function CssBoardFallback({
  units,
  selectedId,
  interactive,
  capacity,
  boardSkin,
  onMoveUnit,
  onSelectUnit,
}: Pick<
  PhaserBoardProps,
  | "units"
  | "selectedId"
  | "interactive"
  | "capacity"
  | "boardSkin"
  | "onMoveUnit"
  | "onSelectUnit"
>) {
  const boardUnits = units.filter((unit) => unit.zone === "board");
  const benchUnits = units.filter((unit) => unit.zone === "bench");
  const selectedUnit = units.find((unit) => unit.id === selectedId);
  const deployed = boardUnits.filter((unit) => unit.team === "player").length;
  const map = getBoardMapDefinition(boardSkin);

  return (
    <div className="css-board-fallback" data-board-skin={boardSkin}>
      <div className="css-board-grid" aria-label={map.ariaLabel}>
        {Array.from({ length: 48 }, (_, index) => {
          const x = index % 8;
          const y = Math.floor(index / 8);
          const unit = boardUnits.find((item) => item.x === x && item.y === y);
          return (
            <button
              type="button"
              key={`${x}-${y}`}
              className="css-board-cell"
              disabled={
                !interactive ||
                y < 3 ||
                (selectedUnit?.zone === "bench" &&
                  deployed >= capacity &&
                  !unit)
              }
              onClick={() => {
                if (!selectedId && unit) {
                  onSelectUnit(unit.id);
                } else if (selectedId) {
                  onMoveUnit({
                    unitId: selectedId,
                    zone: "board",
                    x,
                    y,
                  });
                }
              }}
              aria-label={`Column ${x + 1}, row ${y + 1}${unit ? `: ${unit.name}` : ""}`}
            >
              {unit && (
                <span
                  className={`css-token ${selectedId === unit.id ? "is-selected" : ""}`}
                >
                  {unit.shortName.slice(0, 2)}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="css-bench" aria-label="Bench">
        {Array.from({ length: 8 }, (_, slot) => {
          const unit = benchUnits.find((item) => item.slot === slot);
          return (
            <button
              type="button"
              key={slot}
              disabled={!interactive}
              onClick={() => {
                if (!selectedId && unit) {
                  onSelectUnit(unit.id);
                } else if (selectedId) {
                  onMoveUnit({
                    unitId: selectedId,
                    zone: "bench",
                    slot,
                  });
                }
              }}
              aria-label={`Bench slot ${slot + 1}${unit ? `: ${unit.name}` : ""}`}
            >
              {unit?.shortName.slice(0, 2) ?? ""}
            </button>
          );
        })}
      </div>
      <p className="board-fallback-note">
        Canvas renderer unavailable — keyboard-accessible deck enabled.
      </p>
    </div>
  );
}
