"use client";

import { useEffect, useRef, useState } from "react";
import {
  CAROUSEL_DIRECTION_ORDER,
  CAROUSEL_GEOMETRY,
  carouselDirection,
  carouselDirectionVector,
  carouselInterpolationDuration,
  carouselOrbitPoint,
  clampCarouselTarget,
  DEFAULT_BOUNTY_ITEM_ORDER,
  type CarouselDirection,
  type CarouselPoint,
} from "./carouselGeometry";

export type CarouselParticipantView = Readonly<{
  playerId: string;
  name: string;
  rank: number;
  paletteIndex?: number;
  color?: number | string;
  spawnPosition: CarouselPoint;
  position: CarouselPoint;
  targetPosition: CarouselPoint;
  releaseTick: number;
  reactionDelayTicks?: number;
  moving: boolean;
  claimedChoiceId: string | null;
}>;

export type CarouselTokenView = Readonly<{
  id: string;
  itemId: string;
  contentId?: string;
  name: string;
  description?: string;
  icon?: string;
  color?: number | string;
  itemColumn?: number;
  orbitIndex: number;
  position?: CarouselPoint;
  takenByPlayerId: string | null;
  claimedAtTick?: number | null;
}>;

export type CarouselPresentationEvent = Readonly<{
  id?: string;
  type: string;
  tick: number;
  playerId?: string;
  choiceId?: string;
  itemId?: string;
  playerAId?: string;
  playerBId?: string;
  playerIds?: readonly string[];
  from?: CarouselPoint;
  to?: CarouselPoint;
}>;

export type CarouselPresentationSnapshot = Readonly<{
  tick: number;
  durationTicks: number;
  finishAtTick?: number | null;
  orbitDirection?: 1 | -1;
  participants: readonly CarouselParticipantView[];
  choices: readonly CarouselTokenView[];
  events?: readonly CarouselPresentationEvent[];
}>;

export type CarouselSoundCue = Readonly<{
  kind: "release" | "collision" | "claim" | "timeout" | "complete";
  event: CarouselPresentationEvent;
}>;

export type CarouselAssetUrls = Readonly<{
  arena: string;
  boats: string;
  bounties: string;
}>;

export type PhaserCarouselProps = Readonly<{
  snapshot: CarouselPresentationSnapshot;
  playerId: string;
  tickMs?: number;
  reducedMotion: boolean;
  highContrast: boolean;
  recommendedChoiceId?: string | null;
  assets?: Partial<CarouselAssetUrls>;
  className?: string;
  onSetTarget: (target: CarouselPoint) => void;
  onHoverChoice?: (choiceId: string | null) => void;
  onSound?: (cue: CarouselSoundCue) => void;
  onReady?: () => void;
  onFailure?: (error: Error) => void;
  onAssetFallback?: (missingAssetKeys: readonly string[]) => void;
  onFallbackAutoPick?: () => void;
}>;

type CarouselPayload = Readonly<{
  snapshot: CarouselPresentationSnapshot;
  playerId: string;
  tickMs: number;
  reducedMotion: boolean;
  highContrast: boolean;
  recommendedChoiceId: string | null;
}>;

type SceneBridge = {
  sync: (payload: CarouselPayload) => void;
};

const ARENA_KEY = "bounty-regatta-arena";
const BOAT_SHEET_KEY = "bounty-regatta-boats";
const BOUNTY_SHEET_KEY = "bounty-regatta-items";

const DEFAULT_CAROUSEL_ASSETS: CarouselAssetUrls = Object.freeze({
  arena: "/assets/carousel/ocean-arena.png",
  boats: "/assets/carousel/boats.png",
  bounties: "/assets/carousel/bounties.png",
});

const BOAT_COLORS = Object.freeze([
  0xd9544d,
  0x4e92ce,
  0xe2b84f,
  0x68b486,
  0x9b72c7,
  0xdc7fa1,
  0x56b6b0,
  0xd78145,
]);

function finitePoint(point: CarouselPoint): CarouselPoint {
  return {
    x: Number.isFinite(point.x) ? point.x : CAROUSEL_GEOMETRY.centerX,
    y: Number.isFinite(point.y) ? point.y : CAROUSEL_GEOMETRY.centerY,
  };
}

function paletteIndex(value: number | undefined) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(7, Math.floor(value ?? 0)));
}

function colorNumber(value: number | string | undefined, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value & 0xffffff;
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value.replace(/^#/, ""), 16);
    if (Number.isFinite(parsed)) return parsed & 0xffffff;
  }
  return fallback;
}

function directionIndex(direction: CarouselDirection) {
  return Math.max(0, CAROUSEL_DIRECTION_ORDER.indexOf(direction));
}

