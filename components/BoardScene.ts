import type Phaser from "phaser";

export const BOARD_SCENE_KEY = "grand-line-board";

export function createBoardGameConfig(
  PhaserRuntime: typeof Phaser,
  parent: HTMLElement,
  scene: new () => Phaser.Scene,
  width: number,
  height: number,
): Phaser.Types.Core.GameConfig {
  return {
    type: PhaserRuntime.CANVAS,
    width,
    height,
    parent,
    backgroundColor: "#061d2a",
    transparent: false,
    render: { antialias: false, pixelArt: true, roundPixels: true },
    scene,
    audio: { noAudio: true },
    scale: { mode: PhaserRuntime.Scale.RESIZE },
  };
}
