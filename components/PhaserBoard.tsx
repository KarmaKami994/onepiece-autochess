"use client";

import { useEffect, useRef, useState } from "react";
import {
  crewAnimationKey,
  crewSheetKey,
  getCrewAnimationDefinitions,
  type CrewAnimationDefinition,
  type CrewAnimationState,
} from "./crewAnimationManifest";
import { battleVfx } from "./battleVfx";
import {
  getBoardMapDefinition,
  type BoardSkin,
} from "./boardMapManifest";
import {
  facingFromHorizontalDelta,
  initialBoardFacing,
  mirroredOriginX,
  type BoardFacing,
} from "./boardFacing";
import {
  RESOURCE_BAR_COLORS,
  RESOURCE_BAR_GEOMETRY,
  resourceBarFill,
  resourceBarLayout,
} from "./unitResourceBar";
import {
  ANIMATED_BENCH_HIT_AREA,
  ANIMATED_BOARD_HIT_AREA,
  BENCH_DESTINATIONS,
  BOARD_GEOMETRY,
  FALLBACK_TOKEN_HIT_AREA,
  PLAYER_BOARD_DESTINATIONS,
  boardCellCenter,
  boardDestinationAtPoint,
  boardDestinationCenter,
  boardDestinationTarget,
  safeScreenBoundsWithinStage,
  type BoardDestination,
} from "./boardGeometry";
import {
  resolveInitialBoardAssets,
  resolveMissingAnimationDefinitions,
} from "./boardAssets";
import { resolveBoardBackdrop, resolveBoardCameraFrame } from "./boardCamera";
import {
  clampResourceValue as clamp,
  destinationKey,
  hashItemColor,
  isSameDestination,
  unitDestination,
} from "./boardTokens";
import {
  combatPresentationStyle,
  sequentialAbilityHitDelayMs,
} from "./boardCombatPresentation";
import { BOARD_SCENE_KEY, createBoardGameConfig } from "./BoardScene";

export type BoardZone = "board" | "bench";
export type BoardInteractionMode = "formation" | "bench-only" | "none";

export type BoardUnit = {
  id: string;
  contentId: string;
  formId?: string;
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
  shield?: number;
  energy?: number;
  finalHp?: number;
  finalShield?: number;
  finalEnergy?: number;
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
  presentationOffsetMs?: number;
  kind:
    | "move"
    | "displace"
    | "attack"
    | "cast"
    | "ability-hit"
    | "damage"
    | "heal"
    | "shield"
    | "energy"
    | "status"
    | "buff"
    | "dodge"
    | "defeat";
  sourceId?: string;
  targetId?: string;
  targetIds?: string[];
  amount?: number;
  healthDamage?: number;
  shieldDamage?: number;
  damageKind?: string;
  critical?: boolean;
  abilityId?: string;
  abilityName?: string;
  telegraph?: "target" | "line" | "area";
  deferImpactToAbilityHits?: boolean;
  hitIndex?: number;
  hitCount?: number;
  finisher?: boolean;
  status?: string;
  durationTicks?: number;
  energyDelta?: number;
  energyValue?: number;
  reason?: string;
  stat?: string;
  label?: string;
  unitId?: string;
  movementKind?: string;
  from?: Readonly<{ x: number; y: number }>;
  to?: Readonly<{ x: number; y: number }>;
  toX?: number;
  toY?: number;
};

type BoardPayload = {
  units: BoardUnit[];
  selectedId: string | null;
  interactionMode: BoardInteractionMode;
  phase: string;
  capacity: number;
  boardSkin: BoardSkin;
};

export function preservesActiveBattleTimeline(
  current: BoardPayload,
  next: BoardPayload,
): boolean {
  const deployedUnits = (units: BoardUnit[]) =>
    units
      .filter((unit) => unit.zone === "board")
      .sort((left, right) =>
        left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
      );

  return (
    current.phase === "battle" &&
    next.phase === "battle" &&
    JSON.stringify(deployedUnits(current.units)) ===
      JSON.stringify(deployedUnits(next.units)) &&
    current.boardSkin === next.boardSkin
  );
}

export function interactionAllowsUnit(
  mode: BoardInteractionMode,
  unit: Pick<BoardUnit, "team" | "zone">,
): boolean {
  return (
    unit.team === "player" &&
    (mode === "formation" || (mode === "bench-only" && unit.zone === "bench"))
  );
}

export function interactionAllowsDestination(
  mode: BoardInteractionMode,
  destination: Pick<BoardDestination, "zone">,
): boolean {
  return mode === "formation" || (mode === "bench-only" && destination.zone === "bench");
}

type PhaserBoardProps = BoardPayload & {
  phase: string;
  combatEvents: CombatFxEvent[];
  eventSequence: number;
  speed: number;
  particles: boolean;
  combatNumbers: boolean;
  reducedMotion: boolean;
  onMoveUnit: (move: BoardMove) => boolean;
  onSelectUnit: (unitId: string | null) => void;
};

type SceneBridge = {
  sync: (payload: BoardPayload, forceRebuild?: boolean) => void;
  refreshLayout: (width: number, height: number) => void;
  animateEvents: (
    events: CombatFxEvent[],
    speed: number,
    particles: boolean,
    combatNumbers: boolean,
    reducedMotion: boolean,
  ) => void;
};

const CANVAS_WIDTH = BOARD_GEOMETRY.worldWidth;
const CANVAS_HEIGHT = BOARD_GEOMETRY.worldHeight;
const CELL_W = BOARD_GEOMETRY.cellWidth;
const CELL_H = BOARD_GEOMETRY.cellHeight;
const GRID_X = BOARD_GEOMETRY.gridX;
const GRID_Y = BOARD_GEOMETRY.gridY;

