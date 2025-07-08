// warp-main.js
import * as THREE from 'three';
import { ParticleSystem } from './ParticleSystem.js';

// === 基本設定 ===
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x000022, 15, 100);
scene.background = new THREE.Color(0x000011);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 6, 30);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.8;
document.body.appendChild(renderer.domElement);

// === ライティング ===
const ambientLight = new THREE.AmbientLight(0x0a0a20, 0.4);
scene.add(ambientLight);

const moonLight = new THREE.DirectionalLight(0x4060ff, 0.3);
moonLight.position.set(-50, 100, -50);
moonLight.castShadow = true;
scene.add(moonLight);

// === 地面 ===
const floorGeometry = new THREE.PlaneGeometry(200, 200, 50, 50);
const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x101030,
    metalness: 0.1,
    roughness: 0.9,
    emissive: 0x000011,
    emissiveIntensity: 0.2
});

const floorVertices = floorGeometry.attributes.position.array;
for (let i = 0; i < floorVertices.length; i += 3) {
    floorVertices[i + 2] = Math.sin(floorVertices[i] * 0.05) * Math.cos(floorVertices[i + 1] * 0.05) * 2;
}
floorGeometry.computeVertexNormals();

const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// === パーティクルシステムの設定 ===
const particleOptions = window.PARTICLE_OPTIONS || {
    particleCount: 100000,
    color: 0x0080ff,
    maxSize: 0.03,
    minSize: 0.01,
    positionSpread: { x: 120, y: 40, z: 120 },
    velocity: { x: 0, y: 0, z: -2.0 },
    velocitySpread: { x: 0.1, y: 0.1, z: 0.5 },
    maxAge: 15,
    minAge: 10
};

// Vector3に変換
const particleSystemOptions = {
    ...particleOptions,
    positionSpread: new THREE.Vector3(
        particleOptions.positionSpread.x,
        particleOptions.positionSpread.y,
        particleOptions.positionSpread.z
    ),
    velocity: new THREE.Vector3(
        particleOptions.velocity.x,
        particleOptions.velocity.y,
        particleOptions.velocity.z
    ),
    velocitySpread: new THREE.Vector3(
        particleOptions.velocitySpread.x,
        particleOptions.velocitySpread.y,
        particleOptions.velocitySpread.z
    )
};

const particleSystem = new ParticleSystem(scene, particleSystemOptions);

// === スターゲート作成関数 ===
function createStargate(position, color, emissiveColor) {
    const gateGroup = new THREE.Group();
    gateGroup.position.copy(position);
    
    const scale = 0.7;
    
    const outerRingGeo = new THREE.TorusGeometry(6 * scale, 0.4 * scale, 8, 50);
    const ringMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a2e,
        metalness: 0.95,
        roughness: 0.05,
        emissive: 0x0a0a20,
        emissiveIntensity: 0.2
    });
    const outerRing = new THREE.Mesh(outerRingGeo, ringMaterial);
    gateGroup.add(outerRing);
    
    const detailGroup = new THREE.Group();
    for (let i = 0; i < 38; i++) {
        const angle = (i / 38) * Math.PI * 2;
        
        const chevronShape = new THREE.Shape();
        chevronShape.moveTo(0, 0);
        chevronShape.lineTo(-0.15, 0.3);
        chevronShape.lineTo(0, 0.4);
        chevronShape.lineTo(0.15, 0.3);
        chevronShape.closePath();
        
        const extrudeSettings = {
            depth: 0.1,
            bevelEnabled: true,
            bevelSegments: 2,
            bevelSize: 0.02,
            bevelThickness: 0.02
        };
        
        const chevronGeo = new THREE.ExtrudeGeometry(chevronShape, extrudeSettings);
        const chevronMat = new THREE.MeshStandardMaterial({
            color: 0x2d4059,
            metalness: 0.9,
            roughness: 0.1,
            emissive: i % 5 === 0 ? 0x4488ff : 0x112244,
            emissiveIntensity: i % 5 === 0 ? 0.8 : 0.3
        });
        
        const chevron = new THREE.Mesh(chevronGeo, chevronMat);
        chevron.position.x = Math.cos(angle) * 5.5 * scale;
        chevron.position.y = Math.sin(angle) * 5.5 * scale;
        chevron.position.z = -0.05;
        chevron.rotation.z = angle - Math.PI / 2;
        detailGroup.add(chevron);
    }
    gateGroup.add(detailGroup);
    
    return { gateGroup, detailGroup };
}

