# Bug Report — Battleship Game

## Bug 1: CSS Unicode Escape Syntax Incorrect

**Description:** Hit, miss, and sunk markers displayed raw text like `u2022` and `u2716` instead of the intended Unicode symbols (bullet, cross mark, checkmark).

**Root Cause:** CSS `content` property uses the escape syntax `\2716` (without `u`), but the code used JavaScript-style `\u2716` which CSS interprets as the literal characters `u2716`.

**Fix:** Changed all CSS `content` Unicode escapes from `\u2716` to `\2716`, `\u2022` to `\2022`, and `\u2714` to `\2714` in `style.css`.

---

## Bug 2: AI Fallback Hunt Loop Did Not Break Out of Outer Loop

**Description:** When the AI's random hunt exceeded 200 attempts, the fallback nested `for` loop used `break` to exit only the inner loop. The outer loop continued iterating, potentially overwriting a valid `r,c` with a later cell.

**Root Cause:** The `break` statement only exits the innermost loop in JavaScript. Without a flag or labeled break, the outer loop kept running.

**Fix:** Added a `found` boolean flag. Both loops now check `!found` in their condition, so they stop as soon as the first unattacked cell is found.

---

## Bug 3: `randomPlaceShips` Could Silently Skip Ships

**Description:** If random placement failed to place a ship within 1000 attempts, the function silently skipped that ship. This could result in fewer than 5 AI ships, breaking win detection (the game would never detect all ships as sunk).

**Root Cause:** The function only attempted placement once per ship with no retry of the overall layout. In theory, early ships could block later ships from fitting.

**Fix:** Wrapped the entire placement logic in a global retry loop (up to 100 attempts). If any ship fails to place, the board is cleared and all ships are re-placed from scratch. This guarantees all 5 ships are always placed.

---

## Bug 4: Sunk Cells on Enemy Grid Still Showed Hover Highlight

**Description:** On the enemy grid, cells marked as `sunk` still showed the hover highlight (blue background), making them appear clickable even though attacks on them were already blocked.

**Root Cause:** The CSS hover rule `.clickable-grid .cell:hover:not(.hit):not(.miss)` excluded `.hit` and `.miss` but not `.sunk`.

**Fix:** Added `:not(.sunk)` to the hover selector: `.clickable-grid .cell:hover:not(.hit):not(.miss):not(.sunk)`.

---

## Bug 5: Unused `existingShips` Parameter in `isValidPlacement`

**Description:** The `isValidPlacement` function accepted an `existingShips` parameter that was never used. Overlap detection relied entirely on checking the board state (`board[r][c] !== EMPTY`), which is correct, but the unused parameter was misleading.

**Root Cause:** The parameter was a leftover from an earlier design that planned to check ship objects directly for overlap.

**Fix:** Removed the unused `existingShips` parameter from the function signature and all call sites.

---

## Bug 6: AI Hunt Mode Used Sequential Fallback Instead of True Random

**Description:** When the AI was in hunt mode (no active target), it generated random coordinates but fell back to a sequential scan starting from cell (0,0) — row by row, left to right — if 200 random attempts all collided with already-attacked cells. This caused visibly predictable attack patterns, especially in late game.

**Root Cause:** The random-retry approach (`do { random } while (attacked && attempts < 200)`) had a fallback `for` loop that iterated from (0,0) sequentially. As the board filled up, the random retries failed more often, triggering the sequential scan.

**Fix:** Replaced the random-retry + sequential-fallback approach with a **pre-shuffled pool** of all 100 cells (Fisher-Yates shuffle) created at game start. The AI pops from this pool during hunt mode, guaranteeing truly random, uniform cell selection with no sequential patterns.

---

## Bug 7: AI Attack Messages Did Not Show Coordinates

**Description:** When the AI attacked, the message bar displayed generic text like "The enemy hit your ship!" or "The enemy missed!" without indicating which cell was attacked. This made it difficult for the player to verify where the attack landed on their board.

**Root Cause:** The `processAiAttack` function set messages without including the attacked cell's coordinates.

**Fix:** Added coordinate labels to all AI attack messages using the format `"Enemy attacked B5 — hit!"`, `"Enemy attacked G3 — miss!"`, and `"Enemy attacked A1 — sunk your Carrier!"`.

---

## Testing Summary

After applying all fixes:

- Ship placement (manual and random) works correctly with no overlaps or out-of-bounds placements
- Duplicate attacks on the same cell are properly blocked for both player and AI
- Hit, miss, and sunk markers render correctly with proper Unicode symbols
- Win/loss conditions trigger correctly when all ships on either side are sunk
- AI hunt-and-target logic works without infinite loops
- AI attacks are truly random (pre-shuffled pool, no sequential fallback)
- AI attack messages show coordinates for clear feedback
- Fleet status updates correctly with strikethrough for sunk ships
- "Play Again" fully resets all game state
- No console errors during gameplay
