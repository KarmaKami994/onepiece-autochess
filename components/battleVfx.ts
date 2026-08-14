import type Phaser from "phaser";

export type BattleVfxTeam = "player" | "enemy" | "neutral";

export type BattleVfxPoint = Readonly<{
  x: number;
  y: number;
}>;

export type BattleVfxHandle = Readonly<{
  durationMs: number;
  destroy: () => void;
}>;

export const BATTLE_VFX_DEPTH = {
  projectile: 130,
  impact: 140,
  overlay: 150,
} as const;

type CommonVfxOptions = Readonly<{
  team?: BattleVfxTeam;
  color?: number;
  speed?: number;
  depth?: number;
}>;

export type SlashVfxOptions = CommonVfxOptions &
  Readonly<{
    from: BattleVfxPoint;
    to: BattleVfxPoint;
    width?: number;
  }>;

export type FireProjectileVfxOptions = CommonVfxOptions &
  Readonly<{
    from: BattleVfxPoint;
    to: BattleVfxPoint;
    radius?: number;
  }>;

export type SmokeBurstVfxOptions = CommonVfxOptions &
  Readonly<{
    at: BattleVfxPoint;
    radius?: number;
  }>;

export type LightningStrikeVfxOptions = CommonVfxOptions &
  Readonly<{
    at: BattleVfxPoint;
    from?: BattleVfxPoint;
    height?: number;
  }>;

export type ImpactVfxOptions = CommonVfxOptions &
  Readonly<{
    at: BattleVfxPoint;
    radius?: number;
  }>;

export type ShieldVfxOptions = CommonVfxOptions &
  Readonly<{
    at: BattleVfxPoint;
    radius?: number;
  }>;

export type HealVfxOptions = CommonVfxOptions &
  Readonly<{
    at: BattleVfxPoint;
    radius?: number;
  }>;

export type TelegraphVfxOptions = CommonVfxOptions &
  Readonly<{
    from: BattleVfxPoint;
    targets: readonly BattleVfxPoint[];
    shape: "target" | "line" | "area";
    reducedMotion?: boolean;
  }>;

const TEAM_COLORS: Record<BattleVfxTeam, number> = {
  player: 0x55e8d1,
  enemy: 0xff6878,
  neutral: 0xf4c95d,
};

const TAU = Math.PI * 2;

function clampedSpeed(speed = 1) {
  return Math.max(0.25, Math.min(4, speed));
}

function scaledDuration(baseMs: number, speed?: number) {
  return Math.max(1, Math.round(baseMs / clampedSpeed(speed)));
}

function effectColor(options: CommonVfxOptions) {
  return options.color ?? TEAM_COLORS[options.team ?? "neutral"];
}

function mixColor(colorA: number, colorB: number, amount: number) {
  const mixChannel = (shift: number) => {
    const a = (colorA >> shift) & 0xff;
    const b = (colorB >> shift) & 0xff;
    return Math.round(a + (b - a) * amount) << shift;
  };

  return mixChannel(16) | mixChannel(8) | mixChannel(0);
}

function createEffectScope(
  scene: Phaser.Scene,
  durationMs: number,
): {
  add: <T extends Phaser.GameObjects.GameObject>(object: T) => T;
  handle: BattleVfxHandle;
} {
  const objects = new Set<Phaser.GameObjects.GameObject>();
  let destroyed = false;

  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    timer?.remove(false);
    scene.events.off("shutdown", destroy);
    for (const object of objects) {
      object.destroy();
    }
    objects.clear();
  };

  scene.events.once("shutdown", destroy);
  const timer = scene.time.delayedCall(durationMs + 34, destroy);

  return {
    add: <T extends Phaser.GameObjects.GameObject>(object: T) => {
      if (destroyed) {
        object.destroy();
      } else {
        objects.add(object);
      }
      return object;
    },
    handle: { durationMs, destroy },
  };
}