export function carouselBoatFrame(
  participantPalette: number,
  direction: CarouselDirection,
  animationFrame: number,
) {
  return (
    paletteIndex(participantPalette) * 32 +
    directionIndex(direction) * 4 +
    Math.max(0, Math.min(3, Math.floor(animationFrame)))
  );
}

export function carouselBountyFrame(itemColumn: number, animationFrame: number) {
  return (
    Math.max(0, Math.min(3, Math.floor(animationFrame))) * 8 +
    Math.max(0, Math.min(7, Math.floor(itemColumn)))
  );
}

function itemColumn(choice: CarouselTokenView) {
  if (Number.isFinite(choice.itemColumn)) {
    return Math.max(0, Math.min(7, Math.floor(choice.itemColumn ?? 0)));
  }
  const knownIndex = DEFAULT_BOUNTY_ITEM_ORDER.indexOf(
    choice.itemId as (typeof DEFAULT_BOUNTY_ITEM_ORDER)[number],
  );
  return knownIndex >= 0 ? knownIndex : 0;
}

function eventKey(event: CarouselPresentationEvent, index: number) {
  if (event.id) return event.id;
  switch (event.type) {
    case "release":
      return `${event.tick}:release:${event.playerId}`;
    case "move":
      return `${event.tick}:move:${event.playerId}:${event.to?.x}:${event.to?.y}`;
    case "collision":
      return `${event.tick}:collision:${event.playerAId}:${event.playerBId}`;
    case "claim":
      return `${event.tick}:claim:${event.playerId}:${event.choiceId}`;
    case "timeout":
      return `${event.tick}:timeout:${(event.playerIds ?? []).join(",")}`;
    case "complete":
      return `${event.tick}:complete`;
    default:
      return `${index}`;
  }
}

function isCarouselSoundKind(
  value: string,
): value is CarouselSoundCue["kind"] {
  return ["release", "collision", "claim", "timeout", "complete"].includes(
    value,
  );
}

