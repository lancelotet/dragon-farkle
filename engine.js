// Farkle rules engine: pure functions, no DOM, no network.
// Standard scoring (gameonfamily.com / dicegamedepot.com), 500 opening minimum,
// 10,000 to win with one final turn for each other player.
(function (root) {
  const WIN_SCORE = 10000;
  const OPENING_MIN = 500;
  const DICE_PER_ROLL = 6;

  function faceCounts(values) {
    const c = [0, 0, 0, 0, 0, 0, 0];
    for (const v of values) c[v]++;
    return c;
  }

  function isStraight(values) {
    return values.length === 6 && [1, 2, 3, 4, 5, 6].every((f) => values.includes(f));
  }

  function isThreePairs(values) {
    if (values.length !== 6) return false;
    return faceCounts(values).filter((n) => n === 2).length === 3;
  }

  // A roll farkles when no die can score.
  function hasScoring(values) {
    const c = faceCounts(values);
    if (c[1] || c[5]) return true;
    if (c.some((n) => n >= 3)) return true;
    return isStraight(values) || isThreePairs(values);
  }

  function tripleValue(face, n) {
    if (n === 3) return face === 1 ? 1000 : face * 100;
    if (n === 4) return 1000;
    if (n === 5) return 2000;
    return 3000; // six of a kind
  }

  // Points for a set of dice being set aside together. Returns 0 if any die is non-scoring.
  function scoreSelection(values) {
    if (values.length === 0) return 0;
    if (isStraight(values)) return 1500;
    if (isThreePairs(values)) return 1500;
    const c = faceCounts(values);
    let total = 0;
    for (let f = 1; f <= 6; f++) {
      const n = c[f];
      if (n === 0) continue;
      if (n >= 3) total += tripleValue(f, n);
      else if (f === 1) total += 100 * n;
      else if (f === 5) total += 50 * n;
      else return 0;
    }
    return total;
  }

  // Indices of dice in a roll that can legally be set aside (all scoring dice).
  function scoringIndices(values) {
    if (isStraight(values) || isThreePairs(values)) return values.map((_, i) => i);
    const c = faceCounts(values);
    return values
      .map((v, i) => (v === 1 || v === 5 || c[v] >= 3 ? i : -1))
      .filter((i) => i >= 0);
  }

  function canBank(score, turnTotal) {
    if (turnTotal <= 0) return false;
    return score > 0 || turnTotal >= OPENING_MIN;
  }

  function newGame(seats) {
    const finalSeats = seats.map((s) => ({ ...s, type: s.type === 'open' ? 'ai' : s.type }));
    return {
      status: 'playing',
      seats: finalSeats,
      score: finalSeats.map(() => 0),
      current: 0,
      phase: 'roll',
      available: DICE_PER_ROLL,
      dice: [],
      turnTotal: 0,
      finalRound: null,
      winner: null,
      log: 'Game started.',
    };
  }

  function nextTurn(s, message) {
    const n = s.seats.length;
    const next = (s.current + 1) % n;
    const base = {
      ...s,
      current: next,
      phase: 'roll',
      available: DICE_PER_ROLL,
      dice: [],
      turnTotal: 0,
      log: message,
    };
    if (s.finalRound !== null && next === s.finalRound) {
      return finish(base);
    }
    return base;
  }

  function finish(s) {
    let winner = 0;
    s.score.forEach((pts, i) => {
      if (pts > s.score[winner]) winner = i;
    });
    return { ...s, status: 'over', winner, log: `${s.seats[winner].name} wins with ${s.score[winner]}!` };
  }

  // Applies one action. Returns the new state, or null if the action is not legal now.
  // action: { type: 'roll' } | { type: 'select', indices: number[] } | { type: 'bank' }
  function applyAction(s, action, rand = Math.random) {
    if (!s || s.status !== 'playing') return null;
    const who = s.seats[s.current].name;

    if (action.type === 'roll') {
      if (s.phase !== 'roll') return null;
      const values = Array.from({ length: s.available }, () => 1 + Math.floor(rand() * 6));
      if (!hasScoring(values)) {
        return nextTurn({ ...s, dice: values }, `${who} rolled [${values.join(' ')}] and farkled!`);
      }
      return { ...s, phase: 'select', dice: values, log: `${who} rolled [${values.join(' ')}].` };
    }

    if (action.type === 'select') {
      if (s.phase !== 'select') return null;
      const indices = action.indices;
      if (!Array.isArray(indices) || indices.length === 0) return null;
      if (new Set(indices).size !== indices.length) return null;
      if (indices.some((i) => !Number.isInteger(i) || i < 0 || i >= s.dice.length)) return null;
      const values = indices.map((i) => s.dice[i]);
      const points = scoreSelection(values);
      if (points === 0) return null;
      const remaining = s.available - indices.length;
      const hot = remaining === 0;
      return {
        ...s,
        phase: 'roll',
        available: hot ? DICE_PER_ROLL : remaining,
        dice: [],
        turnTotal: s.turnTotal + points,
        log: `${who} set aside ${points}${hot ? ' (hot dice!)' : ''}.`,
      };
    }

    if (action.type === 'bank') {
      if (s.phase !== 'roll') return null;
      if (!canBank(s.score[s.current], s.turnTotal)) return null;
      const score = s.score.slice();
      score[s.current] += s.turnTotal;
      let finalRound = s.finalRound;
      if (score[s.current] >= WIN_SCORE && finalRound === null) finalRound = s.current;
      const banked = { ...s, score, finalRound };
      return nextTurn(banked, `${who} banked ${s.turnTotal}.`);
    }

    return null;
  }

  // The AI's next action from the current state. Simple, fixed policy.
  function aiAction(s) {
    if (s.phase === 'select') return { type: 'select', indices: scoringIndices(s.dice) };
    if (s.turnTotal === 0) return { type: 'roll' };
    const bankable = canBank(s.score[s.current], s.turnTotal);
    if (bankable && (s.turnTotal >= 300 || s.available <= 2)) return { type: 'bank' };
    return { type: 'roll' };
  }

  const api = {
    WIN_SCORE,
    OPENING_MIN,
    DICE_PER_ROLL,
    scoreSelection,
    scoringIndices,
    hasScoring,
    canBank,
    newGame,
    applyAction,
    aiAction,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FarkleEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
