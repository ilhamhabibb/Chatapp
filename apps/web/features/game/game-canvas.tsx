"use client";

import { useEffect, useRef } from "react";
import type Phaser from "phaser";
import type { GameInput, GameState } from "@chating/contracts";
import { VirtualJoystick, type JoystickVector } from "./virtual-joystick";

type GameCanvasProps = {
  state: GameState;
  onInput: (input: GameInput) => void;
};

const NEUTRAL: JoystickVector = { x: 0, y: 0 };

export function GameCanvas({ state, onInput }: GameCanvasProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  const inputRef = useRef(onInput);
  const touchRef = useRef<JoystickVector>(NEUTRAL);
  const touchActiveRef = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    inputRef.current = onInput;
  }, [onInput]);

  useEffect(() => {
    const parent = parentRef.current;
    if (!parent) return;
    let game: Phaser.Game | null = null;
    let cancelled = false;

    void import("phaser").then((phaserModule) => {
      if (cancelled) return;
      const Phaser = phaserModule.default ?? phaserModule;

      class ArenaScene extends Phaser.Scene {
        private keys!: Record<string, Phaser.Input.Keyboard.Key>;
        private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
        private graphics!: Phaser.GameObjects.Graphics;
        private sequence = 0;

        create() {
          const keyboard = this.input.keyboard;
          if (keyboard) {
            this.keys = keyboard.addKeys("W,A,S,D") as Record<string, Phaser.Input.Keyboard.Key>;
            this.cursors = keyboard.createCursorKeys();
          }
          this.graphics = this.add.graphics();
        }

        private readInput(): JoystickVector {
          if (touchActiveRef.current) {
            return touchRef.current;
          }
          const cursors = this.cursors;
          const keys = this.keys;
          if (!cursors || !keys) return NEUTRAL;
          const x =
            (cursors.right.isDown || keys.D?.isDown ? 1 : 0) - (cursors.left.isDown || keys.A?.isDown ? 1 : 0);
          const y = (cursors.down.isDown || keys.S?.isDown ? 1 : 0) - (cursors.up.isDown || keys.W?.isDown ? 1 : 0);
          return { x, y };
        }

        override update() {
          const current = stateRef.current;
          if (!this.graphics) return;
          const vector = this.readInput();
          inputRef.current({ x: vector.x, y: vector.y, sequence: (this.sequence += 1) });
          this.graphics.clear();
          this.graphics.fillStyle(0x111214);
          this.graphics.fillRect(0, 0, 960, 540);
          for (const token of current.tokens) {
            this.graphics.fillStyle(0xfee75c);
            this.graphics.fillCircle(token.x, token.y, 12);
          }
          for (const hazard of current.hazards) {
            this.graphics.fillStyle(0xed4245);
            this.graphics.fillCircle(hazard.x, hazard.y, hazard.radius);
          }
          for (const player of current.players) {
            this.graphics.fillStyle(player.id === current.hostId ? 0x5865f2 : 0x23a55a);
            this.graphics.fillCircle(player.x, player.y, 18);
          }
        }
      }

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent,
        width: 960,
        height: 540,
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: new ArenaScene("ArenaScene"),
      });
    });

    return () => {
      cancelled = true;
      touchActiveRef.current = false;
      touchRef.current = NEUTRAL;
      game?.destroy(true);
    };
  }, []);

  function handleTouch(vector: JoystickVector) {
    touchRef.current = vector;
    touchActiveRef.current = vector.x !== 0 || vector.y !== 0;
  }

  return (
    <div className="flex flex-col gap-3">
      <div ref={parentRef} className="aspect-video w-full overflow-hidden rounded-card" />
      <div className="flex items-center justify-between gap-3 px-1">
        <VirtualJoystick onChange={handleTouch} />
        <p className="flex-1 text-right text-[11px] leading-relaxed text-faint">
          Joystick untuk HP
          <br />
          <span className="hidden sm:inline">atau </span>
          WASD / tombol arrow di keyboard
        </p>
      </div>
    </div>
  );
}
