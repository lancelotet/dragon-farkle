(function () {
  'use strict';

  var E = window.FarkleEngine;
  var cfg = window.FARKLE_FIREBASE_CONFIG;
  var app = document.getElementById('app');

  if (!cfg || /^REPLACE/.test(cfg.apiKey)) {
    app.textContent = 'Firebase is not configured. Fill in config.js, then reload.';
    throw new Error('config.js is not filled in');
  }
  firebase.initializeApp(cfg);
  var db = firebase.database();

  // Pip centers on a 100x100 grid: columns 25/50/75, rows 25/50/75.
  var PIPS = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [75, 25], [25, 75], [75, 75]],
    5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
    6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]]
  };

  function dieSvg(v) {
    var circles = PIPS[v].map(function (p) {
      return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="9" fill="currentColor"/>';
    }).join('');
    return '<svg viewBox="0 0 100 100" aria-label="' + v + '">' + circles + '</svg>';
  }
  var CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

  function load(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function save(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable: id/name just won't persist */ } }

  var myId = load('farkle.id');
  if (!myId) { myId = Math.random().toString(36).slice(2, 12); save('farkle.id', myId); }

  var roomCode = null;
  var ref = null;
  var room = null;
  var pending = [];
  var pendingKey = '';
  var aiBusy = false;
  var notice = '';

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function getName() {
    var input = document.getElementById('name');
    var name = ((input && input.value) || load('farkle.name')).trim().slice(0, 20);
    if (!name) { notice = 'Enter your name first.'; render(); return ''; }
    save('farkle.name', name);
    return name;
  }

  // Firebase drops null and empty-array fields; restore them so the engine sees the full shape.
  function fromDb(s) {
    return Object.assign({}, s, {
      dice: s.dice || [],
      finalRound: s.finalRound === undefined ? null : s.finalRound,
      winner: s.winner === undefined ? null : s.winner
    });
  }

  function mySeat(seats) {
    for (var i = 0; i < seats.length; i++) if (seats[i].id === myId) return i;
    return -1;
  }

  function randomCode() {
    var c = '';
    for (var i = 0; i < 4; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    return c;
  }

  function enter(code) {
    if (ref) ref.off();
    roomCode = code;
    location.hash = code;
    ref = db.ref('rooms/' + code);
    ref.on('value', function (snap) {
      room = snap.val();
      aiTick();
      render();
    });
    render();
  }

  function leave() {
    if (ref) ref.off();
    ref = null; room = null; roomCode = null; pending = []; notice = '';
    history.replaceState(null, '', location.pathname);
    render();
  }

  function createRoom() {
    var name = getName();
    if (!name) return;
    var code = randomCode();
    var seats = [
      { name: name, type: 'human', id: myId },
      { name: 'Player 2', type: 'open' },
      { name: 'AI 1', type: 'ai' },
      { name: 'AI 2', type: 'ai' },
      { name: 'AI 3', type: 'ai' }
    ];
    db.ref('rooms/' + code).set({ host: myId, seats: seats, game: null }).then(function () {
      enter(code);
    });
  }

  function joinRoom(code) {
    var name = getName();
    if (!name) return;
    db.ref('rooms/' + code).transaction(function (r) {
      if (!r || r.game) return;
      if (mySeat(r.seats) >= 0) return;
      var i = -1;
      for (var k = 0; k < r.seats.length; k++) if (r.seats[k].type === 'open') { i = k; break; }
      if (i < 0) return;
      r.seats[i] = { name: name, type: 'human', id: myId };
      return r;
    }).then(function (res) {
      notice = res.committed ? '' : 'Could not join: wrong code, game full, or already started.';
      enter(code);
    });
  }

  function startGame() {
    db.ref('rooms/' + roomCode).transaction(function (r) {
      if (!r || r.host !== myId) return;
      if (r.game && r.game.status === 'playing') return;
      r.game = E.newGame(r.seats);
      return r;
    }).then(function (res) {
      if (!res.committed) notice = 'Could not start the game.';
      render();
    });
  }

  function sendAction(action, onCommitted) {
    db.ref('rooms/' + roomCode + '/game').transaction(function (s) {
      if (!s) return;
      s = fromDb(s);
      if (s.seats[s.current].id !== myId) return;
      return E.applyAction(s, action) || undefined;
    }).then(function (res) {
      notice = res.committed ? '' : 'That move is not allowed right now.';
      if (res.committed && onCommitted) onCommitted();
      render();
    });
  }

  // The host's browser plays the AI seats, one step at a time.
  function aiTick() {
    if (!room || !room.game || room.host !== myId || aiBusy) return;
    var g = fromDb(room.game);
    if (g.status !== 'playing' || g.seats[g.current].type !== 'ai') return;
    aiBusy = true;
    setTimeout(function () {
      db.ref('rooms/' + roomCode + '/game').transaction(function (s) {
        if (!s) return;
        s = fromDb(s);
        if (s.status !== 'playing' || s.seats[s.current].type !== 'ai') return;
        return E.applyAction(s, E.aiAction(s)) || undefined;
      }).then(function () { aiBusy = false; }, function () { aiBusy = false; });
    }, 900);
  }

  function toggleDie(i) {
    var k = pending.indexOf(i);
    if (k >= 0) pending.splice(k, 1); else pending.push(i);
    render();
  }

  function pageShell(inner) {
    return '<h1>Farkle</h1>' + inner;
  }

  function renderHome() {
    app.innerHTML = pageShell(
      '<div class="card">' +
        '<label class="muted">Your name</label>' +
        '<input id="name" maxlength="20" value="' + esc(load('farkle.name')) + '">' +
        '<button data-act="create">Create game</button>' +
      '</div>' +
      '<div class="card">' +
        '<label class="muted">Join with a code</label>' +
        '<input id="code" maxlength="4" class="code" placeholder="ABCD" autocapitalize="characters">' +
        '<button class="ghost" data-act="join">Join</button>' +
      '</div>' +
      statusLine()
    );
  }

  function statusLine() {
    return '<div class="status muted">' + esc(notice) + '</div>';
  }

  function seatList(seats, currentIdx, showCurrent, score) {
    return seats.map(function (s, i) {
      var cur = showCurrent && i === currentIdx ? ' cur' : '';
      var tag = s.type === 'ai' ? ' <span class="muted">(AI)</span>' : '';
      var you = s.id === myId ? ' <span class="muted">(you)</span>' : '';
      var name = s.type === 'open' ? '<span class="muted">Waiting for player</span>' : esc(s.name) + tag + you;
      var pts = score ? '<b>' + score[i] + '</b>' : '';
      return '<div class="row' + cur + '"><span>' + (cur ? '&#9654; ' : '') + name + '</span>' + pts + '</div>';
    }).join('');
  }

  function renderLobby() {
    var mine = mySeat(room.seats);
    var hasOpen = room.seats.some(function (s) { return s.type === 'open'; });
    var inner = '<div class="card"><div class="muted">Game code</div><h2 class="code">' + esc(roomCode) + '</h2>' +
      seatList(room.seats, -1, false, null) + '</div>';
    if (mine < 0 && hasOpen) {
      inner += '<div class="card"><label class="muted">Your name</label>' +
        '<input id="name" maxlength="20" value="' + esc(load('farkle.name')) + '">' +
        '<button data-act="seat">Join this game</button></div>';
    }
    if (mine >= 0 && room.host === myId) {
      inner += '<div class="card"><button data-act="start">Start game</button>' +
        '<div class="muted">Unclaimed seats become AI players when you start.</div></div>';
    } else if (mine >= 0) {
      inner += '<div class="card muted">Waiting for the host to start the game.</div>';
    }
    app.innerHTML = pageShell(inner + statusLine() + leaveBtn());
  }

  function renderGame() {
    var g = fromDb(room.game);
    var mine = mySeat(g.seats);
    var isMyTurn = g.status === 'playing' && mine >= 0 && g.current === mine;
    var inner = '<div class="card"><div class="muted">Game <span class="code">' + esc(roomCode) + '</span></div>' +
      seatList(g.seats, g.current, g.status === 'playing', g.score) + '</div>';

    if (g.status === 'over') {
      inner += '<div class="card"><h2>' + esc(g.log) + '</h2>';
      if (room.host === myId) inner += '<button data-act="start">New game</button>';
      inner += '</div>';
    } else {
      inner += '<div class="card">';
      inner += '<div class="muted">' + esc(g.log) + '</div>';
      if (g.turnTotal > 0) inner += '<div>Turn total: <b>' + g.turnTotal + '</b></div>';

      if (g.phase === 'select' && g.dice.length) {
        var dieKey = g.dice.join(',') + '|' + g.current + '|' + g.turnTotal;
        if (dieKey !== pendingKey) { pending = []; pendingKey = dieKey; }
        inner += '<div class="dice">' + g.dice.map(function (v, i) {
          var sel = isMyTurn && pending.indexOf(i) >= 0 ? ' sel' : '';
          var attr = isMyTurn ? ' data-act="die" data-i="' + i + '"' : ' disabled';
          return '<button class="die' + sel + '"' + attr + '>' + dieSvg(v) + '</button>';
        }).join('') + '</div>';
        if (isMyTurn) {
          var pts = E.scoreSelection(pending.map(function (i) { return g.dice[i]; }));
          inner += '<button data-act="keep"' + (pts > 0 ? '' : ' disabled') + '>Set aside' +
            (pts > 0 ? ' +' + pts : '') + '</button>';
          inner += '<div class="muted">Tap the scoring dice you want to set aside.</div>';
        }
      } else if (g.phase === 'roll' && isMyTurn) {
        var canBank = E.canBank(g.score[g.current], g.turnTotal);
        inner += '<button data-act="roll">Roll ' + g.available + ' dice</button>';
        inner += '<button class="ghost" data-act="bank"' + (canBank ? '' : ' disabled') + '>Bank ' +
          g.turnTotal + '</button>';
        if (!canBank && g.turnTotal > 0) inner += '<div class="muted">Need 500 in one turn to get on the board.</div>';
      } else if (!isMyTurn) {
        inner += '<div class="muted">Waiting for ' + esc(g.seats[g.current].name) + '...</div>';
      }
      inner += '</div>';
    }

    if (mine < 0) inner += '<div class="muted">You are watching this game.</div>';
    app.innerHTML = pageShell(inner + statusLine() + leaveBtn());
  }

  function leaveBtn() {
    return '<button class="ghost" data-act="home">Leave</button>';
  }

  function render() {
    if (!roomCode) return renderHome();
    if (!room) {
      app.innerHTML = pageShell('<div class="card">Room <span class="code">' + esc(roomCode) +
        '</span> not found.</div>' + leaveBtn());
      return;
    }
    if (!room.game) return renderLobby();
    renderGame();
  }

  app.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-act]');
    if (!b || b.disabled) return;
    var act = b.getAttribute('data-act');
    if (act === 'create') createRoom();
    else if (act === 'join') {
      var code = document.getElementById('code').value.trim().toUpperCase();
      if (code.length !== 4) { notice = 'Enter the 4-letter code.'; render(); return; }
      joinRoom(code);
    }
    else if (act === 'seat') joinRoom(roomCode);
    else if (act === 'start') startGame();
    else if (act === 'die') toggleDie(parseInt(b.getAttribute('data-i'), 10));
    else if (act === 'keep') sendAction({ type: 'select', indices: pending.slice() }, function () { pending = []; });
    else if (act === 'roll') sendAction({ type: 'roll' });
    else if (act === 'bank') sendAction({ type: 'bank' });
    else if (act === 'home') leave();
  });

  function codeFromHash() {
    return decodeURIComponent(location.hash.replace(/^#/, '')).toUpperCase();
  }

  window.addEventListener('hashchange', function () {
    var c = codeFromHash();
    if (c && c !== roomCode) enter(c);
    if (!c && roomCode) leave();
  });

  var initial = codeFromHash();
  if (initial) enter(initial); else render();
})();
