# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Dimensia is a WebXR-enabled particle wave visualization application that supports both desktop and VR experiences. It uses Three.js for 3D graphics and features adaptive performance settings (500K particles for PC, 5K for VR).

## Commands

### Development
```bash
# Install dependencies
npm install

# Run HTTP server (production)
npm start

# Run HTTPS server (local development)
node server_local.js
```

### Testing
No test framework is currently configured. The `npm test` command will show an error message.

## Architecture

### Server Architecture
The project has two server configurations:
- **server.js**: HTTP server serving static files from `public/` directory on port 3000
- **server_local.js**: HTTPS server with SSL certificates for local development

Both servers are Express-based and configured to serve the application at `https://dimensia.aixrlab.space`.

### Frontend Architecture
The main application (`public/index.html`) is a single-page Three.js application with:

1. **Adaptive Performance System**: Automatically switches between `pc_params` (500K particles) and `vr_params` (5K particles) based on whether VR mode is active
2. **Particle Wave System**: Uses Three.js InstancedMesh for efficient rendering of thousands of particles animated with sine wave functions
3. **Input Systems**:
   - PC: WASD movement, Shift to run, mouse look
   - VR: Grip button for teleportation, trigger for settings changes
4. **WebXR Integration**: Full VR support with controller visualization and teleportation mechanics

### Key Technical Decisions
- Three.js r128 loaded via CDN using ES6 import maps
- Self-signed SSL certificates stored in `ssl/` directory
- No build process - direct browser execution of ES6 modules
- InstancedMesh for particle rendering optimization
- Dynamic particle recreation when switching between PC/VR modes

## Important Implementation Details

### Parameter Switching
The application uses two parameter sets that are dynamically switched:
- `pc_params`: High particle count for desktop viewing
- `vr_params`: Reduced particle count for VR performance
- Switching happens automatically on VR session start/end via `switchToVRParams()` and `switchToPCParams()`

### SSL Configuration
HTTPS is required for WebXR. The `server_local.js` uses certificates from:
- `ssl/key.pem`
- `ssl/cert.pem`

These are self-signed certificates suitable for local development.

### Performance Considerations
- Particle positions are pre-calculated and stored in `particlePositions` array
- Only Y-position is updated in the animation loop for wave effect
- Fog is used to hide distant particles and improve performance
- VR mode significantly reduces particle count to maintain 90fps