// === シェーダー ===
const eventHorizonVertexShader = `
    uniform float time;
    uniform float wormholeEffect;
    varying vec2 vUv;
    varying vec3 vPosition;
    varying float vDepth;
    
    void main() {
        vUv = uv;
        vPosition = position;
        
        vec3 pos = position;
        vec2 center = vec2(0.5, 0.5);
        float dist = distance(uv, center);
        
        float ripple1 = sin(dist * 30.0 - time * 3.0) * 0.02;
        float ripple2 = sin(dist * 50.0 - time * 5.0 + 1.0) * 0.01;
        float ripple3 = cos(dist * 70.0 - time * 7.0 + 2.0) * 0.005;
        
        float intensity = smoothstep(0.0, 0.5, dist);
        pos.z += (ripple1 + ripple2 + ripple3) * intensity * (1.0 - dist);
        
        pos.z -= wormholeEffect * (1.0 - dist * 2.0) * 3.0;
        vDepth = pos.z;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;

const eventHorizonFragmentShader = `
    uniform float time;
    uniform float wormholeEffect;
    uniform vec3 portalColor;
    varying vec2 vUv;
    varying vec3 vPosition;
    varying float vDepth;
    
    void main() {
        vec2 center = vec2(0.5, 0.5);
        float dist = distance(vUv, center);
        
        float angle = atan(vUv.y - 0.5, vUv.x - 0.5);
        float radialWave = sin(dist * 40.0 - time * 4.0) * 0.5 + 0.5;
        float spiralWave = sin(angle * 8.0 + dist * 20.0 - time * 3.0) * 0.5 + 0.5;
        
        vec3 color = vec3(0.0);
        
        float centerGlow = exp(-dist * 4.0) * 1.0;
        color += portalColor * 1.5 * centerGlow;
        
        float wavePattern = radialWave * spiralWave;
        vec3 waveColor = mix(
            portalColor * 0.3,
            portalColor * 0.8,
            wavePattern
        );
        color += waveColor * (1.0 - dist * 0.7) * 0.5;
        
        float edgeGlow = pow(1.0 - smoothstep(0.4, 0.5, dist), 3.0);
        color += portalColor * edgeGlow * 0.8;
        
        color *= 1.0 - vDepth * wormholeEffect * 0.3;
        
        float alpha = 1.0;
        alpha *= smoothstep(0.5, 0.48, dist);
        
        color = pow(color, vec3(0.8));
        
        gl_FragColor = vec4(color, alpha);
    }
