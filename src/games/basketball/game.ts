import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const BALLS_PER_ROUND = 8;
export const BALL_RADIUS = 12;
export const GRAVITY = 900;
/** Launch speed per pixel between the shooter's hands and the aim point. */
export const POWER = 2.2;
export const MAX_SPEED = 1000;
export const FLOOR_Y = HEIGHT - 40;
/** The centre of the rim. A ball scores when it drops through it. */
export const HOOP = { x: 660, y: 200, halfWidth: 30 } as const;
export const BACKBOARD = { x: 700, top: 120, bottom: 220 } as const;
/** Makes from at least this far from the hoop, along the floor, score 3. */
export const THREE_POINT_DISTANCE = 300;
/** Where the shooter stands for each ball, in order. Every second ball is a three. */
export const SPOTS = [480, 300, 420, 200, 520, 140, 380, 260] as const;
/** How far above the floor the ball leaves the shooter's hands. */
export const RELEASE_HEIGHT = 80;

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** What a make is worth, from where the shot was taken. */
  points: 2 | 3;
  scored: boolean;
}

export interface BasketballState {
  /** Balls not yet shot. */
  balls: number;
  /** Index into SPOTS of where the shooter stands. */
  spot: number;
  ball: Ball | null;
  score: number;
  makes: number;
  /** How the last shot went, and how long ago it finished, for the banner. */
  last: { points: number; age: number } | null;
  phase: 'playing' | 'over';
}

export function createState(): BasketballState {
  return {
    balls: BALLS_PER_ROUND,
    spot: 0,
    ball: null,
    score: 0,
    makes: 0,
    last: null,
    phase: 'playing',
  };
}

export function pointsFrom(x: number): 2 | 3 {
  return Math.abs(HOOP.x - x) >= THREE_POINT_DISTANCE ? 3 : 2;
}

/** Where the ball leaves the shooter's hands. */
export function releasePoint(state: BasketballState): { x: number; y: number } {
  return { x: SPOTS[state.spot % SPOTS.length], y: FLOOR_Y - RELEASE_HEIGHT };
}

/** The launch velocity for an aim point: farther from the hands throws harder. */
export function launchVelocity(
  from: { x: number; y: number },
  aimX: number,
  aimY: number,
): { vx: number; vy: number } {
  let vx = (aimX - from.x) * POWER;
  let vy = Math.min(aimY - from.y, 0) * POWER;
  const speed = Math.hypot(vx, vy);
  if (speed > MAX_SPEED) {
    vx = (vx / speed) * MAX_SPEED;
    vy = (vy / speed) * MAX_SPEED;
  }
  return { vx, vy };
}

/** Shoots the next ball towards the aim point. Returns false if nothing was shot. */
export function shoot(state: BasketballState, aimX: number, aimY: number): boolean {
  if (state.phase !== 'playing' || state.ball || state.balls === 0) return false;
  const from = releasePoint(state);
  state.ball = {
    ...from,
    ...launchVelocity(from, aimX, aimY),
    points: pointsFrom(from.x),
    scored: false,
  };
  state.balls -= 1;
  return true;
}

/** Advances the game by `dt` seconds. */
export function step(state: BasketballState, dt: number): void {
  if (state.last) state.last.age += dt;

  const ball = state.ball;
  if (ball) {
    const prevX = ball.x;
    const prevY = ball.y;
    ball.vy += GRAVITY * dt;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // Bounce off the front of the backboard.
    if (
      ball.vx > 0 &&
      prevX + BALL_RADIUS <= BACKBOARD.x &&
      ball.x + BALL_RADIUS > BACKBOARD.x &&
      ball.y >= BACKBOARD.top &&
      ball.y <= BACKBOARD.bottom
    ) {
      ball.x = BACKBOARD.x - BALL_RADIUS;
      ball.vx = -ball.vx * 0.6;
    }

    // Through the rim: falling past the rim's height between its two sides.
    if (!ball.scored && ball.vy > 0 && prevY < HOOP.y && ball.y >= HOOP.y) {
      const t = (HOOP.y - prevY) / (ball.y - prevY);
      const crossX = prevX + (ball.x - prevX) * t;
      if (Math.abs(crossX - HOOP.x) < HOOP.halfWidth) {
        ball.scored = true;
        state.score += ball.points;
        state.makes += 1;
      }
    }

    const landed = ball.y + BALL_RADIUS >= FLOOR_Y;
    const offCourt = ball.x < -BALL_RADIUS || ball.x > WIDTH + BALL_RADIUS;
    if (landed || offCourt) {
      state.last = { points: ball.scored ? ball.points : 0, age: 0 };
      state.ball = null;
      if (state.balls > 0) state.spot += 1;
    }
  }

  if (state.balls === 0 && !state.ball) state.phase = 'over';
}

