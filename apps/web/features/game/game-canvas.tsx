"use client";

import { useEffect, useRef } from "react";
import * as Phaser from "phaser";
import type { GameInput, GameState } from "@chating/contracts";

type GameCanvasProps = {
  state: GameState;
  onInput: (input: GameInput) => void;
};

export function GameCanvas({ state, onInput }: GameCanvasProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  const inputRef = useRef(onInput);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    inputRef.current = onInput;
  }, [onInput]);

  useEffect(() => {
    if (!parentRef.current) return;
    class ArenaScene extends Phaser.Scene {
      private keys!: Record<string, Phaser.Input.Keyboard.Key>;
      private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
      private graphics!: Phaser.GameObjects.Graphics;
      private sequence = 0;

      create() {
        const keyboard = this.input.keyboard;
        if (!keyboard) return;
        this.keys = keyboard.addKeys("W,A,S,D") as Record<string, Phaser.Input.Keyboard.Key>;
        this.cursors = keyboard.createCursorKeys();
        this.graphics = this.add.graphics();
      }

      override update() {
        const current = stateRef.current;
        if (!this.graphics) return;
        const x = (this.cursors.right.isDown || this.keys.D?.isDown ? 1 : 0) - (this.cursors.left.isDown || this.keys.A?.isDown ? 1 : 0);
        const y = (this.cursors.down.isDown || this.keys.S?.isDown ? 1 : 0) - (this.cursors.up.isDown || this.keys.W?.isDown ? 1 : 0);
        inputRef.current({ x, y, sequence: this.sequence += 1 });
        this.graphics.clear();
        this.graphics.fillStyle(0x101820);
        this.graphics.fillRect(0, 0, 960, 540);
        for (const token of current.tokens) {
          this.graphics.fillStyle(0xf2c14e);
          this.graphics.fillCircle(token.x, token.y, 12);
        }
        for (const hazard of current.hazards) {
          this.graphics.fillStyle(0xd95d39);
          this.graphics.fillCircle(hazard.x, hazard.y, hazard.radius);
        }
        for (const player of current.players) {
          this.graphics.fillStyle(player.id === current.hostId ? 0x4d96ff : 0x62c370);
          this.graphics.fillCircle(player.x, player.y, 18);
        }
      }
    }

    const game = new Phaser.Game({ type: Phaser.AUTO, parent: parentRef.current, width: 960, height: 540, scene: new ArenaScene("ArenaScene") });
    return () => game.destroy(true);
  }, []);

  return <div ref={parentRef} />;
}
