const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../engine.js');

test('single 1 and 5 score 100 and 50', () => {
  assert.equal(E.scoreSelection([1]), 100);
  assert.equal(E.scoreSelection([5]), 50);
  assert.equal(E.scoreSelection([1, 5]), 150);
});

test('three of a kind: three 1s = 1000, others = face * 100', () => {
  assert.equal(E.scoreSelection([1, 1, 1]), 1000);
  assert.equal(E.scoreSelection([2, 2, 2]), 200);
  assert.equal(E.scoreSelection([6, 6, 6]), 600);
});

test('four, five, six of a kind = 1000, 2000, 3000', () => {
  assert.equal(E.scoreSelection([3, 3, 3, 3]), 1000);
  assert.equal(E.scoreSelection([4, 4, 4, 4, 4]), 2000);
  assert.equal(E.scoreSelection([2, 2, 2, 2, 2, 2]), 3000);
});

test('straight 1-6 and three pairs = 1500', () => {
  assert.equal(E.scoreSelection([1, 2, 3, 4, 5, 6]), 1500);
  assert.equal(E.scoreSelection([2, 2, 3, 3, 4, 4]), 1500);
});

test('non-scoring dice cannot be set aside', () => {
  assert.equal(E.scoreSelection([2]), 0);
  assert.equal(E.scoreSelection([2, 3]), 0);
  assert.equal(E.scoreSelection([1, 2, 3]), 0);
  assert.equal(E.scoreSelection([2, 2]), 0);
});

test('farkle detection', () => {
  assert.equal(E.hasScoring([2, 3, 4, 6]), false);
  assert.equal(E.hasScoring([2, 2, 3, 4, 6, 6]), false);
  assert.equal(E.hasScoring([2, 3, 4, 6, 1]), true);
  assert.equal(E.hasScoring([2, 2, 2, 3, 4]), true);
  assert.equal(E.hasScoring([1, 2, 3, 4, 5, 6]), true);
});

test('scoringIndices picks every scoring die', () => {
  assert.deepEqual(E.scoringIndices([1, 2, 2, 2, 5, 3]), [0, 1, 2, 3, 4]);
});

test('opening: cannot bank below 500 on the board', () => {
  assert.equal(E.canBank(0, 450), false);
  assert.equal(E.canBank(0, 500), true);
  assert.equal(E.canBank(50, 100), true);
});

test('roll then select then bank updates score and advances turn', () => {
  let s = E.newGame([
    { name: 'A', type: 'human', id: 'a' },
    { name: 'B', type: 'human', id: 'b' },
  ]);
  const seq = [0, 0, 0, 3, 4, 5]; // values 1,1,1,4,5,6 (floor(rand*6)+1)
  let i = 0;
  const rand = () => (seq[i++] + 0.5) / 6;
  s = E.applyAction(s, { type: 'roll' }, rand);
  assert.deepEqual(s.dice, [1, 1, 1, 4, 5, 6]);
  s = E.applyAction(s, { type: 'select', indices: [0, 1, 2, 4] });
  assert.equal(s.turnTotal, 1000 + 50);
  assert.equal(s.available, 2);
  s = E.applyAction(s, { type: 'bank' });
  assert.equal(s.score[0], 1050);
  assert.equal(s.current, 1);
  assert.equal(s.phase, 'roll');
});

test('bank below opening minimum is rejected', () => {
  let s = E.newGame([{ name: 'A', type: 'human' }, { name: 'B', type: 'human' }]);
  s = { ...s, phase: 'roll', turnTotal: 100 };
  assert.equal(E.applyAction(s, { type: 'bank' }), null);
});

test('farkle wipes the turn and passes play', () => {
  let s = E.newGame([{ name: 'A', type: 'human' }, { name: 'B', type: 'human' }]);
  s = { ...s, turnTotal: 300 };
  const seq = [1, 2, 3, 5, 1, 2]; // values 2,3,4,6,2,3: no score
  let i = 0;
  const rand = () => (seq[i++] + 0.5) / 6;
  const after = E.applyAction(s, { type: 'roll' }, rand);
  assert.equal(after.current, 1);
  assert.equal(after.turnTotal, 0);
  assert.deepEqual(after.score, [0, 0]);
});

test('hot dice resets available to 6', () => {
  let s = E.newGame([{ name: 'A', type: 'human' }, { name: 'B', type: 'human' }]);
  s = { ...s, phase: 'select', dice: [1, 5, 1, 5, 1, 5], available: 6 };
  const after = E.applyAction(s, { type: 'select', indices: [0, 1, 2, 3, 4, 5] });
  assert.equal(after.available, 6);
  assert.equal(after.phase, 'roll');
});

test('reaching 10000 triggers one final turn for each other player, then ends', () => {
  let s = E.newGame([
    { name: 'A', type: 'human' },
    { name: 'B', type: 'human' },
    { name: 'C', type: 'ai' },
  ]);
  s = { ...s, score: [9900, 600, 0], turnTotal: 200, phase: 'roll', current: 0 };
  s = E.applyAction(s, { type: 'bank' });
  assert.equal(s.finalRound, 0);
  assert.equal(s.status, 'playing');
  assert.equal(s.current, 1);
  s = { ...s, phase: 'roll', turnTotal: 50 };
  s = E.applyAction(s, { type: 'bank' });
  assert.equal(s.status, 'playing', 'C still gets a final turn');
  assert.equal(s.current, 2);
  s = { ...s, phase: 'roll', turnTotal: 500 };
  s = E.applyAction(s, { type: 'bank' });
  assert.equal(s.status, 'over');
  assert.equal(s.winner, 0);
});

test('AI selects all scoring dice and banks at 300+', () => {
  let s = { ...E.newGame([{ name: 'A', type: 'ai' }, { name: 'B', type: 'human' }]), score: [600, 0], phase: 'select', dice: [1, 2, 5, 2, 4, 6], available: 6, turnTotal: 0 };
  assert.deepEqual(E.aiAction(s), { type: 'select', indices: [0, 2] });
  s = { ...s, phase: 'roll', turnTotal: 300 };
  assert.deepEqual(E.aiAction(s), { type: 'bank' });
});

test('AI rolls instead of banking below the opening minimum', () => {
  const s = { ...E.newGame([{ name: 'A', type: 'ai' }, { name: 'B', type: 'human' }]), phase: 'roll', turnTotal: 300, available: 4, score: [0, 0] };
  assert.deepEqual(E.aiAction(s), { type: 'roll' });
});
