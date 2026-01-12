# Product Requirements Document (PRD)

## Feature: SPACE PUSH - 3D Multiplayer Zero Gravity Arena

### Overview
A 3D multiplayer browser game where up to 40 players control astronauts on a floating platform in space. Players push each other off the platform using momentum and boost. Last one standing wins. Includes a secret Konami code for instant win.

### Core Experience
- Players join via URL (no login required)
- Enter name, wait in lobby
- Host starts game when ready
- 3D space environment with floating neon platform
- Push other players off the edge
- Platform shrinks over time
- Last player standing wins

### Technical Stack
- **Backend:** Node.js + Express + Socket.io (WebSockets)
- **Frontend:** React + Three.js (React Three Fiber)
- **Physics:** Cannon.js or Rapier
- **Styling:** Tailwind CSS

### Controls
| Input | Action |
|-------|--------|
| ↑ ↓ ← → | Move astronaut |
| SPACE | Boost/Dash |
| ENTER | Ready up / Join |
| Konami Code | Secret instant win |

### Mobile Controls
| Touch | Action |
|-------|--------|
| Drag anywhere | Move direction |
| Tap screen | Boost/Dash |

### Game Flow
1. Players visit URL
2. Enter name, click JOIN
3. Wait in lobby (see other players joining)
4. First player becomes host and sees START button
5. Host clicks START when ready
6. 3-2-1 countdown
7. Game begins
8. Platform shrinks every 30 seconds
9. Last player standing wins
10. Victory screen, option to play again

### Visual Requirements
- Deep space background with stars/nebulas
- Glowing neon hexagonal platform
- Astronaut orbs with colored glow
- Jetpack flame trail on boost
- Spark particles on collision
- Dramatic elimination animation (spin into void)
- Camera slowly orbits the arena
- Rim lighting, shadows

### Secret Feature
- Konami Code: ↑ ↑ ↓ ↓ ← → ← → SPACE ENTER
- Effect: Shockwave explosion, all other players eliminated
- Winner display: "👑 ALL HAIL THE KING 👑"

### Constraints
- Max 40 concurrent players
- Must work on desktop (Chrome/Firefox/Safari)
- Must work on mobile (touch controls)
- First player to join is automatically host
- If host leaves, next player becomes host
- No authentication required
