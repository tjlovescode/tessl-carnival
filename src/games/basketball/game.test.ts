import { describe, expect, it } from 'vitest';
import {
  BALLS_PER_ROUND,
  GRAVITY,
  HOOP,
  SPOTS,
  createState,
  pointsFrom,
  releasePoint,
  shoot,
  step,
  type BasketballState,
} from './game';

/** Shoots the next ball on an arc that drops through the middle of the rim. */
function shootAtRim(state: BasketballState) {
  const from = releasePoint(state);
  const vy = -700;
  // Time for the ball to rise and fall back to the rim's height.
  const t = (-vy + Math.sqrt(vy * vy + 2 * GRAVITY * (HOOP.y - from.y))) / GRAVITY;
  expect(shoot(state, from.x + 1, from.y - 1)).toBe(true);
  Object.assign(state.ball!, { vx: (HOOP.x - from.x) / t, vy });
}

/** Steps until the ball in the air lands or leaves the court. */
function settle(state: BasketballState) {
  for (let i = 0; i < 1000 && state.ball; i++) step(state, 1 / 120);
  expect(state.ball).toBeNull();
}

describe('basketball', () => {
  it('starts with 8 balls, no score and the ball in hand', () => {
    const state = createState();
    expect(state.balls).toBe(BALLS_PER_ROUND);
    expect(BALLS_PER_ROUND).toBe(8);
    expect(state.score).toBe(0);
    expect(state.ball).toBeNull();
    expect(state.phase).toBe('playing');
  });

  it('scores 2 for a make from close to the hoop', () => {
    const state = createState();
    expect(pointsFrom(SPOTS[0])).toBe(2);
    shootAtRim(state);
    settle(state);
    expect(state.score).toBe(2);
    expect(state.makes).toBe(1);
    expect(state.last?.points).toBe(2);
  });

  it('scores 3 for a make from farther away', () => {
    const state = createState();
    state.spot = 1;
    expect(pointsFrom(SPOTS[1])).toBe(3);
    shootAtRim(state);
    settle(state);
    expect(state.score).toBe(3);
  });

  it('scores nothing for a miss', () => {
    const state = createState();
    const from = releasePoint(state);
    // A soft lob that falls well short of the rim.
    shoot(state, from.x + 20, from.y - 20);
    settle(state);
    expect(state.score).toBe(0);
    expect(state.makes).toBe(0);
    expect(state.last?.points).toBe(0);
  });

  it('counts a ball that leaves the court as a miss', () => {
    const state = createState();
    shoot(state, 0, 0);
    state.ball!.vx = -2000;
    settle(state);
    expect(state.score).toBe(0);
  });

  it('only shoots one ball at a time', () => {
    const state = createState();
    expect(shoot(state, 400, 100)).toBe(true);
    expect(shoot(state, 400, 100)).toBe(false);
    expect(state.balls).toBe(BALLS_PER_ROUND - 1);
  });

  it('moves the shooter to the next spot after each shot', () => {
    const state = createState();
    shoot(state, 400, 100);
    settle(state);
    expect(state.spot).toBe(1);
    expect(releasePoint(state).x).toBe(SPOTS[1]);
  });

  it('keeps playing while the last ball is in the air', () => {
    const state = createState();
    state.balls = 1;
    shoot(state, 400, 100);
    step(state, 0.01);
    expect(state.phase).toBe('playing');
  });

  it('ends the round once every ball is shot and the last one has landed', () => {
    const state = createState();
    for (let i = 0; i < BALLS_PER_ROUND; i++) {
      shootAtRim(state);
      settle(state);
    }
    expect(state.phase).toBe('over');
    expect(state.balls).toBe(0);
    expect(state.score).toBe(4 * 2 + 4 * 3);
    expect(shoot(state, 400, 100)).toBe(false);
  });
});
