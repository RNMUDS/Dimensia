# Dimensia - WebXR Particle Wave Visualization

A mesmerizing particle wave visualization experience that works seamlessly on both desktop browsers and VR headsets. Experience waves of light with up to 500,000 particles on desktop or optimized performance in VR.

![Dimensia VR Experience](https://img.shields.io/badge/WebXR-Ready-blue)
![Three.js](https://img.shields.io/badge/Three.js-r128-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

## Features

- **Adaptive Performance**: Automatically adjusts particle count based on platform
  - Desktop: 500,000 particles for stunning visual density
  - VR: 5,000 particles optimized for 90fps performance
- **WebXR Support**: Full VR compatibility with hand tracking and teleportation
- **Real-time Wave Animation**: Dynamic sine wave effects with configurable parameters
- **Multiple Control Schemes**:
  - Desktop: WASD movement + mouse look
  - VR: Grip button teleportation + trigger interactions

## Demo

Visit: [https://dimensia.aixrlab.space](https://dimensia.aixrlab.space)

## Requirements

- Node.js 14+ 
- Modern web browser with WebGL support
- (Optional) WebXR-compatible VR headset (Meta Quest, etc.)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/RNMUDS/Dimensia.git
cd Dimensia
```

2. Install dependencies:
```bash
npm install
```

3. For HTTPS development (required for WebXR):
```bash
# SSL certificates are already included in ssl/ directory
node server_local.js
```

4. For HTTP development:
```bash
npm start
```

5. Open your browser and navigate to:
   - HTTPS: `https://localhost:3000`
   - HTTP: `http://localhost:3000`

## Controls

### Desktop Controls
- **W/A/S/D** - Move around
- **Shift** - Run (2x speed)
- **Mouse** - Look around

### VR Controls
- **Grip Button** - Show teleport marker (release to teleport)
- **Trigger** - Toggle wave speed
- **Menu Button** - Toggle wave amplitude

## Technical Details

### Architecture
- **Backend**: Express.js server with SSL support
- **Frontend**: Vanilla JavaScript with Three.js r128
- **Rendering**: InstancedMesh for efficient particle rendering
- **VR Framework**: Native WebXR API

### Performance Optimizations
- Dynamic particle count based on platform
- Pre-calculated particle positions
- Fog effect to hide distant particles
- Optimized shader materials

### Key Parameters
```javascript
// PC Mode
count: 500000      // Number of particles
spread: 200        // Particle spread range
particleSize: 0.01 // Particle size

// VR Mode  
count: 5000        // Reduced for performance
spread: 100        // Smaller area
particleSize: 0.01 // Same visual size
```

## Project Structure
```
Dimensia/
├── public/
│   ├── index.html         # Main application
│   ├── moin.js           # Utility module
│   └── particle-wave-component.js
├── ssl/                   # SSL certificates
├── server.js             # HTTP server
├── server_local.js       # HTTPS server
└── package.json
```

## Development

### Running Tests
```bash
npm test  # No tests configured yet
```

### Building for Production
The project runs directly without a build step, using ES6 modules.

### SSL Certificates
Self-signed certificates are included for local HTTPS development. For production, replace with valid certificates.

## Browser Compatibility

- Chrome 79+ (recommended)
- Firefox 85+
- Safari 15+ (no VR support)
- Edge 79+

## VR Headset Compatibility

- Meta Quest 2/3/Pro
- Pico 4
- HTC Vive (via OpenXR)
- Any WebXR-compatible device

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Three.js team for the excellent 3D library
- WebXR community for VR web standards
- All contributors and testers

## Contact

For questions or support, please open an issue on GitHub.

---

Made with ❤️ using Three.js and WebXR