export default function PhaserBoard({
  units,
  selectedId,
  interactionMode,
  phase,
  capacity,
  boardSkin,
  combatEvents,
  eventSequence,
  speed,
  particles,
  combatNumbers,
  reducedMotion,
  onMoveUnit,
  onSelectUnit,
}: PhaserBoardProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<import("phaser").Game | null>(null);
  const bridgeRef = useRef<SceneBridge | null>(null);
  const animatedSequenceRef = useRef<string | null>(null);
  const latestRef = useRef<BoardPayload>({
    units,
    selectedId,
    interactionMode,
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
    interactionMode,
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
        const initialAssets = resolveInitialBoardAssets(
          latestRef.current.units,
          latestRef.current.boardSkin,
        );

        class GrandLineBoard extends Phaser.Scene implements SceneBridge {
          private mapLayer?: Phaser.GameObjects.Container;
          private mapBackdrop?: Phaser.GameObjects.Image;
          private ambientLayer?: Phaser.GameObjects.Container;
          private currentBoardSkin?: BoardSkin;
          private tokenLayer?: Phaser.GameObjects.Container;
          private tokenObjects = new Map<
            string,
            Phaser.GameObjects.Container
          >();
          private selectionMarkers = new Map<
            string,
            Phaser.GameObjects.Text
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
          private resourceBars = new Map<
            string,
            {
              graphics: Phaser.GameObjects.Graphics;
              team: BoardUnit["team"];
              maxHp: number;
              display: { hp: number; shield: number; energy: number };
              layout: ReturnType<typeof resourceBarLayout>;
            }
          >();
          private hpState = new Map<
            string,
            { current: number; max: number }
          >();
          private shieldState = new Map<string, number>();
          private energyState = new Map<string, number>();
          private statusLabels = new Map<string, Phaser.GameObjects.Text>();
          private statusExpiries = new Map<string, Map<string, number>>();
          private animationGeneration = 0;
          private requestedTextures = new Set<string>();
          private failedTextures = new Set<string>();
          private payload: BoardPayload = latestRef.current;

          constructor() {
            super(BOARD_SCENE_KEY);
          }

          private boardColumnSafeScreenBounds(width: number, height: number) {
            const stageElement = hostRef.current?.parentElement;
            const boardColumn = stageElement?.parentElement?.querySelector(
              ".board-column",
            );
            if (!(stageElement instanceof HTMLElement)) return undefined;
            if (!(boardColumn instanceof HTMLElement)) return undefined;
            const stageBounds = stageElement.getBoundingClientRect();
            const boardColumnBounds = boardColumn.getBoundingClientRect();
            return safeScreenBoundsWithinStage(
              stageBounds,
              boardColumnBounds,
              width,
              height,
            );
          }

          private fitCameraToViewport(width: number, height: number) {
            const safeScreenBounds = this.boardColumnSafeScreenBounds(
              width,
              height,
            );
            const frame = resolveBoardCameraFrame(
              width,
              height,
              safeScreenBounds,
            );
            const stageElement = hostRef.current?.parentElement;
            if (stageElement instanceof HTMLElement) {
              stageElement.dataset.cameraZoom = frame.zoom.toFixed(6);
              stageElement.dataset.canvasWidth = String(Math.round(width));
              stageElement.dataset.canvasHeight = String(Math.round(height));
            }
            const camera = this.cameras.main;
            camera
              .setZoom(frame.zoom)
              .centerOn(frame.centerX, frame.centerY);
            if (this.mapBackdrop) {
              const source = this.mapBackdrop.texture.getSourceImage() as {
                width: number;
                height: number;
              };
              const cover = resolveBoardBackdrop(frame, source);
              this.mapBackdrop
                .setPosition(cover.x, cover.y)
                .setDisplaySize(cover.width, cover.height);
            }
          }

          private handleScaleResize = (gameSize: {
            width: number;
            height: number;
          }) => {
            this.fitCameraToViewport(gameSize.width, gameSize.height);
          };

          refreshLayout(width: number, height: number) {
            const nextWidth = Math.max(1, Math.round(width));
            const nextHeight = Math.max(1, Math.round(height));
            if (
              this.scale.width !== nextWidth ||
              this.scale.height !== nextHeight
            ) {
              this.scale.resize(nextWidth, nextHeight);
            }
            // Phaser's canvas pool can recycle the previous FIT canvas from
            // the Regatta. Clear its 1520:840 presentation before the RESIZE
            // board is painted inside the tactical stage.
            const canvasStyle = this.game.canvas.style;
            canvasStyle.width = "100%";
            canvasStyle.height = "100%";
            canvasStyle.marginLeft = "0px";
            canvasStyle.marginTop = "0px";
            this.fitCameraToViewport(nextWidth, nextHeight);
          }

          preload() {
            this.load.image(
              initialAssets.map.textureKey,
              initialAssets.map.assetPath,
            );
            initialAssets.animations.forEach((definition) => {
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
            this.fitCameraToViewport(this.scale.width, this.scale.height);
            this.scale.on("resize", this.handleScaleResize);
            this.events.once("shutdown", () => {
              this.scale.off("resize", this.handleScaleResize);
            });
            initialAssets.animations.forEach((definition) =>
              this.createCrewAnimations(definition),
            );
            this.drawMap(this.payload.boardSkin);
            this.createDestinationTargets();
            this.tokenLayer = this.add.container(0, 0).setDepth(20);
            this.sync(latestRef.current);
            bridgeRef.current = this;
            if (!cancelled) setIsReady(true);
          }

          private createCrewAnimations(definition: CrewAnimationDefinition) {
            const sheetKey = crewSheetKey(definition.assetKey);
            if (!this.textures.exists(sheetKey)) return;
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
            if (event.kind === "shield" && to) {
              battleVfx.shield(this, { at: to, team, speed });
              return;
            }
            if (event.kind === "damage" && to) {
              if ((event.shieldDamage ?? 0) > 0 && (event.healthDamage ?? 0) <= 0) {
                battleVfx.shield(this, { at: to, team, speed, radius: 20 });
              } else {
                battleVfx.impact(this, { at: to, team, speed });
              }
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
            const presentation = combatPresentationStyle(
              contentId,
              event.kind === "attack" ? "attack" : "cast",
            );
            if (event.kind === "attack") {
              if (presentation === "fire") {
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

            if (presentation === "lightning") {
              battleVfx.lightningStrike(this, { at: to, team, speed });
            } else if (presentation === "fire") {
              battleVfx.fireProjectile(this, { from, to, team, speed });
            } else if (presentation === "smoke") {
              battleVfx.smokeBurst(this, { at: to, team, speed, radius: 28 });
            } else if (presentation === "heal") {
              battleVfx.heal(this, { at: to, team, speed, radius: 25 });
              battleVfx.shield(this, { at: to, team, speed, radius: 24 });
            } else if (presentation === "slash") {
              battleVfx.slash(this, {
                from,
                to,
                team,
                speed,
                width: event.finisher ? 8 : 6,
              });
            } else {
              battleVfx.impact(this, { at: to, team, speed, radius: 17 });
            }
          }

          private playLungeTrail(
            unitId: string,
            from: Readonly<{ x: number; y: number }>,
            to: Readonly<{ x: number; y: number }>,
            speed: number,
          ) {
            const unit = this.payload.units.find(
              (candidate) => candidate.id === unitId,
            );
            battleVfx.slash(this, {
              from: { x: from.x, y: from.y - 4 },
              to: { x: to.x, y: to.y - 4 },
              team: unit?.team ?? "neutral",
              speed,
              width: 5,
            });

            const animated = this.animatedUnitSprites.get(unitId);
            if (!animated?.sprite.active) return;
            const sprite = animated.sprite;
            [0.22, 0.52].forEach((progress, index) => {
              const afterimage = this.add
                .sprite(
                  from.x + (to.x - from.x) * progress,
                  from.y + (to.y - from.y) * progress + sprite.y,
                  sprite.texture.key,
                  sprite.frame.name,
                )
                .setOrigin(sprite.originX, sprite.originY)
                .setDisplaySize(sprite.displayWidth, sprite.displayHeight)
                .setFlipX(sprite.flipX)
                .setTint(index === 0 ? 0xbdf7ff : 0xf8e49a)
                .setAlpha(index === 0 ? 0.38 : 0.25)
                .setDepth(119 - index);
              this.tweens.add({
                targets: afterimage,
                alpha: 0,
                duration: Math.max(1, Math.round((150 + index * 35) / speed)),
                ease: "Quad.Out",
                onComplete: () => afterimage.destroy(),
              });
            });
          }

          private clearMapLayers() {
            this.ambientLayer?.list.forEach((object) => {
              this.tweens.killTweensOf(object);
            });
            this.ambientLayer?.destroy(true);
            this.mapLayer?.destroy(true);
            this.ambientLayer = undefined;
            this.mapLayer = undefined;
            this.mapBackdrop = undefined;
          }

          private drawMap(boardSkin: BoardSkin) {
            this.clearMapLayers();
            const map = getBoardMapDefinition(boardSkin);
            this.currentBoardSkin = map.id;
            this.cameras.main.setBackgroundColor(0x061d2a);

            const mapLayer = this.add.container(0, 0).setDepth(0);
            this.mapLayer = mapLayer;
            if (this.textures.exists(map.textureKey)) {
              this.mapBackdrop = this.add
                .image(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, map.textureKey)
                .setOrigin(0.5);
              mapLayer.add(this.mapBackdrop);
            } else {
              const fallback = this.add.graphics();
              fallback.fillStyle(0x082a34, 1);
              fallback.fillRect(
                -CANVAS_WIDTH,
                -CANVAS_HEIGHT,
                CANVAS_WIDTH * 3,
                CANVAS_HEIGHT * 3,
              );
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
            this.fitCameraToViewport(this.scale.width, this.scale.height);

            const benchGuides = this.add.graphics();
            benchGuides.lineStyle(1, map.accentColor, 0.14);
            BENCH_DESTINATIONS.forEach((destination) => {
              const target = boardDestinationTarget(destination);
              const right = target.x + target.width;
              const bottom = target.y + target.height;
              const mark = 5;
              benchGuides.lineBetween(target.x, target.y, target.x + mark, target.y);
              benchGuides.lineBetween(target.x, target.y, target.x, target.y + mark);
              benchGuides.lineBetween(right, target.y, right - mark, target.y);
              benchGuides.lineBetween(right, target.y, right, target.y + mark);
              benchGuides.lineBetween(target.x, bottom, target.x + mark, bottom);
              benchGuides.lineBetween(target.x, bottom, target.x, bottom - mark);
              benchGuides.lineBetween(right, bottom, right - mark, bottom);
              benchGuides.lineBetween(right, bottom, right, bottom - mark);
            });
            mapLayer.add(benchGuides);

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
            PLAYER_BOARD_DESTINATIONS.forEach((destination) => {
              this.registerDestinationTarget(destination);
            });
            BENCH_DESTINATIONS.forEach((destination) => {
              this.registerDestinationTarget(destination);
            });
          }

          private registerDestinationTarget(
            destination: BoardDestination,
          ) {
            const key = destinationKey(destination);
            const target = boardDestinationTarget(destination);
            const { x, y } = target.center;
            const { width, height } = target;
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
            if (!unitId) return undefined;
            const unit = this.payload.units.find((item) => item.id === unitId);
            return unit && interactionAllowsUnit(this.payload.interactionMode, unit)
              ? unit
              : undefined;
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
              const destinationAllowed = interactionAllowsDestination(
                this.payload.interactionMode,
                target.destination,
              );
              if (target.surface.input) {
                target.surface.input.enabled = Boolean(selected && destinationAllowed);
              }

              if (!selected || !destinationAllowed) {
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
            if (
              !selected ||
              !interactionAllowsDestination(this.payload.interactionMode, destination) ||
              isSameDestination(selected, destination)
            ) return;
            return moveRef.current({
              unitId: selected.id,
              ...destination,
            });
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
            if (!interactionAllowsUnit(this.payload.interactionMode, unit)) {
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

          sync(payload: BoardPayload, forceRebuild = false) {
            if (
              !forceRebuild &&
              this.tokenObjects.size > 0 &&
              preservesActiveBattleTimeline(this.payload, payload)
            ) {
              const previous = this.payload;
              this.payload = payload;
              this.syncActiveBattleBench(previous, payload);
              return;
            }
            if (payload.phase !== this.payload.phase) {
              this.animationGeneration += 1;
              this.draggingUnitId = null;
              this.hoverDestinationKey = null;
            }
            if (payload.boardSkin !== this.currentBoardSkin) {
              const map = getBoardMapDefinition(payload.boardSkin);
              if (this.textures.exists(map.textureKey)) {
                this.drawMap(payload.boardSkin);
              } else {
                this.requestMapTexture(payload.boardSkin);
              }
            }
            this.payload = payload;
            if (!this.tokenLayer) return;
            this.requestAnimationTextures(payload.units);
            this.requestPortraitTextures(payload.units);
            this.resourceBars.forEach((bar) => {
              this.tweens.killTweensOf(bar.display);
            });
            this.tokenLayer.removeAll(true);
            this.tokenObjects.clear();
            this.selectionMarkers.clear();
            this.animatedUnitSprites.clear();
            this.unitFacings.clear();
            this.resourceBars.clear();
            this.hpState.clear();
            this.shieldState.clear();
            this.energyState.clear();
            this.statusLabels.clear();
            this.statusExpiries.clear();

            payload.units.forEach((unit) => {
              const token = this.makeToken(unit, payload);
              this.tokenLayer?.add(token);
              this.tokenObjects.set(unit.id, token);
            });
            this.faceUnitsTowardOpponents();
            this.refreshDestinationCues();
          }

          private removeToken(unitId: string) {
            const resourceBar = this.resourceBars.get(unitId);
            if (resourceBar) this.tweens.killTweensOf(resourceBar.display);
            const token = this.tokenObjects.get(unitId);
            if (token) {
              this.tweens.killTweensOf(token);
              token.destroy(true);
            }
            this.tokenObjects.delete(unitId);
            this.selectionMarkers.delete(unitId);
            this.animatedUnitSprites.delete(unitId);
            this.unitFacings.delete(unitId);
            this.resourceBars.delete(unitId);
            this.hpState.delete(unitId);
            this.shieldState.delete(unitId);
            this.energyState.delete(unitId);
            this.statusLabels.delete(unitId);
            this.statusExpiries.delete(unitId);
          }

          private syncActiveBattleBench(
            previous: BoardPayload,
            next: BoardPayload,
          ) {
            for (const unit of previous.units) {
              if (unit.zone === "bench") this.removeToken(unit.id);
            }
            const benchUnits = next.units.filter((unit) => unit.zone === "bench");
            this.requestAnimationTextures(benchUnits);
            this.requestPortraitTextures(benchUnits);
            for (const unit of benchUnits) {
              const token = this.makeToken(unit, next);
              this.tokenLayer?.add(token);
              this.tokenObjects.set(unit.id, token);
            }
            for (const [unitId, marker] of this.selectionMarkers) {
              marker.setVisible(next.selectedId === unitId);
            }
            this.refreshDestinationCues();
          }

          private portraitKey(unit: BoardUnit) {
            const presentationId = unit.formId
              ? `${unit.contentId}-${unit.formId}`
              : unit.contentId;
            return `crew-${presentationId.replace(/[^a-z0-9_-]/gi, "-")}`;
          }

          private requestMapTexture(boardSkin: BoardSkin) {
            const map = getBoardMapDefinition(boardSkin);
            if (
              this.textures.exists(map.textureKey) ||
              this.requestedTextures.has(map.textureKey) ||
              this.failedTextures.has(map.textureKey)
            ) {
              return;
            }
            this.requestedTextures.add(map.textureKey);
            this.load.image(map.textureKey, map.assetPath);
            this.load.once("loaderror", (file: Phaser.Loader.File) => {
              this.failedTextures.add(file.key);
            });
            this.load.once("complete", () => {
              if (
                this.payload.boardSkin === boardSkin &&
                this.textures.exists(map.textureKey)
              ) {
                this.drawMap(boardSkin);
                this.fitCameraToViewport(this.scale.width, this.scale.height);
              }
            });
            if (!this.load.isLoading()) this.load.start();
          }

          private requestAnimationTextures(unitsToLoad: BoardUnit[]) {
            const pending = resolveMissingAnimationDefinitions(unitsToLoad, {
              textureExists: (key) => this.textures.exists(key),
              requestedKeys: this.requestedTextures,
              failedKeys: this.failedTextures,
            });
            if (!pending.length) return;

            pending.forEach((definition) => {
              const key = crewSheetKey(definition.assetKey);
              this.requestedTextures.add(key);
              this.load.spritesheet(key, definition.sheetPath, {
                frameWidth: definition.frameWidth,
                frameHeight: definition.frameHeight,
              });
            });
            const markFailure = (file: Phaser.Loader.File) => {
              this.failedTextures.add(file.key);
            };
            this.load.on("loaderror", markFailure, this);
            this.load.once(
              "complete",
              () => {
                this.load.off("loaderror", markFailure, this);
                pending.forEach((definition) =>
                  this.createCrewAnimations(definition),
                );
                this.sync(this.payload, this.payload.phase !== "battle");
              },
              this,
            );
            if (!this.load.isLoading()) this.load.start();
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

          private drawResourceBar(unitId: string) {
            const bar = this.resourceBars.get(unitId);
            if (!bar) return;
            const { graphics, layout } = bar;
            graphics.clear().setVisible(layout.visible);
            if (!layout.visible || !graphics.active) return;

            const fill = resourceBarFill({
              ...bar.display,
              maxHp: bar.maxHp,
              team: bar.team,
            });
            const width = RESOURCE_BAR_GEOMETRY.width;
            const left = -width / 2;
            const healthOuterTop =
              layout.healthY - RESOURCE_BAR_GEOMETRY.healthOuterHeight / 2;
            const healthInnerTop =
              layout.healthY - RESOURCE_BAR_GEOMETRY.healthInnerHeight / 2;
            const energyOuterTop =
              layout.energyY - RESOURCE_BAR_GEOMETRY.energyOuterHeight / 2;
            const energyInnerTop =
              layout.energyY - RESOURCE_BAR_GEOMETRY.energyInnerHeight / 2;

            graphics
              .fillStyle(RESOURCE_BAR_COLORS.frame, 1)
              .fillRect(
                left - 1,
                healthOuterTop,
                width + 2,
                RESOURCE_BAR_GEOMETRY.healthOuterHeight,
              )
              .fillStyle(RESOURCE_BAR_COLORS.empty, 1)
              .fillRect(
                left,
                healthInnerTop,
                width,
                RESOURCE_BAR_GEOMETRY.healthInnerHeight,
              );
            if (fill.healthWidth > 0) {
              graphics
                .fillStyle(fill.healthColor, 1)
                .fillRect(
                  left,
                  healthInnerTop,
                  fill.healthWidth,
                  RESOURCE_BAR_GEOMETRY.healthInnerHeight,
                );
            }
            if (fill.shieldWidth > 0) {
              graphics
                .fillStyle(RESOURCE_BAR_COLORS.shield, 1)
                .fillRect(
                  left + fill.healthWidth,
                  healthInnerTop,
                  fill.shieldWidth,
                  RESOURCE_BAR_GEOMETRY.healthInnerHeight,
                );
            }
            graphics.lineStyle(1, RESOURCE_BAR_COLORS.frame, 0.78);
            fill.segmentXs.forEach((x) => {
              graphics.lineBetween(
                x,
                healthInnerTop,
                x,
                healthInnerTop + RESOURCE_BAR_GEOMETRY.healthInnerHeight,
              );
            });

            graphics
              .fillStyle(RESOURCE_BAR_COLORS.frame, 1)
              .fillRect(
                left - 1,
                energyOuterTop,
                width + 2,
                RESOURCE_BAR_GEOMETRY.energyOuterHeight,
              )
              .fillStyle(0x17142b, 1)
              .fillRect(
                left,
                energyInnerTop,
                width,
                RESOURCE_BAR_GEOMETRY.energyInnerHeight,
              );
            if (fill.energyWidth > 0) {
              graphics
                .fillStyle(fill.energyColor, 1)
                .fillRect(
                  left,
                  energyInnerTop,
                  fill.energyWidth,
                  RESOURCE_BAR_GEOMETRY.energyInnerHeight,
                );
            }
          }

          private transitionResourceBar(
            unitId: string,
            animationSpeed: number,
            immediate: boolean,
          ) {
            const bar = this.resourceBars.get(unitId);
            const hp = this.hpState.get(unitId);
            if (!bar || !hp) return;
            const target = {
              hp: hp.current,
              shield: this.shieldState.get(unitId) ?? 0,
              energy: this.energyState.get(unitId) ?? 0,
            };
            this.tweens.killTweensOf(bar.display);
            if (immediate || !bar.layout.visible) {
              Object.assign(bar.display, target);
              this.drawResourceBar(unitId);
              return;
            }
            this.tweens.add({
              targets: bar.display,
              ...target,
              duration: Math.max(
                1,
                Math.round(150 / Math.max(0.5, animationSpeed)),
              ),
              ease: "Linear",
              onUpdate: () => this.drawResourceBar(unitId),
              onComplete: () => this.drawResourceBar(unitId),
            });
          }

          private makeToken(unit: BoardUnit, payload: BoardPayload) {
            const position = boardDestinationCenter(unitDestination(unit));

            const container = this.add.container(position.x, position.y);
            const shadow = this.add.ellipse(2, 15, 43, 13, 0x07131a, 0.54);
            const isSelected = payload.selectedId === unit.id;
            const fallbackCard = this.add
              .rectangle(
                0,
                -3,
                unit.zone === "bench" ? 34 : 40,
                unit.zone === "bench" ? 38 : 44,
                unit.team === "enemy" ? 0x321c24 : 0x102f37,
                0.94,
              )
              .setStrokeStyle(
                isSelected ? 4 : 2,
                isSelected
                  ? 0xffd768
                  : unit.team === "enemy"
                    ? 0xe36b72
                    : 0xe2bd66,
                1,
              );
            const fallbackAccent = this.add.rectangle(
              0,
              unit.zone === "bench" ? 14 : 16,
              unit.zone === "bench" ? 28 : 34,
              3,
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
            const usesAnimation = Boolean(animationDefinition);
            const hasPortrait =
              this.textures.exists(portraitKey) &&
              !this.failedTextures.has(portraitKey);
            const startingFacing = initialBoardFacing(unit.team);
            this.unitFacings.set(unit.id, startingFacing);
            const spriteDisplaySize = animationDefinition
              ? unit.zone === "bench"
                ? Math.round(animationDefinition.displaySize * 0.72)
                : animationDefinition.displaySize
              : 46;
            const spriteY = animationDefinition
              ? unit.zone === "bench"
                ? Math.round(animationDefinition.yOffset * 0.66)
                : animationDefinition.yOffset
              : -6;
            const animatedSprite = usesAnimation
              ? this.add
                  .sprite(
                    0,
                    spriteY,
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
                  .setDisplaySize(spriteDisplaySize, spriteDisplaySize)
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
            fallbackCard.setVisible(!animatedSprite);
            fallbackAccent.setVisible(!animatedSprite);
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
            const barLayout = resourceBarLayout({
              phase: payload.phase,
              zone: unit.zone,
              spriteY,
              frameHeight: animationDefinition?.frameHeight ?? 64,
              displaySize: spriteDisplaySize,
              originY: animationDefinition?.originY ?? 0.5,
              idleVisualTopPx: animationDefinition?.idleVisualTopPx,
            });
            const initialShield = Math.max(0, unit.shield ?? 0);
            const initialEnergy = clamp(unit.energy ?? 0, 0, 100);
            const resourceBar = this.add.graphics();
            this.resourceBars.set(unit.id, {
              graphics: resourceBar,
              team: unit.team,
              maxHp: Math.max(1, unit.maxHp),
              display: {
                hp: clamp(unit.hp, 0, Math.max(1, unit.maxHp)),
                shield: initialShield,
                energy: initialEnergy,
              },
              layout: barLayout,
            });
            this.hpState.set(unit.id, {
              current: unit.hp,
              max: Math.max(1, unit.maxHp),
            });
            this.shieldState.set(unit.id, initialShield);
            this.energyState.set(unit.id, initialEnergy);
            this.drawResourceBar(unit.id);
            const statusLabel = this.add
              .text(0, barLayout.statusY, "", {
                fontFamily: '"Courier New", monospace',
                fontStyle: "bold",
                fontSize: "9px",
                color: "#fff1c6",
                stroke: "#06131a",
                strokeThickness: 3,
              })
              .setOrigin(0.5)
              .setVisible(false);
            this.statusLabels.set(unit.id, statusLabel);
            this.statusExpiries.set(unit.id, new Map());
            const stars = this.add
              .text(0, unit.zone === "bench" ? 27 : 31, "★".repeat(unit.star), {
                fontFamily: "Arial",
                fontSize: "8px",
                color: "#ffd45a",
                stroke: "#3b210d",
                strokeThickness: 1,
              })
              .setOrigin(0.5);
            const selectionMarker = this.add
              .text(
                0,
                barLayout.visible
                  ? barLayout.selectionY
                  : Math.floor(barLayout.visualTopY - 9),
                "▼",
                {
                  fontFamily: "Arial, sans-serif",
                  fontStyle: "bold",
                  fontSize: "13px",
                  color: "#fff0a2",
                  stroke: "#4a280d",
                  strokeThickness: 3,
                },
              )
              .setOrigin(0.5)
              .setVisible(isSelected);
            this.selectionMarkers.set(unit.id, selectionMarker);
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

            container.add([shadow, fallbackCard, fallbackAccent]);
            if (animatedSprite) container.add(animatedSprite);
            if (portrait) container.add(portrait);
            container.add([
              initial,
              name,
              resourceBar,
              statusLabel,
              stars,
              selectionMarker,
              ...itemPips,
            ]);
            container.setDepth(unit.team === "enemy" ? unit.y + 1 : unit.y + 10);
            const hitArea = animatedSprite
              ? unit.zone === "bench"
                ? ANIMATED_BENCH_HIT_AREA
                : ANIMATED_BOARD_HIT_AREA
              : FALLBACK_TOKEN_HIT_AREA;
            container.setInteractive(
              new Phaser.Geom.Rectangle(
                hitArea.x,
                hitArea.y,
                hitArea.width,
                hitArea.height,
              ),
              Phaser.Geom.Rectangle.Contains,
            );
            if (container.input) container.input.cursor = "pointer";
            let wasDragged = false;
            container.on("pointerup", () => {
              if (wasDragged) {
                wasDragged = false;
                return;
              }
              this.handleUnitClick(unit);
            });

            if (interactionAllowsUnit(payload.interactionMode, unit)) {
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
                (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
                  container.setPosition(dragX, dragY);
                  const destination = boardDestinationAtPoint(
                    pointer.worldX,
                    pointer.worldY,
                  );
                  const nextHover = destination
                    ? destinationKey(destination)
                    : null;
                  if (nextHover !== this.hoverDestinationKey) {
                    this.hoverDestinationKey = nextHover;
                    this.refreshDestinationCues(unit.id);
                  }
                },
              );
              container.on("dragend", (pointer: Phaser.Input.Pointer) => {
                this.tweens.add({
                  targets: container,
                  scale: 1,
                  duration: 80,
                });
                const destination = boardDestinationAtPoint(
                  pointer.worldX,
                  pointer.worldY,
                );
                const origin = boardDestinationCenter(unitDestination(unit));
                this.draggingUnitId = null;
                this.hoverDestinationKey = null;

                if (
                  destination &&
                  interactionAllowsDestination(payload.interactionMode, destination) &&
                  !isSameDestination(unit, destination)
                ) {
                  const accepted = moveRef.current({
                    unitId: unit.id,
                    ...destination,
                  });
                  if (accepted) {
                    const targetPosition = boardDestinationCenter(destination);
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
            showCombatNumbers: boolean,
            reduceMotion: boolean,
          ) {
            const speed = Math.max(0.5, animationSpeed);
            const generation = ++this.animationGeneration;
            const setHealth = (
              unitId: string,
              nextHealth: number,
              immediate = false,
            ) => {
              const state = this.hpState.get(unitId);
              if (!state) return;
              state.current = clamp(nextHealth, 0, state.max);
              this.transitionResourceBar(
                unitId,
                speed,
                immediate || reduceMotion,
              );
            };
            const setShield = (
              unitId: string,
              nextShield: number,
              immediate = false,
            ) => {
              const hp = this.hpState.get(unitId);
              if (!hp) return;
              const shield = Math.max(0, nextShield);
              this.shieldState.set(unitId, shield);
              this.transitionResourceBar(
                unitId,
                speed,
                immediate || reduceMotion,
              );
              if (shield <= 0) {
                const statuses = this.statusExpiries.get(unitId);
                statuses?.delete("emergency-shield");
                const label = this.statusLabels.get(unitId);
                if (statuses && label) {
                  const symbols = [...statuses.keys()]
                    .map((status) =>
                      status === "burn"
                        ? "🔥"
                        : status === "stun"
                          ? "✦"
                          : "◆",
                    )
                    .join(" ");
                  label.setText(symbols).setVisible(Boolean(symbols));
                }
              }
            };
            const setEnergy = (
              unitId: string,
              nextEnergy: number,
              immediate = false,
            ) => {
              const energy = clamp(nextEnergy, 0, 100);
              this.energyState.set(unitId, energy);
              this.transitionResourceBar(
                unitId,
                speed,
                immediate || reduceMotion,
              );
            };
            const statusIcon = (status: string) => {
              if (status === "burn") return "🔥";
              if (status === "stun") return "✦";
              if (status === "emergency-shield" || status.includes("protect")) {
                return "⬡";
              }
              return "◆";
            };
            const refreshStatuses = (unitId: string, tick: number) => {
              const statuses = this.statusExpiries.get(unitId);
              const label = this.statusLabels.get(unitId);
              if (!statuses || !label) return;
              for (const [status, untilTick] of statuses) {
                if (untilTick > 0 && untilTick <= tick) statuses.delete(status);
              }
              const text = [...statuses.keys()].map(statusIcon).join(" ");
              label.setText(text).setVisible(Boolean(text));
            };
            const applyStatus = (
              unitId: string,
              status: string,
              tick: number,
              durationTicks: number,
            ) => {
              if (!status) return;
              const statuses = this.statusExpiries.get(unitId);
              if (!statuses) return;
              statuses.set(status, durationTicks > 0 ? tick + durationTicks : 0);
              refreshStatuses(unitId, tick);
              if (durationTicks > 0) {
                this.time.delayedCall(
                  Math.max(1, Math.round((durationTicks * 100) / speed)),
                  () => {
                    if (generation !== this.animationGeneration) return;
                    refreshStatuses(unitId, tick + durationTicks);
                  },
                );
              }
            };
            const showFloater = (
              target: Phaser.GameObjects.Container | undefined,
              text: string,
              color: string,
              emphatic = false,
              offset = 0,
            ) => {
              if (!showCombatNumbers || !target || !text) return;
              const floater = this.add
                .text(target.x, target.y - 29 - offset, text, {
                  fontFamily: '"Courier New", monospace',
                  fontStyle: "bold",
                  fontSize: emphatic ? "15px" : "12px",
                  color,
                  stroke: "#07131a",
                  strokeThickness: emphatic ? 4 : 3,
                })
                .setOrigin(0.5)
                .setDepth(160);
              if (reduceMotion) {
                this.time.delayedCall(Math.round(430 / speed), () => floater.destroy());
                return;
              }
              this.tweens.add({
                targets: floater,
                y: floater.y - 24,
                alpha: 0,
                duration: Math.round(560 / speed),
                onComplete: () => floater.destroy(),
              });
            };
            const showCastName = (
              source: Phaser.GameObjects.Container | undefined,
              name: string | undefined,
            ) => {
              if (!source || !name) return;
              const banner = this.add
                .text(source.x, source.y - 48, name.toUpperCase(), {
                  fontFamily: '"Courier New", monospace',
                  fontStyle: "bold",
                  fontSize: "10px",
                  color: "#f1d8ff",
                  backgroundColor: "#251938dd",
                  stroke: "#07131a",
                  strokeThickness: 2,
                  padding: { x: 5, y: 3 },
                })
                .setOrigin(0.5)
                .setDepth(165);
              if (reduceMotion) {
                this.time.delayedCall(Math.round(500 / speed), () => banner.destroy());
                return;
              }
              this.tweens.add({
                targets: banner,
                y: banner.y - 8,
                alpha: 0,
                delay: Math.round(260 / speed),
                duration: Math.round(380 / speed),
                onComplete: () => banner.destroy(),
              });
            };

            events.forEach((event) => {
              const presentationOffset =
                event.presentationOffsetMs ??
                (event.kind === "ability-hit"
                  ? sequentialAbilityHitDelayMs(event.hitIndex ?? 1)
                  : 0);
              const delay = Math.max(
                0,
                Math.round((event.tick * 100 + presentationOffset) / speed),
              );
              this.time.delayedCall(delay, () => {
                if (generation !== this.animationGeneration) return;
                const source = event.sourceId
                  ? this.tokenObjects.get(event.sourceId)
                  : undefined;
                const target = event.targetId
                  ? this.tokenObjects.get(event.targetId)
                  : undefined;
                const targets = (event.targetIds?.length
                  ? event.targetIds
                  : event.targetId
                    ? [event.targetId]
                    : [])
                  .map((id) => this.tokenObjects.get(id))
                  .filter(
                    (candidate): candidate is Phaser.GameObjects.Container =>
                      Boolean(candidate),
                  );

                this.payload.units.forEach((unit) => refreshStatuses(unit.id, event.tick));

                if (
                  event.kind === "move" &&
                  source &&
                  event.toX !== undefined &&
                  event.toY !== undefined
                ) {
                  this.playCrewAnimation(event.sourceId, "move", speed);
                  const destination = boardCellCenter(event.toX, event.toY);
                  const destinationX = destination.x;
                  this.faceUnit(event.sourceId ?? "", destinationX);
                  const destinationY = destination.y;
                  if (reduceMotion) {
                    source.setPosition(destinationX, destinationY);
                  } else {
                    this.tweens.add({
                      targets: source,
                      x: destinationX,
                      y: destinationY,
                      duration: Math.round(125 / speed),
                    });
                  }
                  return;
                }

                if (
                  event.kind === "displace" &&
                  event.to &&
                  (event.unitId || event.sourceId)
                ) {
                  const displacedUnitId = event.unitId || event.sourceId || "";
                  const displaced = this.tokenObjects.get(displacedUnitId);
                  if (!displaced) return;
                  const destination = boardCellCenter(event.to.x, event.to.y);
                  const origin = event.from
                    ? boardCellCenter(event.from.x, event.from.y)
                    : { x: displaced.x, y: displaced.y };
                  this.tweens.killTweensOf(displaced);
                  this.faceUnit(displacedUnitId, destination.x);

                  if (
                    event.movementKind === "lunge" &&
                    showParticles &&
                    !reduceMotion
                  ) {
                    this.playLungeTrail(
                      displacedUnitId,
                      origin,
                      destination,
                      speed,
                    );
                  }

                  if (reduceMotion) {
                    displaced.setPosition(destination.x, destination.y);
                  } else {
                    this.tweens.add({
                      targets: displaced,
                      x: destination.x,
                      y: destination.y,
                      duration: Math.max(1, Math.round(80 / speed)),
                      ease: "Cubic.Out",
                    });
                  }
                  return;
                }

                if (
                  source &&
                  target &&
                  (event.kind === "attack" ||
                    event.kind === "cast" ||
                    event.kind === "ability-hit")
                ) {
                  if (event.kind !== "ability-hit") {
                    this.playCrewAnimation(
                      event.sourceId,
                      event.kind === "cast" ? "cast" : "attack",
                      speed,
                    );
                  }
                  this.faceUnit(event.sourceId ?? "", target.x);
                  this.faceUnit(event.targetId ?? "", source.x);
                  if (event.kind === "cast") {
                    showCastName(source, event.abilityName);
                    battleVfx.telegraph(this, {
                      from: { x: source.x, y: source.y - 4 },
                      targets: (targets.length ? targets : [target]).map((entry) => ({
                        x: entry.x,
                        y: entry.y - 4,
                      })),
                      shape: event.telegraph ?? "target",
                      team:
                        this.payload.units.find((unit) => unit.id === event.sourceId)
                          ?.team ?? "neutral",
                      speed,
                      reducedMotion: reduceMotion,
                    });
                  }
                  if (
                    showParticles &&
                    !reduceMotion &&
                    !event.deferImpactToAbilityHits
                  ) {
                    (targets.length ? targets : [target]).forEach((castTarget) =>
                      this.playCombatVfx(event, source, castTarget, speed),
                    );
                  }
                  if (!reduceMotion && event.kind !== "ability-hit") {
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
                }

                if (target && event.kind === "damage") {
                  this.playCrewAnimation(event.targetId, "hit", speed);
                  if (source) this.faceUnit(event.targetId ?? "", source.x);
                  const hp = this.hpState.get(event.targetId ?? "");
                  if (hp) {
                    const splitDamageAvailable =
                      (event.healthDamage ?? 0) > 0 ||
                      (event.shieldDamage ?? 0) > 0;
                    const healthDamage = splitDamageAvailable
                      ? Math.max(0, event.healthDamage ?? 0)
                      : Math.max(0, event.amount ?? 0);
                    const shieldDamage = Math.max(0, event.shieldDamage ?? 0);
                    setHealth(
                      event.targetId ?? "",
                      hp.current - healthDamage,
                    );
                    setShield(
                      event.targetId ?? "",
                      (this.shieldState.get(event.targetId ?? "") ?? 0) -
                        shieldDamage,
                    );
                    if (shieldDamage > 0) {
                      showFloater(target, `−${shieldDamage} SHIELD`, "#75cfff", false, 12);
                    }
                    if (healthDamage > 0) {
                      showFloater(
                        target,
                        `${event.critical ? "CRIT " : ""}−${healthDamage}`,
                        event.critical ? "#ffd45a" : "#ff8b72",
                        event.critical,
                      );
                    }
                  }
                } else if (target && event.kind === "heal") {
                  const hp = this.hpState.get(event.targetId ?? "");
                  if (hp) {
                    setHealth(
                      event.targetId ?? "",
                      hp.current + Math.max(0, event.amount ?? 0),
                    );
                  }
                  showFloater(target, `+${Math.max(0, event.amount ?? 0)}`, "#74ed99");
                } else if (target && event.kind === "shield") {
                  setShield(
                    event.targetId ?? "",
                    (this.shieldState.get(event.targetId ?? "") ?? 0) +
                      Math.max(0, event.amount ?? 0),
                  );
                  showFloater(
                    target,
                    `+${Math.max(0, event.amount ?? 0)} SHIELD`,
                    "#75cfff",
                  );
                } else if (event.kind === "energy") {
                  const unitId = event.targetId || event.sourceId;
                  if (unitId) {
                    const fallback =
                      (this.energyState.get(unitId) ?? 0) +
                      (event.energyDelta ?? event.amount ?? 0);
                    setEnergy(unitId, event.energyValue ?? fallback);
                  }
                } else if (target && event.kind === "status") {
                  applyStatus(
                    event.targetId ?? "",
                    event.status ?? "status",
                    event.tick,
                    event.durationTicks ?? 0,
                  );
                } else if (target && event.kind === "dodge") {
                  showFloater(target, "DODGE", "#fff0a2", true);
                } else if (target && event.kind === "buff") {
                  showFloater(
                    target,
                    event.label ?? `+${Math.max(0, event.amount ?? 0)} ATK`,
                    "#f0ba62",
                  );
                } else if (target && event.kind === "defeat") {
                  setHealth(event.targetId ?? "", 0);
                  setShield(event.targetId ?? "", 0);
                  setEnergy(event.targetId ?? "", 0);
                  this.playCrewAnimation(event.targetId, "defeat", speed);
                }

                if (
                  showParticles &&
                  !reduceMotion &&
                  (event.kind === "damage" ||
                    event.kind === "heal" ||
                    event.kind === "shield" ||
                    event.kind === "defeat")
                ) {
                  this.playCombatVfx(event, source, target, speed);
                }

                const reacts =
                  target &&
                  (event.kind === "damage" ||
                    event.kind === "heal" ||
                    event.kind === "shield" ||
                    event.kind === "status" ||
                    event.kind === "dodge" ||
                    event.kind === "defeat");
                if (target && reacts && !reduceMotion) {
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

                }
              });
            });

            const maxPresentationTimeMs = events.reduce(
              (highest, event) =>
                Math.max(
                  highest,
                  event.tick * 100 + (event.presentationOffsetMs ?? 0),
                ),
              0,
            );
            this.time.delayedCall(
              Math.round(maxPresentationTimeMs / speed) + Math.round(720 / speed),
              () => {
                if (generation !== this.animationGeneration) return;
                for (const unit of this.payload.units) {
                  if (unit.finalHp === undefined) continue;
                  setHealth(unit.id, unit.finalHp, true);
                  setShield(unit.id, unit.finalShield ?? 0, true);
                  setEnergy(unit.id, unit.finalEnergy ?? 0, true);
                  if (unit.finalHp <= 0) {
                    const token = this.tokenObjects.get(unit.id);
                    token?.setAlpha(0).setScale(0.86);
                  }
                }
              },
            );
          }
        }

        const game = new Phaser.Game(
          createBoardGameConfig(
            Phaser,
            hostRef.current,
            GrandLineBoard,
            CANVAS_WIDTH,
            CANVAS_HEIGHT,
          ),
        );
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
    if (!isReady) return;
    const stageElement = hostRef.current?.parentElement;
    if (!(stageElement instanceof HTMLElement)) return;

    let animationFrame = 0;
    const refreshLayout = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        const bounds = stageElement.getBoundingClientRect();
        if (bounds.width <= 0 || bounds.height <= 0) return;
        bridgeRef.current?.refreshLayout(bounds.width, bounds.height);
      });
    };

    const resizeObserver = new ResizeObserver(refreshLayout);
    resizeObserver.observe(stageElement);
    const boardColumn = stageElement.parentElement?.querySelector(
      ".board-column",
    );
    if (boardColumn instanceof HTMLElement) {
      resizeObserver.observe(boardColumn);
    }
    refreshLayout();

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
    };
  }, [isReady]);

  useEffect(() => {
    bridgeRef.current?.sync({
      units,
      selectedId,
      interactionMode,
      phase,
      capacity,
      boardSkin,
    });
  }, [units, selectedId, interactionMode, phase, capacity, boardSkin]);

  useEffect(() => {
    const animationKey = `${eventSequence}:${speed}:${Number(particles)}:${Number(combatNumbers)}:${Number(reducedMotion)}`;
    if (
      !isReady ||
      !eventSequence ||
      !combatEvents.length ||
      animatedSequenceRef.current === animationKey
    ) {
      return;
    }
    animatedSequenceRef.current = animationKey;
    // Rebuild from the canonical initial snapshot before replaying at a newly
    // selected speed; scheduled tweens never become combat state.
    bridgeRef.current?.sync(latestRef.current, true);
    bridgeRef.current?.animateEvents(
      combatEvents,
      speed,
      particles,
      combatNumbers,
      reducedMotion,
    );
  }, [
    combatEvents,
    eventSequence,
    isReady,
    speed,
    particles,
    combatNumbers,
    reducedMotion,
  ]);

  if (failed) {
    return (
      <CssBoardFallback
        units={units}
        selectedId={selectedId}
        interactionMode={interactionMode}
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
      data-event-sequence={eventSequence}
      data-interaction-mode={interactionMode}
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

function CssBoardFallback({
  units,
  selectedId,
  interactionMode,
  capacity,
  boardSkin,
  onMoveUnit,
  onSelectUnit,
}: Pick<
  PhaserBoardProps,
  | "units"
  | "selectedId"
  | "interactionMode"
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
                interactionMode !== "formation" ||
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
              disabled={interactionMode === "none"}
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
