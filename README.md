# 🚀 Space Push

A 3D multiplayer browser game where players push each other off a floating hexagonal platform in space. Last player standing wins!

![Space Push](https://img.shields.io/badge/Players-Up%20to%2040-blue)
![Tech](https://img.shields.io/badge/Stack-React%20%2B%20Three.js%20%2B%20Socket.io-purple)

## Features

- **Multiplayer Mode**: Up to 40 players in real-time battles
- **Single Player Mode**: Practice against AI opponent
- **Physics-based gameplay**: Realistic collisions and momentum
- **Shrinking platform**: Arena shrinks over time for intense finales
- **Mobile support**: Touch controls for phones/tablets
- **Visual effects**: Particle trails, collision sparks, elimination animations

## Controls

| Action | Keyboard | Mobile |
|--------|----------|--------|
| Move | Arrow Keys | Drag |
| Boost | Spacebar | Tap |
| Anchor (resist push) | Enter | - |

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run production server
npm start
```

## Deployment

### Local Development
The dev server runs on:
- Client: http://localhost:5173
- Server: http://localhost:3000

### Production (EC2/VPS)
```bash
npm install
npm run build
npm start
```

The server serves the built client and handles WebSocket connections on port 3000.

## Tech Stack

- **Frontend**: React, Three.js, React Three Fiber, Tailwind CSS
- **Backend**: Node.js, Express, Socket.io
- **Physics**: Cannon-es

## License

MIT