`;

// === ポータルの作成 ===
const portals = [];
const portalColor = 0x0080ff;
const portalConfigs = [
    { position: new THREE.Vector3(-20, 8, -10), color: portalColor, name: "Portal 1" },
    { position: new THREE.Vector3(-20, 8, -25), color: portalColor, name: "Portal 2" },
    { position: new THREE.Vector3(-20, 8, -40), color: portalColor, name: "Portal 3" },
    { position: new THREE.Vector3(-20, 8, -55), color: portalColor, name: "Portal 4" },
    { position: new THREE.Vector3(20, 8, -10), color: portalColor, name: "Portal 5" },
    { position: new THREE.Vector3(20, 8, -25), color: portalColor, name: "Portal 6" },
    { position: new THREE.Vector3(20, 8, -40), color: portalColor, name: "Portal 7" },
    { position: new THREE.Vector3(20, 8, -55), color: portalColor, name: "Portal 8" }
];

portalConfigs.forEach((config, index) => {
    const { gateGroup, detailGroup } = createStargate(config.position, 0x1a1a2e, config.color);
    
    if (index < 4) {
        gateGroup.rotation.y = Math.PI / 2;
    } else {
        gateGroup.rotation.y = -Math.PI / 2;
    }
    
    scene.add(gateGroup);
    
    const scale = 0.7;
    const eventHorizonGeo = new THREE.CircleGeometry(5 * scale, 64);
    const eventHorizonMat = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            wormholeEffect: { value: 1 },
            portalColor: { value: new THREE.Color(config.color) }
        },
        vertexShader: eventHorizonVertexShader,
        fragmentShader: eventHorizonFragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    
    const eventHorizon = new THREE.Mesh(eventHorizonGeo, eventHorizonMat);
    eventHorizon.position.copy(config.position);
    
    if (index < 4) {
        eventHorizon.rotation.y = Math.PI / 2;
    } else {
        eventHorizon.rotation.y = -Math.PI / 2;
    }
    
    scene.add(eventHorizon);
    
    const glowGeo = new THREE.RingGeometry(4.5 * scale, 5.5 * scale, 64);
    const glowMat = new THREE.MeshBasicMaterial({
        color: config.color,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide
    });
    const glowRing = new THREE.Mesh(glowGeo, glowMat);
    glowRing.position.copy(config.position);
    
    if (index < 4) {
        glowRing.rotation.y = Math.PI / 2;
    } else {
        glowRing.rotation.y = -Math.PI / 2;
    }
    
    scene.add(glowRing);
    
    const baseGeometry = new THREE.CylinderGeometry(5, 6, 1, 16);
    const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a3a,
        metalness: 0.3,
        roughness: 0.7,
        emissive: config.color,
        emissiveIntensity: 0.05
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.set(config.position.x, 0.5, config.position.z);
    base.castShadow = true;
    base.receiveShadow = true;
    scene.add(base);
    
    portals.push({
        gateGroup,
        detailGroup,
        eventHorizon,
        eventHorizonMat,
        glowRing,
        base,
        config
    });
});

// === 入力制御 ===
const moveSpeed = 0.3;
const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    shift: false
};

let mouseX = 0;
let mouseY = 0;

document.addEventListener('mousemove', (event) => {
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
});

document.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (keys.hasOwnProperty(key)) {
        keys[key] = true;
    }
});

document.addEventListener('keyup', (event) => {
    const key = event.key.toLowerCase();
    if (keys.hasOwnProperty(key)) {
        keys[key] = false;
    }
});

let cameraRotationY = 0;
let cameraRotationX = 0;

// === アニメーションループ ===
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    
    const deltaTime = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();
    
    particleSystem.update(deltaTime);
    
    portals.forEach((portal, index) => {
        portal.eventHorizonMat.uniforms.time.value = elapsedTime;
        
        portal.gateGroup.rotation.z = elapsedTime * 0.05 + index * 0.5;
        portal.detailGroup.rotation.z = -elapsedTime * 0.1 - index * 0.3;
        
        portal.glowRing.material.opacity = 0.15 + Math.sin(elapsedTime * 3 + index) * 0.05;
        portal.glowRing.scale.set(
            1 + Math.sin(elapsedTime * 2 + index) * 0.01,
            1 + Math.sin(elapsedTime * 2 + index) * 0.01,
            1
        );
        
        portal.base.material.emissiveIntensity = 0.05 + Math.sin(elapsedTime * 2 + index) * 0.02;
    });
    
    const speed = keys.shift ? moveSpeed * 2 : moveSpeed;
    const moveDistance = speed * deltaTime * 60;
    
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    
    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0));
    
    if (keys.w) {
        camera.position.addScaledVector(forward, moveDistance);
    }
    if (keys.s) {
        camera.position.addScaledVector(forward, -moveDistance);
    }
    if (keys.a) {
        camera.position.addScaledVector(right, -moveDistance);
    }
    if (keys.d) {
        camera.position.addScaledVector(right, moveDistance);
    }
    
    camera.position.y = Math.max(2, Math.min(20, camera.position.y));
    
    const targetRotationY = -mouseX * Math.PI;
    const targetRotationX = mouseY * Math.PI * 0.5;
    
    cameraRotationY += (targetRotationY - cameraRotationY) * 0.05;
    cameraRotationX += (targetRotationX - cameraRotationX) * 0.05;
    
    cameraRotationX = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, cameraRotationX));
    
    camera.rotation.order = 'YXZ';
    camera.rotation.y = cameraRotationY;
    camera.rotation.x = cameraRotationX;
    
    renderer.render(scene, camera);
}

animate();

// === リサイズ対応 ===
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});