/** A fast directional melee streak plus four fixed impact shards. */
export function playSlashVfx(
  scene: Phaser.Scene,
  options: SlashVfxOptions,
): BattleVfxHandle {
  const durationMs = scaledDuration(230, options.speed);
  const scope = createEffectScope(scene, durationMs);
  const color = effectColor(options);
  const highlight = mixColor(color, 0xffffff, 0.76);
  const depth = options.depth ?? BATTLE_VFX_DEPTH.impact;
  const dx = options.to.x - options.from.x;
  const dy = options.to.y - options.from.y;
  const distance = Math.max(20, Math.hypot(dx, dy));
  const angle = Math.atan2(dy, dx);
  const normalX = -Math.sin(angle);
  const normalY = Math.cos(angle);
  const width = Math.max(2, options.width ?? 5);
  const centerX = (options.from.x + options.to.x) / 2;
  const centerY = (options.from.y + options.to.y) / 2;

  [
    { offset: 0, thickness: width, tint: highlight, alpha: 1 },
    { offset: 3, thickness: width * 2.2, tint: color, alpha: 0.52 },
  ].forEach((stroke, index) => {
    const streak = scope
      .add(
        scene.add.rectangle(
          centerX + normalX * stroke.offset,
          centerY + normalY * stroke.offset,
          distance,
          stroke.thickness,
          stroke.tint,
          stroke.alpha,
        ),
      )
      .setRotation(angle)
      .setScale(0.08, 0.55)
      .setDepth(depth - index);

    scene.tweens.add({
      targets: streak,
      scaleX: 1.08,
      scaleY: 0.15,
      alpha: 0,
      duration: scaledDuration(index === 0 ? 170 : 220, options.speed),
      ease: "Cubic.Out",
    });
  });

  [0.18, 0.42, 0.68, 0.9].forEach((turn, index) => {
    const shardAngle = angle + TAU * turn;
    const shard = scope
      .add(scene.add.rectangle(options.to.x, options.to.y, 8, 2, highlight, 1))
      .setRotation(shardAngle)
      .setDepth(depth + 1);
    scene.tweens.add({
      targets: shard,
      x: options.to.x + Math.cos(shardAngle) * (15 + index * 2),
      y: options.to.y + Math.sin(shardAngle) * (15 + index * 2),
      scaleX: 0.2,
      alpha: 0,
      duration: scaledDuration(190, options.speed),
      ease: "Quad.Out",
    });
  });

  return scope.handle;
}

/** A layered fire orb with a deterministic trailing flame and arrival flash. */
export function playFireProjectileVfx(
  scene: Phaser.Scene,
  options: FireProjectileVfxOptions,
): BattleVfxHandle {
  const travelMs = scaledDuration(270, options.speed);
  const durationMs = travelMs + scaledDuration(150, options.speed);
  const scope = createEffectScope(scene, durationMs);
  const color = options.color ?? 0xff7426;
  const coreColor = mixColor(color, 0xffffff, 0.78);
  const depth = options.depth ?? BATTLE_VFX_DEPTH.projectile;
  const radius = Math.max(3, options.radius ?? 7);

  [
    { radius, color, alpha: 0.88, delay: 0 },
    { radius: radius * 0.58, color: coreColor, alpha: 1, delay: 0 },
    { radius: radius * 0.72, color, alpha: 0.58, delay: 34 },
    { radius: radius * 0.48, color, alpha: 0.38, delay: 68 },
  ].forEach((layer, index) => {
    const orb = scope
      .add(
        scene.add.circle(
          options.from.x,
          options.from.y,
          layer.radius,
          layer.color,
          layer.alpha,
        ),
      )
      .setDepth(depth - index);
    scene.tweens.add({
      targets: orb,
      x: options.to.x,
      y: options.to.y,
      scaleX: index < 2 ? 1.18 : 0.28,
      scaleY: index < 2 ? 1.18 : 0.28,
      alpha: index < 2 ? 0.92 : 0,
      delay: scaledDuration(layer.delay, options.speed),
      duration: travelMs,
      ease: "Sine.In",
    });
  });

  const arrival = scope
    .add(scene.add.circle(options.to.x, options.to.y, radius, coreColor, 0))
    .setDepth(BATTLE_VFX_DEPTH.impact);
  scene.tweens.add({
    targets: arrival,
    scaleX: 2.8,
    scaleY: 2.8,
    alpha: { from: 0.9, to: 0 },
    delay: travelMs,
    duration: scaledDuration(140, options.speed),
    ease: "Quad.Out",
  });

  return scope.handle;
}