function draw(
  ctx: CanvasRenderingContext2D,
  state: BasketballState,
  aim: { x: number; y: number },
) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // Court floor and the three-point line.
  ctx.fillStyle = colors.wood;
  ctx.fillRect(0, FLOOR_Y, WIDTH, HEIGHT - FLOOR_Y);
  const threeX = HOOP.x - THREE_POINT_DISTANCE;
  ctx.fillStyle = colors.accent;
  ctx.fillRect(threeX - 2, FLOOR_Y, 4, HEIGHT - FLOOR_Y);
  ctx.font = canvasFont('small', 'bold');
  ctx.textAlign = 'center';
  ctx.fillText('3 POINTS', threeX / 2, FLOOR_Y + 26);
  ctx.fillText('2 POINTS', (threeX + BACKBOARD.x) / 2, FLOOR_Y + 26);

  // Pole, backboard, rim and net.
  ctx.fillStyle = colors.muted;
  ctx.fillRect(BACKBOARD.x + 8, BACKBOARD.top + 40, 10, FLOOR_Y - BACKBOARD.top - 40);
  ctx.fillStyle = colors.stripeB;
  ctx.fillRect(BACKBOARD.x, BACKBOARD.top, 8, BACKBOARD.bottom - BACKBOARD.top);
  ctx.strokeStyle = colors.muted;
  ctx.lineWidth = 2;
  for (let i = 0; i <= 4; i++) {
    const x = HOOP.x - HOOP.halfWidth + (i * HOOP.halfWidth) / 2;
    ctx.beginPath();
    ctx.moveTo(x, HOOP.y);
    ctx.lineTo(HOOP.x + (x - HOOP.x) * 0.5, HOOP.y + 36);
    ctx.stroke();
  }
  ctx.fillStyle = colors.stripeA;
  ctx.fillRect(HOOP.x - HOOP.halfWidth, HOOP.y - 3, HOOP.halfWidth * 2, 6);
  ctx.fillRect(HOOP.x + HOOP.halfWidth, HOOP.y - 3, BACKBOARD.x - HOOP.x - HOOP.halfWidth, 4);

  // The shooter, at their spot.
  const hands = state.ball ? null : releasePoint(state);
  const shooterX = SPOTS[state.spot % SPOTS.length];
  ctx.fillStyle = colors.surface;
  ctx.fillRect(shooterX - 12, FLOOR_Y - 70, 24, 70);
  ctx.beginPath();
  ctx.arc(shooterX, FLOOR_Y - 84, 12, 0, Math.PI * 2);
  ctx.fill();

  // Aim guide: the start of the arc the next shot will take.
  if (hands && state.phase === 'playing' && state.balls > 0) {
    const { vx, vy } = launchVelocity(hands, aim.x, aim.y);
    ctx.fillStyle = colors.muted;
    for (let i = 1; i <= 8; i++) {
      const t = i * 0.05;
      ctx.beginPath();
      ctx.arc(hands.x + vx * t, hands.y + vy * t + (GRAVITY * t * t) / 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // The ball, in the air or in the shooter's hands.
  const ball = state.ball ?? (state.balls > 0 ? hands : null);
  if (ball) {
    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = colors.wood;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ball.x - BALL_RADIUS, ball.y);
    ctx.lineTo(ball.x + BALL_RADIUS, ball.y);
    ctx.stroke();
  }

  if (state.last && state.last.age < 1 && state.phase === 'playing') {
    ctx.textAlign = 'center';
    ctx.font = canvasFont('title', 'bold');
    ctx.fillStyle = state.last.points > 0 ? colors.accent : colors.danger;
    ctx.fillText(state.last.points > 0 ? `+${state.last.points}` : 'Miss', WIDTH / 2, 100);
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, 70);
  ctx.textAlign = 'right';
  ctx.fillText(`Balls ${state.balls}/${BALLS_PER_ROUND}`, WIDTH - 16, 70);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of balls! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText(
      `${state.makes} of ${BALLS_PER_ROUND} made. Click to play again`,
      WIDTH / 2,
      HEIGHT / 2 + 40,
    );
  }
}

export const basketball: CarnivalGame = {
  id: 'basketball',
  name: 'Basketball',
  description: 'Sink as many of your 8 shots as you can. Makes from behind the line score 3.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    const aim = { x: WIDTH / 2, y: HEIGHT / 3 };

    const toCanvas = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
      };
    };
    const onMove = (event: PointerEvent) => Object.assign(aim, toCanvas(event));
    const onDown = (event: PointerEvent) => {
      Object.assign(aim, toCanvas(event));
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
      } else {
        shoot(state, aim.x, aim.y);
      }
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't teleport the ball.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(basketball.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state, aim);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default basketball;
