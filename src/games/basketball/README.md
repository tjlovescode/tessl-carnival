# Basketball

Shoot 8 balls at the hoop and sink as many as you can.

## How to play

- The shooter stands at a different spot on the court for each ball.
- Move the mouse to aim. The dotted line shows the start of the arc: the farther
  the mouse is from the ball, the harder the throw.
- Click to shoot. You can shoot the next ball once the last one has landed or
  left the court. Shots that hit the backboard bounce off it.
- The round ends when all 8 balls are shot and the last one has landed or left
  the court. Click again on the round over screen to play another round.

## Scoring

A ball scores when it drops down through the rim.

| Where the shot is taken from                  | Points for a make |
| --------------------------------------------- | ----------------- |
| Behind the line, 300 px or more from the hoop | 3                 |
| Inside the line, closer than 300 px           | 2                 |
| A miss, from anywhere                         | 0                 |

The spots alternate, starting inside the line, so a round has four 2-point
shots and four 3-point shots, and a perfect round scores 20.

Your score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `shoot`, `step`, `pointsFrom`) and the
  `basketball` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
