import type { Ant, Game, Marble } from '../game/types';

/** Rendering works in logical 900x700 coordinates; main.ts scales the context for the display. */
export interface RenderContext {
  game: Game;
  ctx: CanvasRenderingContext2D;
}

export type MarbleAppearance = Pick<Marble, 'type' | 'health' | 'maxHealth'> &
  Partial<
    Pick<Marble, 'elapsed' | 'touchingAnt' | 'fuseRemaining' | 'isRolling' | 'poisonRemaining'>
  >;

export type AntAppearance = Pick<
  Ant,
  | 'type'
  | 'x'
  | 'y'
  | 'health'
  | 'maxHealth'
  | 'armor'
  | 'slowRemaining'
  | 'flashRemaining'
  | 'animationPhase'
> &
  Partial<Pick<Ant, 'traversal' | 'jumpHeight' | 'spansAllLanes' | 'emergence'>>;