/** Expanding smoke puffs laid out by a fixed pattern (no particle RNG). */
export function playSmokeBurstVfx(
  scene: Phaser.Scene,
  options: SmokeBurstVfxOptions,
): BattleVfxHandle {
  const durationMs = scaledDuration(520, options.speed);
  const scope = createEffectScope(scene, durationMs);
  const baseColor = options.color ?? 0x8b9ca3;
  const teamTint = effectColor(options);
  const smokeColor = mixColor(baseColor, teamTint, 0.18);
  const depth = options.depth ?? BATTLE_VFX_DEPTH.overlay;
  const radius = Math.max(8, options.radius ?? 26);
  const puffPattern = [
    { turn: 0.03, reach: 0.9, size: 0.28 },
    { turn: 0.15, reach: 1.12, size: 0.4 },
    { turn: 0.28, reach: 0.78, size: 0.34 },
    { turn: 0.4, reach: 1.04, size: 0.46 },
    { turn: 0.54, reach: 0.88, size: 0.31 },
    { turn: 0.67, reach: 1.16, size: 0.42 },
    { turn: 0.81, reach: 0.82, size: 0.36 },
    { turn: 0.93, reach: 1.02, size: 0.3 },
  ] as const;

  puffPattern.forEach((puff, index) => {
    const angle = puff.turn * TAU;
    const cloud = scope
      .add(
        scene.add.circle(
          options.at.x,
          options.at.y,
          radius * puff.size,
          index % 2 === 0 ? smokeColor : mixColor(smokeColor, 0xffffff, 0.18),
          0.66,
        ),
      )
      .setScale(0.45)
      .setDepth(depth + (index % 2));
    scene.tweens.add({
      targets: cloud,
      x: options.at.x + Math.cos(angle) * radius * puff.reach,
      y: options.at.y + Math.sin(angle) * radius * puff.reach - radius * 0.18,
      scaleX: 1.35,
      scaleY: 1.35,
      alpha: 0,
      delay: scaledDuration((index % 3) * 20, options.speed),
      duration: scaledDuration(440 + (index % 2) * 70, options.speed),
      ease: "Quad.Out",
    });
  });

  return scope.handle;
}

/** A fixed zig-zag bolt. The bend direction is derived from team and position. */
export function playLightningStrikeVfx(
  scene: Phaser.Scene,
  options: LightningStrikeVfxOptions,
): BattleVfxHandle {
  const durationMs = scaledDuration(310, options.speed);
  const scope = createEffectScope(scene, durationMs);
  const color = options.color ?? 0x6ddcff;
  const highlight = mixColor(color, 0xffffff, 0.84);
  const depth = options.depth ?? BATTLE_VFX_DEPTH.overlay;
  const from = options.from ?? {
    x: options.at.x,
    y: options.at.y - Math.max(48, options.height ?? 92),
  };
  const dx = options.at.x - from.x;
  const dy = options.at.y - from.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const normalX = -dy / length;
  const normalY = dx / length;
  const direction =
    options.team === "enemy" ||
    (options.team !== "player" && Math.floor(options.at.x) % 2 !== 0)
      ? -1
      : 1;
  const bends = [0, -7, 9, -6, 8, -4, 0];

  const drawBolt = (lineWidth: number, tint: number, alpha: number) => {
    const bolt = scope.add(scene.add.graphics()).setDepth(depth);
    bolt.lineStyle(lineWidth, tint, alpha);
    bolt.beginPath();
    bolt.moveTo(from.x, from.y);
    bends.slice(1).forEach((bend, index) => {
      const progress = (index + 1) / (bends.length - 1);
      bolt.lineTo(
        from.x + dx * progress + normalX * bend * direction,
        from.y + dy * progress + normalY * bend * direction,
      );
    });
    bolt.strokePath();
    return bolt;
  };

  const glow = drawBolt(8, color, 0.3).setDepth(depth - 1);
  const bolt = drawBolt(3, highlight, 1);
  [glow, bolt].forEach((graphic, index) => {
    scene.tweens.add({
      targets: graphic,
      alpha: 0,
      delay: scaledDuration(index * 24, options.speed),
      duration: scaledDuration(95, options.speed),
      yoyo: true,
      repeat: 1,
    });
  });

  const groundFlash = scope
    .add(scene.add.circle(options.at.x, options.at.y, 9, highlight, 0.9))
    .setDepth(BATTLE_VFX_DEPTH.impact);
  scene.tweens.add({
    targets: groundFlash,
    scaleX: 3.2,
    scaleY: 0.8,
    alpha: 0,
    duration: scaledDuration(260, options.speed),
    ease: "Cubic.Out",
  });

  return scope.handle;
}

