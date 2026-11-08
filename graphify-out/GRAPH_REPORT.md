# Graph Report - dragon-farkle  (2026-11-08)

## Corpus Check
- Corpus is ~3,938 words - fits in a single context window. You may not need a graph.

## Summary
- 64 nodes · 133 edges · 8 communities (7 shown, 1 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.87)
- Token cost: 4,200 input · 2,600 output

## Community Hubs (Navigation)
- Rules Engine
- Firebase Setup and Page Styling
- Game Sync and Turn Driver
- Screen Rendering
- Game Rules and AI Policy
- Player Identity and Seating
- Engine Tests
- Game Actions and Controls

## God Nodes (most connected - your core abstractions)
1. `render()` - 13 edges
2. `renderGame()` - 10 edges
3. `renderLobby()` - 9 edges
4. `esc()` - 7 edges
5. `getName()` - 6 edges
6. `renderHome()` - 6 edges
7. `scoreSelection()` - 6 edges
8. `Farkle Online Game` - 6 edges
9. `Farkle Page Shell` - 6 edges
10. `enter()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Farkle Page Shell` --references--> `index.html`  [INFERRED]
  index.html → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Turn Rules Flow** — readme_scoring_rules, readme_opening_minimum, readme_hot_dice [EXTRACTED 1.00]
- **Firebase Multiplayer Sync** — readme_firebase_realtime_db, readme_room_code, readme_firebase_room_rules [EXTRACTED 1.00]
- **Page Script Load Chain** — index_farkle_page, engine, app [EXTRACTED 1.00]

## Communities (8 total, 1 thin omitted)

### Community 0 - "Rules Engine"
Cohesion: 0.34
Nodes (12): aiAction(), applyAction(), canBank(), faceCounts(), finish(), hasScoring(), isStraight(), isThreePairs() (+4 more)

### Community 1 - "Firebase Setup and Page Styling"
Cohesion: 0.18
Nodes (9): CSS Color Tokens, Selected Die Style, Farkle Page Shell, Firebase Compat SDK, Farkle Online Game, Firebase Realtime Database, GitHub Pages Hosting, index.html (+1 more)

### Community 2 - "Game Sync and Turn Driver"
Cohesion: 0.36
Nodes (7): aiTick(), createRoom(), dieSvg(), enter(), fromDb(), randomCode(), sendAction()

### Community 3 - "Screen Rendering"
Cohesion: 0.54
Nodes (8): esc(), leaveBtn(), pageShell(), renderGame(), renderHome(), renderLobby(), seatList(), statusLine()

### Community 4 - "Game Rules and AI Policy"
Cohesion: 0.29
Nodes (4): AI Players, Hot Dice, Scoring Rules, 10,000 Endgame Rule

### Community 5 - "Player Identity and Seating"
Cohesion: 0.40
Nodes (5): getName(), joinRoom(), load(), mySeat(), save()

### Community 7 - "Game Actions and Controls"
Cohesion: 0.50
Nodes (4): leave(), render(), startGame(), toggleDie()

## Knowledge Gaps
- **6 isolated node(s):** `Hot Dice`, `10,000 Endgame Rule`, `4-Letter Room Code`, `GitHub Pages Hosting`, `Firebase Compat SDK` (+1 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 14 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Farkle Page Shell` connect `Firebase Setup and Page Styling` to `Rules Engine`, `Game Sync and Turn Driver`?**
  _High betweenness centrality (0.271) - this node is a cross-community bridge._
- **What connects `Hot Dice`, `10,000 Endgame Rule`, `4-Letter Room Code` to the rest of the system?**
  _6 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Why does `Farkle Online Game` connect `Firebase Setup and Page Styling` to `Rules Engine`, `Game Sync and Turn Driver`, `Engine Tests`?**
  _High betweenness centrality (0.263) - this node is a cross-community bridge._
- **Why does `Scoring Rules` connect `Game Rules and AI Policy` to `Rules Engine`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._