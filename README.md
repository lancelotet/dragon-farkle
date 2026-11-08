# Farkle (online, 2 humans + 3 AI)

Standard Farkle for five seats: you, your wife (each on a phone), and three AI players.
Works in any phone browser. No app install.

## Files

- `index.html`: page shell
- `engine.js`: rules, scoring, AI policy (pure functions, no network)
- `app.js`: lobby, turn controls, Firebase sync, AI driver
- `config.js`: your Firebase config (the only file you edit)
- `test/engine.test.js`: rules tests (`node --test test/engine.test.js`)

## Rules implemented

- 6 dice. Single 1 = 100, single 5 = 50.
- Three of a kind: 2s=200 ... 6s=600; three 1s = 1,000.
- Four / five / six of a kind = 1,000 / 2,000 / 3,000.
- Straight 1-6 = 1,500; three pairs = 1,500.
- Only scoring dice may be set aside; you must set aside at least one die to roll again.
- Farkle (no scoring dice) loses the whole turn.
- Hot dice: all 6 scored, roll all 6 again.
- Opening: you must score 500 in a single turn before you can bank.
- First player to 10,000 banks: every other player gets one final turn; highest score wins.
- Not implemented (sources disagree): two triplets, four-of-a-kind plus pair, and the optional variants.

## Setup (one time)

1. Create a Firebase project at https://console.firebase.google.com (free Spark plan is enough).
2. In the project, open **Build > Realtime Database > Create database**. Pick a region and start in locked mode.
3. Open **Project settings > General > Your apps > Add app (Web)**. Copy the config object into `config.js`.
4. In the Realtime Database **Rules** tab, paste this and publish:

   ```json
   {
     "rules": {
       "rooms": {
         "$code": {
           ".read": true,
           ".write": true,
           ".validate": "$code.matches(/^[A-Z]{4}$/)"
         }
       }
     }
   }
   ```

   These rules let anyone who knows a room code read and write that room. That is fine for a family game with 4-letter codes; it is not authentication.

5. Host on GitHub Pages: push this folder to a GitHub repo, then **Settings > Pages > Deploy from branch > main / root**. The game lives at `https://<your-user>.github.io/<repo>/`.

## Playing

1. You open the page, enter your name, and tap **Create game**. You get a 4-letter code (also in the URL).
2. Your wife opens the same URL on her phone (or types the code), enters her name, and taps **Join this game**.
3. Tap **Start game**. Empty seats become AI players. The game runs on the host's browser, so keep the host's page open (the screen can lock, but not close).
4. On your turn: tap the scoring dice, press **Set aside**, then **Roll** or **Bank**.

## Notes

- The AI decides: roll until it has 300+ in a turn or 2 dice left, then bank (it never banks below the opening minimum).
- If the host's browser is closed, the AI seats pause until the host returns.