/** Generic damage contact ring and four radial sparks. */
export function playImpactVfx(
  scene: Phaser.Scene,
  options: ImpactVfxOptions,
): BattleVfxHandle {
  const durationMs = scaledDuration(260, options.speed);
  const scope = createEffectScope(scene, durationMs);
  const color = effectColor(options);
  const highlight = mixColor(color, 0xffffff, 0.7);
  const depth = options.depth ?? BATTLE_VFX_DEPTH.impact;
  const radius = Math.max(5, options.radius ?? 13);
  const ring = scope
    .add(scene.add.circle(options.at.x, options.at.y, radius, color, 0.12))
    .setStrokeStyle(2, highlight, 1)
    .setScale(0.35)
    .setDepth(depth);
  scene.tweens.add({
    targets: ring,
    scaleX: 1.9,
    scaleY: 1.9,
    alpha: 0,
    duration: scaledDuration(230, options.speed),
    ease: "Cubic.Out",
  });

  for (let index = 0; index < 4; index += 1) {
    const angle = (TAU * index) / 4 + Math.PI / 4;
    const spark = scope
      .add(scene.add.rectangle(options.at.x, options.at.y, 7, 2, highlight, 1))
      .setRotation(angle)
      .setDepth(depth + 1);
    scene.tweens.add({
      targets: spark,
      x: options.at.x + Math.cos(angle) * radius * 1.65,
      y: options.at.y + Math.sin(angle) * radius * 1.65,
      scaleX: 0.2,
      alpha: 0,
      duration: scaledDuration(190, options.speed),
      ease: "Quad.Out",
    });
  }

  return scope.handle;
}

/** A translucent defensive bubble with two short-lived concentric borders. */
export function playShieldVfx(
  scene: Phaser.Scene,
  options: ShieldVfxOptions,
): BattleVfxHandle {
  const durationMs = scaledDuration(560, options.speed);
  const scope = createEffectScope(scene, durationMs);
  const color = options.color ?? mixColor(effectColor(options), 0x75cfff, 0.55);
  const highlight = mixColor(color, 0xffffff, 0.66);
  const depth = options.depth ?? BATTLE_VFX_DEPTH.overlay;
  const radius = Math.max(12, options.radius ?? 25);

  const bubble = scope
    .add(scene.add.circle(options.at.x, options.at.y - radius * 0.1, radius, color, 0.16))
    .setStrokeStyle(2, highlight, 0.85)
    .setScale(0.35)
    .setDepth(depth);
  const rim = scope
    .add(scene.add.circle(options.at.x, options.at.y - radius * 0.1, radius * 0.76, color, 0))
    .setStrokeStyle(1, highlight, 0.5)
    .setScale(0.45)
    .setDepth(depth + 1);

  [bubble, rim].forEach((circle, index) => {
    scene.tweens.add({
      targets: circle,
      scaleX: 1 + index * 0.06,
      scaleY: 1 + index * 0.06,
      alpha: index === 0 ? 0.1 : 0,
      duration: scaledDuration(470 + index * 60, options.speed),
      ease: "Back.Out",
    });
  });

  return scope.handle;
}

/** Three rising plus signs and a soft pulse for healing feedback. */
export function playHealVfx(
  scene: Phaser.Scene,
  options: HealVfxOptions,
): BattleVfxHandle {
  const durationMs = scaledDuration(620, options.speed);
  const scope = createEffectScope(scene, durationMs);
  const color = options.color ?? 0x65f09b;
  const highlight = mixColor(color, 0xffffff, 0.58);
  const depth = options.depth ?? BATTLE_VFX_DEPTH.overlay;
  const radius = Math.max(10, options.radius ?? 22);
  const pulse = scope
    .add(scene.add.circle(options.at.x, options.at.y, radius, color, 0.2))
    .setStrokeStyle(2, highlight, 0.7)
    .setScale(0.3)
    .setDepth(depth - 1);
  scene.tweens.add({
    targets: pulse,
    scaleX: 1.45,
    scaleY: 0.6,
    alpha: 0,
    duration: scaledDuration(480, options.speed),
    ease: "Cubic.Out",
  });

  [-0.72, 0, 0.72].forEach((offset, index) => {
    const plus = scope.add(
      scene.add.container(
        options.at.x + radius * offset,
        options.at.y + radius * (index === 1 ? 0.25 : 0.55),
        [
          scene.add.rectangle(0, 0, 3, 11, highlight, 1),
          scene.add.rectangle(0, 0, 11, 3, highlight, 1),
        ],
      ),
    );
    plus.setDepth(depth).setScale(0.55).setAlpha(0);
    scene.tweens.add({
      targets: plus,
      y: plus.y - radius * (1.25 + index * 0.12),
      scaleX: 1,
      scaleY: 1,
      alpha: { from: 1, to: 0 },
      delay: scaledDuration(index * 55, options.speed),
      duration: scaledDuration(480, options.speed),
      ease: "Quad.Out",
    });
  });

  return scope.handle;
}