export default function PhaserCarousel({
  snapshot,
  playerId,
  tickMs = 50,
  reducedMotion,
  highContrast,
  recommendedChoiceId = null,
  assets,
  className,
  onSetTarget,
  onHoverChoice,
  onSound,
  onReady,
  onFailure,
  onAssetFallback,
  onFallbackAutoPick,
}: PhaserCarouselProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<import("phaser").Game | null>(null);
  const bridgeRef = useRef<SceneBridge | null>(null);
  const setTargetRef = useRef(onSetTarget);
  const hoverRef = useRef(onHoverChoice);
  const soundRef = useRef(onSound);
  const readyRef = useRef(onReady);
  const failureRef = useRef(onFailure);
  const assetFallbackRef = useRef(onAssetFallback);
  const [isReady, setIsReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const payload: CarouselPayload = {
    snapshot,
    playerId,
    tickMs,
    reducedMotion,
    highContrast,
    recommendedChoiceId,
  };
  const latestRef = useRef(payload);
  latestRef.current = payload;
  setTargetRef.current = onSetTarget;
  hoverRef.current = onHoverChoice;
  soundRef.current = onSound;
  readyRef.current = onReady;
  failureRef.current = onFailure;
  assetFallbackRef.current = onAssetFallback;

  const resolvedAssets: CarouselAssetUrls = {
    ...DEFAULT_CAROUSEL_ASSETS,
    ...assets,
  };

  useEffect(() => {
    let cancelled = false;

    async function mountCarousel() {
      if (!hostRef.current || gameRef.current) return;

      try {
        const PhaserModule = await import("phaser");
        if (cancelled || !hostRef.current) return;
        const Phaser = PhaserModule.default;

        type BoatDisplay = {
          participant: CarouselParticipantView;
          container: Phaser.GameObjects.Container;
          body: Phaser.GameObjects.Sprite | Phaser.GameObjects.Graphics;
          wake: Phaser.GameObjects.Graphics;
          contrastOutline: Phaser.GameObjects.Graphics;
          label: Phaser.GameObjects.Text;
          arrow: Phaser.GameObjects.Text;
          status: Phaser.GameObjects.Text;
          tow?: Phaser.GameObjects.Sprite | Phaser.GameObjects.Graphics;
          towChoiceId?: string;
          direction: CarouselDirection;
          hasSynced: boolean;
        };

        type BountyDisplay = {
          choice: CarouselTokenView;
          container: Phaser.GameObjects.Container;
          body: Phaser.GameObjects.Sprite | Phaser.GameObjects.Graphics;
          recommendation: Phaser.GameObjects.Graphics;
          contrastOutline: Phaser.GameObjects.Graphics;
          hitZone: Phaser.GameObjects.Zone;
          hasSynced: boolean;
        };

        const missingAssetKeys = new Set<string>();

        class BountyRegattaScene extends Phaser.Scene implements SceneBridge {
          private payload: CarouselPayload = latestRef.current;
          private boats = new Map<string, BoatDisplay>();
          private bounties = new Map<string, BountyDisplay>();
          private targetMarker?: Phaser.GameObjects.Container;
          private tooltip?: Phaser.GameObjects.Container;
          private tooltipTitle?: Phaser.GameObjects.Text;
          private tooltipDescription?: Phaser.GameObjects.Text;
          private seenEvents = new Set<string>();
          private initializedEvents = false;
          private fallbackArena?: Phaser.GameObjects.Graphics;

          constructor() {
            super("bounty-regatta");
          }

          preload() {
            this.load.on("loaderror", (file: { key?: string }) => {
              if (file.key) missingAssetKeys.add(file.key);
            });
            this.load.image(ARENA_KEY, resolvedAssets.arena);
            this.load.spritesheet(BOAT_SHEET_KEY, resolvedAssets.boats, {
              frameWidth: 96,
              frameHeight: 96,
            });
            this.load.spritesheet(BOUNTY_SHEET_KEY, resolvedAssets.bounties, {
              frameWidth: 64,
              frameHeight: 64,
            });
          }

          create() {
            this.cameras.main
              .setBounds(
                0,
                0,
                CAROUSEL_GEOMETRY.worldWidth,
                CAROUSEL_GEOMETRY.worldHeight,
              )
              .centerOn(
                CAROUSEL_GEOMETRY.centerX,
                CAROUSEL_GEOMETRY.centerY,
              );
            this.drawArena();
            this.createTargetMarker();
            this.createTooltip();
            this.input.on(
              "pointerdown",
              (pointer: Phaser.Input.Pointer) => this.handlePointer(pointer),
            );
            this.events.once("shutdown", () => {
              this.input.removeAllListeners("pointerdown");
            });
            this.sync(latestRef.current);
            bridgeRef.current = this;
            if (missingAssetKeys.size) {
              assetFallbackRef.current?.([...missingAssetKeys].sort());
            }
            if (!cancelled) {
              setIsReady(true);
              readyRef.current?.();
            }
          }

          private textureAvailable(key: string) {
            return this.textures.exists(key) && !missingAssetKeys.has(key);
          }

          private drawArena() {
            if (this.textureAvailable(ARENA_KEY)) {
              this.add
                .image(
                  CAROUSEL_GEOMETRY.centerX,
                  CAROUSEL_GEOMETRY.centerY,
                  ARENA_KEY,
                )
                .setDisplaySize(
                  CAROUSEL_GEOMETRY.worldWidth,
                  CAROUSEL_GEOMETRY.worldHeight,
                )
                .setDepth(-50);
            } else {
              const water = this.add.graphics().setDepth(-50);
              water.fillStyle(0x062b3b, 1).fillRect(0, 0, 1_520, 840);
              for (let row = 0; row < 14; row += 1) {
                water
                  .fillStyle(row % 2 ? 0x0b4254 : 0x0a3548, 0.54)
                  .fillRect(0, row * 60, 1_520, 30);
              }
              for (let row = 0; row < 9; row += 1) {
                const y = 78 + row * 86;
                const shift = row % 2 ? 52 : 0;
                for (let column = 0; column < 12; column += 1) {
                  water
                    .lineStyle(3, 0x54a5b6, 0.22)
                    .beginPath()
                    .moveTo(shift + column * 140, y)
                    .lineTo(shift + column * 140 + 42, y - 8)
                    .lineTo(shift + column * 140 + 84, y)
                    .strokePath();
                }
              }
              this.fallbackArena = water;
            }

            const markings = this.add.graphics().setDepth(-20);
            const lineColor = this.payload.highContrast ? 0xffe28a : 0x73cbd2;
            markings
              .lineStyle(this.payload.highContrast ? 5 : 3, lineColor, 0.62)
              .strokeEllipse(
                CAROUSEL_GEOMETRY.centerX,
                CAROUSEL_GEOMETRY.centerY,
                CAROUSEL_GEOMETRY.orbitRadiusX * 2,
                CAROUSEL_GEOMETRY.orbitRadiusY * 2,
              )
              .lineStyle(2, 0xdcb85a, 0.38)
              .strokeCircle(
                CAROUSEL_GEOMETRY.centerX,
                CAROUSEL_GEOMETRY.centerY,
                104,
              );
            this.add
              .text(
                CAROUSEL_GEOMETRY.centerX,
                CAROUSEL_GEOMETRY.centerY,
                "BOUNTY\nREGATTA",
                {
                  align: "center",
                  color: this.payload.highContrast ? "#fff2a8" : "#d8bd76",
                  fontFamily: "monospace",
                  fontSize: "24px",
                  fontStyle: "bold",
                  stroke: "#031820",
                  strokeThickness: 7,
                },
              )
              .setOrigin(0.5)
              .setDepth(-18);
          }

          private createTargetMarker() {
            const graphics = this.add.graphics();
            graphics
              .lineStyle(4, 0xffda67, 0.92)
              .strokeCircle(0, 0, 18)
              .beginPath()
              .moveTo(-27, 0)
              .lineTo(-12, 0)
              .moveTo(27, 0)
              .lineTo(12, 0)
              .moveTo(0, -27)
              .lineTo(0, -12)
              .moveTo(0, 27)
              .lineTo(0, 12)
              .strokePath();
            this.targetMarker = this.add
              .container(0, 0, [graphics])
              .setDepth(5)
              .setVisible(false);
          }

          private createTooltip() {
            const background = this.add.graphics();
            background
              .fillStyle(0x071d27, 0.96)
              .fillRoundedRect(-145, -44, 290, 88, 8)
              .lineStyle(3, 0xd7b45a, 1)
              .strokeRoundedRect(-145, -44, 290, 88, 8);
            this.tooltipTitle = this.add.text(0, -27, "", {
              color: "#ffe08a",
              fontFamily: "monospace",
              fontSize: "18px",
              fontStyle: "bold",
            }).setOrigin(0.5, 0);
            this.tooltipDescription = this.add.text(0, -1, "", {
              align: "center",
              color: "#d5edf1",
              fontFamily: "monospace",
              fontSize: "13px",
              wordWrap: { width: 262 },
            }).setOrigin(0.5, 0);
            this.tooltip = this.add
              .container(0, 0, [
                background,
                this.tooltipTitle,
                this.tooltipDescription,
              ])
              .setDepth(100)
              .setVisible(false);
          }

          private handlePointer(pointer: Phaser.Input.Pointer) {
            if (pointer.button !== 0) return;
            const human = this.payload.snapshot.participants.find(
              (participant) => participant.playerId === this.payload.playerId,
            );
            if (
              !human ||
              human.claimedChoiceId ||
              this.payload.snapshot.tick < human.releaseTick ||
              this.payload.snapshot.finishAtTick !== null &&
                this.payload.snapshot.finishAtTick !== undefined
            ) {
              return;
            }
            const target = clampCarouselTarget({
              x: pointer.worldX,
              y: pointer.worldY,
            });
            setTargetRef.current(target);
          }

          private boatColor(participant: CarouselParticipantView) {
            const index = paletteIndex(participant.paletteIndex);
            return colorNumber(participant.color, BOAT_COLORS[index]);
          }

          private fallbackBoat(
            participant: CarouselParticipantView,
          ): Phaser.GameObjects.Graphics {
            const color = this.boatColor(participant);
            const body = this.add.graphics();
            body
              .fillStyle(0x412719, 1)
              .fillTriangle(-30, 18, 30, 18, 0, 43)
              .fillStyle(0x7f4b27, 1)
              .fillRoundedRect(-28, 1, 56, 24, 7)
              .lineStyle(this.payload.highContrast ? 4 : 2, 0xf4d585, 1)
              .strokeRoundedRect(-28, 1, 56, 24, 7)
              .lineStyle(4, 0x2c1d14, 1)
              .beginPath()
              .moveTo(0, 5)
              .lineTo(0, -34)
              .strokePath()
              .fillStyle(color, 1)
              .fillTriangle(3, -32, 3, 2, 31, -3);
            return body;
          }

          private createBoat(participant: CarouselParticipantView): BoatDisplay {
            const contrastOutline = this.add.graphics();
            contrastOutline
              .lineStyle(5, this.boatColor(participant), 1)
              .strokeEllipse(0, 4, 82, 70);
            const wake = this.add.graphics();
            wake
              .lineStyle(5, 0xbdeaf1, 0.38)
              .beginPath()
              .moveTo(-22, 31)
              .lineTo(0, 49)
              .lineTo(22, 31)
              .strokePath();
            const body = this.textureAvailable(BOAT_SHEET_KEY)
              ? this.add
                  .sprite(0, 0, BOAT_SHEET_KEY, 0)
                  .setOrigin(0.5, 46 / 96)
              : this.fallbackBoat(participant);
            const label = this.add.text(0, 53, participant.name, {
              align: "center",
              color: "#f4f1dc",
              fontFamily: "monospace",
              fontSize: "15px",
              fontStyle: "bold",
              stroke: "#031820",
              strokeThickness: this.payload.highContrast ? 6 : 4,
            }).setOrigin(0.5, 0);
            const arrow = this.add.text(0, -66, "▼", {
              color: "#ffd45f",
              fontFamily: "monospace",
              fontSize: "28px",
              fontStyle: "bold",
              stroke: "#031820",
              strokeThickness: 5,
            }).setOrigin(0.5);
            const status = this.add.text(0, -91, "", {
              color: "#ffffff",
              fontFamily: "monospace",
              fontSize: "13px",
              fontStyle: "bold",
              stroke: "#031820",
              strokeThickness: 4,
            }).setOrigin(0.5);
            const container = this.add
              .container(participant.position.x, participant.position.y, [
                contrastOutline,
                wake,
                body,
                label,
                arrow,
                status,
              ])
              .setDepth(30 + participant.rank);
            return {
              participant,
              container,
              body,
              wake,
              contrastOutline,
              label,
              arrow,
              status,
              direction: "n",
              hasSynced: false,
            };
          }

          private fallbackBounty(choice: CarouselTokenView) {
            const colors = [
              0xb64d4a, 0xd29249, 0x5a9fc4, 0xa97dbf,
              0x6e9fa4, 0xcf965e, 0x76ad71, 0x8c9fb5,
            ];
            const body = this.add.graphics();
            const column = itemColumn(choice);
            const accent = colorNumber(choice.color, colors[column]);
            body
              .fillStyle(0x4a2a19, 1)
              .fillRoundedRect(-28, -23, 56, 49, 7)
              .fillStyle(accent, 1)
              .fillRoundedRect(-23, -18, 46, 38, 5)
              .lineStyle(this.payload.highContrast ? 5 : 3, 0xffdf82, 1)
              .strokeRoundedRect(-28, -23, 56, 49, 7);
            return body;
          }

          private createBounty(choice: CarouselTokenView): BountyDisplay {
            const contrastOutline = this.add.graphics();
            contrastOutline
              .lineStyle(5, 0xffffff, 0.95)
              .strokeCircle(0, 0, 34);
            const recommendation = this.add.graphics();
            recommendation
              .lineStyle(5, 0xffd85c, 0.96)
              .strokeCircle(0, 0, 39)
              .fillStyle(0xffd85c, 1)
              .fillTriangle(-8, -48, 8, -48, 0, -38);
            const body = this.textureAvailable(BOUNTY_SHEET_KEY)
              ? this.add.sprite(
                  0,
                  0,
                  BOUNTY_SHEET_KEY,
                  carouselBountyFrame(itemColumn(choice), 0),
                )
              : this.fallbackBounty(choice);
            const icon = this.add.text(0, 0, choice.icon ?? "◆", {
              color: "#fff1b8",
              fontFamily: "monospace",
              fontSize: "20px",
              fontStyle: "bold",
              stroke: "#321d13",
              strokeThickness: 4,
            }).setOrigin(0.5);
            const hitZone = this.add
              .zone(0, 0, 78, 78)
              .setOrigin(0.5)
              .setInteractive({ useHandCursor: true });
            const container = this.add
              .container(0, 0, [
                contrastOutline,
                recommendation,
                body,
                icon,
                hitZone,
              ])
              .setDepth(20);
            const display: BountyDisplay = {
              choice,
              container,
              body,
              recommendation,
              contrastOutline,
              hitZone,
              hasSynced: false,
            };
            hitZone.on("pointerover", () => {
              this.showTooltip(display.choice, display.container.x, display.container.y);
              hoverRef.current?.(display.choice.id);
            });
            hitZone.on("pointerout", () => {
              this.tooltip?.setVisible(false);
              hoverRef.current?.(null);
            });
            return display;
          }

          private showTooltip(choice: CarouselTokenView, x: number, y: number) {
            if (!this.tooltip || !this.tooltipTitle || !this.tooltipDescription) {
              return;
            }
            this.tooltipTitle.setText(choice.name);
            this.tooltipDescription.setText(
              choice.description ?? "Sail into this bounty to claim it.",
            );
            this.tooltip
              .setPosition(
                Math.max(155, Math.min(1_365, x)),
                Math.max(52, Math.min(788, y - 82)),
              )
              .setVisible(true);
          }

          private ensureTow(display: BoatDisplay, choice: CarouselTokenView) {
            if (display.towChoiceId === choice.id && display.tow) return;
            display.tow?.destroy();
            display.tow = this.textureAvailable(BOUNTY_SHEET_KEY)
              ? this.add.sprite(
                  0,
                  0,
                  BOUNTY_SHEET_KEY,
                  carouselBountyFrame(itemColumn(choice), 0),
                ).setScale(0.72)
              : this.fallbackBounty(choice).setScale(0.72);
            display.towChoiceId = choice.id;
            display.container.addAt(display.tow, 1);
          }

          private removeTow(display: BoatDisplay) {
            display.tow?.destroy();
            display.tow = undefined;
            display.towChoiceId = undefined;
          }

          private syncBoat(participant: CarouselParticipantView) {
            let display = this.boats.get(participant.playerId);
            if (!display) {
              display = this.createBoat(participant);
              this.boats.set(participant.playerId, display);
            }
            display.participant = participant;
            display.label.setText(participant.name);
            display.arrow.setVisible(
              participant.playerId === this.payload.playerId,
            );

            const position = finitePoint(participant.position);
            const target = finitePoint(participant.targetPosition);
            display.label.setY(
              position.y > CAROUSEL_GEOMETRY.worldHeight - 130 ? -122 : 53,
            );
            const previousDirection = display.direction;
            display.direction = participant.moving
              ? carouselDirection(position, target, previousDirection)
              : carouselDirection(
                  { x: display.container.x, y: display.container.y },
                  position,
                  previousDirection,
                );

            const duration = carouselInterpolationDuration(
              this.payload.tickMs,
              this.payload.reducedMotion,
            );
            this.tweens.killTweensOf(display.container);
            if (!display.hasSynced || duration === 0) {
              display.container.setPosition(position.x, position.y);
            } else {
              this.tweens.add({
                targets: display.container,
                x: position.x,
                y: position.y,
                duration,
                ease: "Linear",
              });
            }
            display.hasSynced = true;
            display.container.setDepth(30 + position.y / 1_000);

            const remaining = Math.max(
              0,
              participant.releaseTick - this.payload.snapshot.tick,
            );
            display.status.setText(
              participant.claimedChoiceId
                ? "BOUNTY SECURED"
                : remaining > 0
                  ? `LOCK ${((remaining * this.payload.tickMs) / 1_000).toFixed(1)}s`
                  : "",
            );
            display.status.setColor(
              remaining > 0 ? "#b7d5db" : "#ffe080",
            );
            display.wake.setVisible(
              participant.moving &&
                !this.payload.reducedMotion &&
                remaining <= 0,
            );
            display.contrastOutline.setVisible(this.payload.highContrast);
            display.label.setStroke(
              "#031820",
              this.payload.highContrast ? 7 : 4,
            );

            const claimed = participant.claimedChoiceId
              ? this.payload.snapshot.choices.find(
                  (choice) => choice.id === participant.claimedChoiceId,
                )
              : undefined;
            if (claimed) {
              this.ensureTow(display, claimed);
              const vector = carouselDirectionVector(display.direction);
              display.tow?.setPosition(
                -vector.x * CAROUSEL_GEOMETRY.towDistance,
                -vector.y * CAROUSEL_GEOMETRY.towDistance,
              );
            } else {
              this.removeTow(display);
            }
          }

          private syncBounty(choice: CarouselTokenView, count: number) {
            let display = this.bounties.get(choice.id);
            if (!display) {
              display = this.createBounty(choice);
              this.bounties.set(choice.id, display);
            }
            display.choice = choice;
            const available = choice.takenByPlayerId === null;
            display.container.setVisible(available);
            display.hitZone.setActive(available);
            display.recommendation.setVisible(
              available && choice.id === this.payload.recommendedChoiceId,
            );
            display.contrastOutline.setVisible(
              available && this.payload.highContrast,
            );
            if (!available) return;

            const position = choice.position
              ? finitePoint(choice.position)
              : carouselOrbitPoint(
                  choice.orbitIndex,
                  count,
                  this.payload.snapshot.tick,
                  this.payload.snapshot.orbitDirection ?? 1,
                );
            const duration = carouselInterpolationDuration(
              this.payload.tickMs,
              this.payload.reducedMotion,
            );
            this.tweens.killTweensOf(display.container);
            if (!display.hasSynced || duration === 0) {
              display.container.setPosition(position.x, position.y);
            } else {
              this.tweens.add({
                targets: display.container,
                x: position.x,
                y: position.y,
                duration,
                ease: "Linear",
              });
            }
            display.hasSynced = true;
          }

          private syncTargetMarker() {
            const human = this.payload.snapshot.participants.find(
              (participant) => participant.playerId === this.payload.playerId,
            );
            if (
              !human ||
              human.claimedChoiceId ||
              this.payload.snapshot.tick < human.releaseTick ||
              this.payload.snapshot.finishAtTick !== null &&
                this.payload.snapshot.finishAtTick !== undefined
            ) {
              this.targetMarker?.setVisible(false);
              return;
            }
            const target = finitePoint(human.targetPosition);
            this.targetMarker
              ?.setPosition(target.x, target.y)
              .setVisible(human.moving);
          }

          private emitNewEvents(events: readonly CarouselPresentationEvent[]) {
            if (!this.initializedEvents) {
              events.forEach((event, index) => {
                this.seenEvents.add(eventKey(event, index));
              });
              this.initializedEvents = true;
              return;
            }
            events.forEach((event, index) => {
              const key = eventKey(event, index);
              if (this.seenEvents.has(key)) return;
              this.seenEvents.add(key);
              if (isCarouselSoundKind(event.type)) {
                soundRef.current?.({ kind: event.type, event });
              }
              if (event.type === "collision" && !this.payload.reducedMotion) {
                const participant = event.playerAId
                  ? this.boats.get(event.playerAId)
                  : undefined;
                const other = event.playerBId
                  ? this.boats.get(event.playerBId)
                  : undefined;
                if (participant) {
                  this.cameras.main.shake(75, 0.0015, true);
                }
                if (participant || other) {
                  const first = participant ?? other;
                  const second = other ?? participant;
                  this.spawnBurst(
                    {
                      x: ((first?.container.x ?? 0) + (second?.container.x ?? 0)) / 2,
                      y: ((first?.container.y ?? 0) + (second?.container.y ?? 0)) / 2,
                    },
                    0xbdeaf1,
                    42,
                  );
                }
              }
              if (event.type === "claim" && !this.payload.reducedMotion) {
                const participant = event.playerId
                  ? this.boats.get(event.playerId)
                  : undefined;
                if (participant) {
                  this.spawnBurst(
                    {
                      x: participant.container.x,
                      y: participant.container.y,
                    },
                    0xffd45f,
                    58,
                  );
                }
              }
            });
          }

          private spawnBurst(point: CarouselPoint, color: number, radius: number) {
            for (let index = 0; index < 8; index += 1) {
              const angle = (index / 8) * Math.PI * 2;
              const fleck = this.add.graphics().setDepth(80);
              fleck
                .fillStyle(color, 0.95)
                .fillCircle(0, 0, index % 2 ? 3 : 5)
                .setPosition(point.x, point.y);
              this.tweens.add({
                targets: fleck,
                x: point.x + Math.cos(angle) * radius,
                y: point.y + Math.sin(angle) * radius * 0.72,
                alpha: 0,
                duration: 260,
                ease: "Quad.easeOut",
                onComplete: () => fleck.destroy(),
              });
            }
          }

          sync(payload: CarouselPayload) {
            this.payload = payload;
            const participantIds = new Set(
              payload.snapshot.participants.map(
                (participant) => participant.playerId,
              ),
            );
            for (const [id, display] of this.boats) {
              if (!participantIds.has(id)) {
                display.container.destroy(true);
                this.boats.delete(id);
              }
            }
            payload.snapshot.participants.forEach((participant) => {
              this.syncBoat(participant);
            });

            const choiceIds = new Set(
              payload.snapshot.choices.map((choice) => choice.id),
            );
            for (const [id, display] of this.bounties) {
              if (!choiceIds.has(id)) {
                display.container.destroy(true);
                this.bounties.delete(id);
              }
            }
            payload.snapshot.choices.forEach((choice) => {
              this.syncBounty(choice, payload.snapshot.choices.length);
            });
            this.syncTargetMarker();
            this.emitNewEvents(payload.snapshot.events ?? []);
          }

          update(time: number) {
            const reducedMotion = this.payload.reducedMotion;
            for (const display of this.boats.values()) {
              const animationFrame =
                !reducedMotion && display.participant.moving
                  ? Math.floor(time / 140) % 4
                  : 0;
              if (display.body instanceof Phaser.GameObjects.Sprite) {
                display.body.setFrame(
                  carouselBoatFrame(
                    display.participant.paletteIndex ?? 0,
                    display.direction,
                    animationFrame,
                  ),
                );
                display.body.y = reducedMotion ? 0 : Math.sin(time / 420) * 2;
              } else {
                const vector = carouselDirectionVector(display.direction);
                display.body.rotation = Math.atan2(vector.y, vector.x) - Math.PI / 2;
              }
              display.wake.alpha = reducedMotion
                ? 0
                : 0.28 + (Math.sin(time / 105) + 1) * 0.12;
              if (display.tow instanceof Phaser.GameObjects.Sprite) {
                const choice = this.payload.snapshot.choices.find(
                  (candidate) => candidate.id === display.towChoiceId,
                );
                if (choice) {
                  display.tow.setFrame(
                    carouselBountyFrame(
                      itemColumn(choice),
                      reducedMotion ? 0 : Math.floor(time / 160) % 4,
                    ),
                  );
                }
              }
            }
            for (const display of this.bounties.values()) {
              if (display.body instanceof Phaser.GameObjects.Sprite) {
                display.body.setFrame(
                  carouselBountyFrame(
                    itemColumn(display.choice),
                    reducedMotion ? 0 : Math.floor(time / 160) % 4,
                  ),
                );
              }
              display.container.setScale(
                reducedMotion ? 1 : 1 + Math.sin(time / 320 + display.choice.orbitIndex) * 0.025,
              );
            }
            if (this.targetMarker?.visible && !reducedMotion) {
              this.targetMarker.rotation = time / 1_100;
            }
          }
        }

        gameRef.current = new Phaser.Game({
          type: Phaser.CANVAS,
          width: CAROUSEL_GEOMETRY.worldWidth,
          height: CAROUSEL_GEOMETRY.worldHeight,
          parent: hostRef.current,
          backgroundColor: "#061f2b",
          transparent: false,
          render: {
            antialias: false,
            pixelArt: true,
            roundPixels: true,
          },
          audio: { noAudio: true },
          scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: CAROUSEL_GEOMETRY.worldWidth,
            height: CAROUSEL_GEOMETRY.worldHeight,
          },
          scene: BountyRegattaScene,
        });
      } catch (reason) {
        const error =
          reason instanceof Error
            ? reason
            : new Error("Unable to start the Bounty Regatta renderer.");
        console.error("Unable to start the Bounty Regatta renderer", error);
        failureRef.current?.(error);
        if (!cancelled) setFailed(true);
      }
    }

    void mountCarousel();

    return () => {
      cancelled = true;
      bridgeRef.current = null;
      hoverRef.current?.(null);
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [resolvedAssets.arena, resolvedAssets.boats, resolvedAssets.bounties]);

  useEffect(() => {
    bridgeRef.current?.sync({
      snapshot,
      playerId,
      tickMs,
      reducedMotion,
      highContrast,
      recommendedChoiceId,
    });
  }, [snapshot, playerId, tickMs, reducedMotion, highContrast, recommendedChoiceId]);

  const playerParticipant = snapshot.participants.find(
    (participant) => participant.playerId === playerId,
  );

  if (failed) {
    return (
      <div
        className={className}
        role="alert"
        style={{
          alignItems: "center",
          background: "#071d27",
          border: "2px solid #c89c46",
          color: "#eef6ef",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          justifyContent: "center",
          minHeight: 320,
          padding: 24,
          textAlign: "center",
        }}
      >
        <strong>Bounty Regatta renderer unavailable</strong>
        <span>Your deterministic best-fit bounty is still available.</span>
        {onFallbackAutoPick && (
          <button type="button" onClick={onFallbackAutoPick}>
            CLAIM BEST FIT
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={className}
      data-carousel-ready={isReady ? "true" : "false"}
      data-player-x={playerParticipant?.position.x}
      data-player-y={playerParticipant?.position.y}
      data-target-x={playerParticipant?.targetPosition?.x}
      data-target-y={playerParticipant?.targetPosition?.y}
      style={{
        aspectRatio: `${CAROUSEL_GEOMETRY.worldWidth} / ${CAROUSEL_GEOMETRY.worldHeight}`,
        background: "#061f2b",
        height: "100%",
        maxHeight: "100%",
        maxWidth: "100%",
        minHeight: 0,
        overflow: "hidden",
        position: "relative",
        width: "100%",
      }}
    >
      {!isReady && (
        <div
          aria-live="polite"
          style={{
            alignItems: "center",
            color: "#f0d785",
            display: "flex",
            inset: 0,
            justifyContent: "center",
            position: "absolute",
            zIndex: 2,
          }}
        >
          Lowering the boats…
        </div>
      )}
      <div
        ref={hostRef}
        role="application"
        aria-label="Bounty Regatta. Click the ocean to steer your boat into an available item bounty."
        style={{ height: "100%", width: "100%" }}
      />
      <ul
        aria-label="Captains in the Bounty Regatta"
        style={{
          clip: "rect(0 0 0 0)",
          clipPath: "inset(50%)",
          height: 1,
          overflow: "hidden",
          position: "absolute",
          whiteSpace: "nowrap",
          width: 1,
        }}
      >
        {snapshot.participants.map((participant) => (
          <li key={participant.playerId}>
            {participant.name}, rank {participant.rank}
            {participant.claimedChoiceId ? ", bounty secured" : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