/** Deterministic targeting cue shown before a cast. It communicates the
 * resolved targets but never feeds information back into combat. */
export function playTelegraphVfx(
  scene: Phaser.Scene,
  options: TelegraphVfxOptions,
): BattleVfxHandle {
  const baseDuration = options.reducedMotion ? 220 : 470;
  const durationMs = scaledDuration(baseDuration, options.speed);
  const scope = createEffectScope(scene, durationMs);
  const color = mixColor(effectColor(options), 0xc08cff, 0.56);
  const highlight = mixColor(color, 0xffffff, 0.72);
  const depth = options.depth ?? BATTLE_VFX_DEPTH.overlay - 2;
  const targets = options.targets.length ? options.targets : [options.from];

  if (options.shape === "line") {
    const line = scope.add(scene.add.graphics()).setDepth(depth);
    line.lineStyle(8, color, 0.2);
    line.beginPath();
    line.moveTo(options.from.x, options.from.y);
    targets.forEach((target) => line.lineTo(target.x, target.y));
    line.strokePath();
    line.lineStyle(2, highlight, 0.9);
    line.beginPath();
    line.moveTo(options.from.x, options.from.y);
    targets.forEach((target) => line.lineTo(target.x, target.y));
    line.strokePath();
    if (!options.reducedMotion) {
      scene.tweens.add({
        targets: line,
        alpha: 0,
        duration: durationMs,
        ease: "Sine.In",
      });
    }
  }

  if (options.shape === "area") {
    const total = targets.reduce(
      (sum, target) => ({ x: sum.x + target.x, y: sum.y + target.y }),
      { x: 0, y: 0 },
    );
    const center = {
      x: total.x / targets.length,
      y: total.y / targets.length,
    };
    const radius = Math.max(
      22,
      ...targets.map((target) => Math.hypot(target.x - center.x, target.y - center.y) + 18),
    );
    const area = scope
      .add(scene.add.circle(center.x, center.y, radius, color, 0.12))
      .setStrokeStyle(2, highlight, 0.86)
      .setDepth(depth);
    if (!options.reducedMotion) {
      area.setScale(0.72);
      scene.tweens.add({
        targets: area,
        scaleX: 1.08,
        scaleY: 1.08,
        alpha: 0,
        duration: durationMs,
        ease: "Cubic.Out",
      });
    }
  }

  targets.forEach((target, index) => {
    const marker = scope
      .add(scene.add.circle(target.x, target.y, 17, color, 0.1))
      .setStrokeStyle(2, highlight, 0.95)
      .setDepth(depth + 1);
    const cross = scope.add(scene.add.graphics()).setDepth(depth + 2);
    cross.lineStyle(2, highlight, 0.92);
    cross.lineBetween(target.x - 7, target.y, target.x + 7, target.y);
    cross.lineBetween(target.x, target.y - 7, target.x, target.y + 7);
    if (!options.reducedMotion) {
      marker.setScale(0.55);
      scene.tweens.add({
        targets: [marker, cross],
        scaleX: 1.16,
        scaleY: 1.16,
        alpha: 0,
        delay: scaledDuration(index * 24, options.speed),
        duration: Math.max(1, durationMs - scaledDuration(index * 24, options.speed)),
        ease: "Cubic.Out",
      });
    }
  });

  return scope.handle;
}

export const battleVfx = {
  slash: playSlashVfx,
  fireProjectile: playFireProjectileVfx,
  smokeBurst: playSmokeBurstVfx,
  lightningStrike: playLightningStrikeVfx,
  impact: playImpactVfx,
  shield: playShieldVfx,
  heal: playHealVfx,
  telegraph: playTelegraphVfx,
} as const;
