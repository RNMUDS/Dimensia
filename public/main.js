// main.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ParticleSystem } from './ParticleSystem.js';

// === 基本設定 ===
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 20;

// === ライティング ===
// 環境光（全体的な明るさ）
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

// ポイントライト（メイン光源）
const pointLight = new THREE.PointLight(0xffffff, 1);
pointLight.position.set(50, 50, 50);
scene.add(pointLight);

// ディレクショナルライト（手に陰影をつけるため）
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 10);
directionalLight.lookAt(0, 0, 0);
directionalLight.castShadow = true;
directionalLight.shadow.camera.near = 0.1;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -5;
directionalLight.shadow.camera.right = 5;
directionalLight.shadow.camera.top = 5;
directionalLight.shadow.camera.bottom = -5;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// 補助的なディレクショナルライト（反対側から）
const directionalLight2 = new THREE.DirectionalLight(0x87cefa, 0.3);
directionalLight2.position.set(-10, 10, -10);
directionalLight2.lookAt(0, 0, 0);
scene.add(directionalLight2);

// 半球ライト（より自然な陰影を作る）
const hemisphereLight = new THREE.HemisphereLight(0x87cefa, 0x444444, 0.5);
hemisphereLight.position.set(0, 20, 0);
scene.add(hemisphereLight);

// === WASD移動用の設定 ===
const moveSpeed = 0.5;
const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    shift: false
};

// キーボードイベント
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

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.xr.enabled = true; // WebXRを有効化
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();

// === パーティクルシステムの呼び出し ===
// HTMLから定義された定数を使用、またはデフォルト値を使用
const htmlOptions = window.PARTICLE_OPTIONS || {};
const defaultOptions = {
    particleCount: 10000000,
    color: 0x87cefa, // ライトスカイブルー
    maxSize: 0.05,
    positionSpread: { x: 100, y: 100, z: 100 },
    velocity: { x: 0, y: -0.5, z: 0 }, // 少し下向きに
    maxAge: 8
};

// HTMLの設定とデフォルト値をマージ
const mergedOptions = { ...defaultOptions, ...htmlOptions };

// Vector3オブジェクトに変換
const particleOptions = {
    ...mergedOptions,
    positionSpread: new THREE.Vector3(
        mergedOptions.positionSpread.x,
        mergedOptions.positionSpread.y,
        mergedOptions.positionSpread.z
    ),
    velocity: new THREE.Vector3(
        mergedOptions.velocity.x,
        mergedOptions.velocity.y,
        mergedOptions.velocity.z
    )
};

// シーンとオプションを渡してインスタンスを作成
let particleSystem = new ParticleSystem(scene, particleOptions);

// === VR用のカメラグループ（プレイヤーの位置を管理） ===
const cameraGroup = new THREE.Group();
cameraGroup.add(camera);
cameraGroup.position.y = 1.6; // 立った状態の高さ
scene.add(cameraGroup);

// === VRサポートチェックとボタン設定 ===
const vrButton = document.getElementById('vrButton');
const pcControls = document.getElementById('pcControls');
const vrControls = document.getElementById('vrControls');
let isVRMode = false;

if ('xr' in navigator) {
    navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
        if (supported) {
            vrButton.addEventListener('click', async () => {
                const sessionInit = {
                    optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking']
                };
                
                try {
                    const session = await navigator.xr.requestSession('immersive-vr', sessionInit);
                    renderer.xr.setSession(session);
                    
                    vrButton.textContent = 'Exit VR';
                    pcControls.style.display = 'none';
                    vrControls.style.display = 'block';
                    
                    // VRモードに入ったらVR用パラメータに切り替え
                    switchToVRParams();
                    
                    session.addEventListener('end', () => {
                        vrButton.textContent = 'Enter VR';
                        pcControls.style.display = 'block';
                        vrControls.style.display = 'none';
                        // VRモードを終了したらPC用パラメータに戻す
                        switchToPCParams();
                    });
                } catch (e) {
                    console.error('VRセッションの開始に失敗:', e);
                }
            });
        } else {
            vrButton.disabled = true;
            vrButton.textContent = 'VR Not Supported';
        }
    });
} else {
    vrButton.disabled = true;
    vrButton.textContent = 'VR Not Supported';
}

// VR用パラメータに切り替える関数
function switchToVRParams() {
    isVRMode = true;
    const vrOptions = window.VR_PARTICLE_OPTIONS || window.PARTICLE_OPTIONS;
    const options = {
        ...vrOptions,
        positionSpread: new THREE.Vector3(
            vrOptions.positionSpread.x,
            vrOptions.positionSpread.y,
            vrOptions.positionSpread.z
        ),
        velocity: new THREE.Vector3(
            vrOptions.velocity.x,
            vrOptions.velocity.y,
            vrOptions.velocity.z
        )
    };
    
    // 既存のパーティクルシステムを破棄して新しいものを作成
    if (particleSystem && particleSystem.dispose) {
        particleSystem.dispose();
    }
    particleSystem = new ParticleSystem(scene, options);
}

// PC用パラメータに戻す関数
function switchToPCParams() {
    isVRMode = false;
    // 既存のパーティクルシステムを破棄して新しいものを作成
    if (particleSystem && particleSystem.dispose) {
        particleSystem.dispose();
    }
    particleSystem = new ParticleSystem(scene, particleOptions);
}

// === VRコントローラーのセットアップ ===
// コントローラー1（右手）
const controller1 = renderer.xr.getController(0);
cameraGroup.add(controller1);

// コントローラー2（左手）
const controller2 = renderer.xr.getController(1);
cameraGroup.add(controller2);

// ハンドトラッキング用のハンドオブジェクト
const hand1 = renderer.xr.getHand(0);
const hand2 = renderer.xr.getHand(1);
cameraGroup.add(hand1);
cameraGroup.add(hand2);

// GLBハンドモデルのロード
const gltfLoader = new GLTFLoader();
let rightHandModel = null;
let leftHandModel = null;
let rightHandBones = {};
let leftHandBones = {};
let useGLBModels = true; // GLBモデルを使用するかどうかのフラグ

// WebXRの関節名とGLBモデルのボーン名のマッピング
const jointToBoneMap = {
    'wrist': ['Wrist', 'wrist', 'mixamorigRightHand', 'mixamorigLeftHand', 'Hand'],
    'thumb-metacarpal': ['Thumb0', 'thumb_01', 'mixamorigRightHandThumb1', 'mixamorigLeftHandThumb1', 'Thumb_0'],
    'thumb-phalanx-proximal': ['Thumb1', 'thumb_02', 'mixamorigRightHandThumb2', 'mixamorigLeftHandThumb2', 'Thumb_1'],
    'thumb-phalanx-distal': ['Thumb2', 'thumb_03', 'mixamorigRightHandThumb3', 'mixamorigLeftHandThumb3', 'Thumb_2'],
    'thumb-tip': ['Thumb3', 'thumb_04', 'mixamorigRightHandThumb4', 'mixamorigLeftHandThumb4', 'Thumb_3'],
    'index-finger-metacarpal': ['Index0', 'index_01', 'mixamorigRightHandIndex1', 'mixamorigLeftHandIndex1', 'Index_0'],
    'index-finger-phalanx-proximal': ['Index1', 'index_02', 'mixamorigRightHandIndex2', 'mixamorigLeftHandIndex2', 'Index_1'],
    'index-finger-phalanx-intermediate': ['Index2', 'index_03', 'mixamorigRightHandIndex3', 'mixamorigLeftHandIndex3', 'Index_2'],
    'index-finger-phalanx-distal': ['Index3', 'index_04', 'mixamorigRightHandIndex4', 'mixamorigLeftHandIndex4', 'Index_3'],
    'index-finger-tip': ['Index4', 'index_05', 'mixamorigRightHandIndex5', 'mixamorigLeftHandIndex5', 'Index_4'],
    'middle-finger-metacarpal': ['Middle0', 'middle_01', 'mixamorigRightHandMiddle1', 'mixamorigLeftHandMiddle1', 'Middle_0'],
    'middle-finger-phalanx-proximal': ['Middle1', 'middle_02', 'mixamorigRightHandMiddle2', 'mixamorigLeftHandMiddle2', 'Middle_1'],
    'middle-finger-phalanx-intermediate': ['Middle2', 'middle_03', 'mixamorigRightHandMiddle3', 'mixamorigLeftHandMiddle3', 'Middle_2'],
    'middle-finger-phalanx-distal': ['Middle3', 'middle_04', 'mixamorigRightHandMiddle4', 'mixamorigLeftHandMiddle4', 'Middle_3'],
    'middle-finger-tip': ['Middle4', 'middle_05', 'mixamorigRightHandMiddle5', 'mixamorigLeftHandMiddle5', 'Middle_4'],
    'ring-finger-metacarpal': ['Ring0', 'ring_01', 'mixamorigRightHandRing1', 'mixamorigLeftHandRing1', 'Ring_0'],
    'ring-finger-phalanx-proximal': ['Ring1', 'ring_02', 'mixamorigRightHandRing2', 'mixamorigLeftHandRing2', 'Ring_1'],
    'ring-finger-phalanx-intermediate': ['Ring2', 'ring_03', 'mixamorigRightHandRing3', 'mixamorigLeftHandRing3', 'Ring_2'],
    'ring-finger-phalanx-distal': ['Ring3', 'ring_04', 'mixamorigRightHandRing4', 'mixamorigLeftHandRing4', 'Ring_3'],
    'ring-finger-tip': ['Ring4', 'ring_05', 'mixamorigRightHandRing5', 'mixamorigLeftHandRing5', 'Ring_4'],
    'pinky-finger-metacarpal': ['Pinky0', 'pinky_01', 'mixamorigRightHandPinky1', 'mixamorigLeftHandPinky1', 'Little_0'],
    'pinky-finger-phalanx-proximal': ['Pinky1', 'pinky_02', 'mixamorigRightHandPinky2', 'mixamorigLeftHandPinky2', 'Little_1'],
    'pinky-finger-phalanx-intermediate': ['Pinky2', 'pinky_03', 'mixamorigRightHandPinky3', 'mixamorigLeftHandPinky3', 'Little_2'],
    'pinky-finger-phalanx-distal': ['Pinky3', 'pinky_04', 'mixamorigRightHandPinky4', 'mixamorigLeftHandPinky4', 'Little_3'],
    'pinky-finger-tip': ['Pinky4', 'pinky_05', 'mixamorigRightHandPinky5', 'mixamorigLeftHandPinky5', 'Little_4']
};

// GLBモデルからボーンを抽出
function extractBones(model, isRight) {
    const bones = {};
    const allBones = [];
    
    // 全てのボーンを収集
    model.traverse((child) => {
        if (child.isBone) {
            allBones.push(child);
            console.log('Found bone:', child.name);
        }
    });
    
    // ボーン名をWebXRの関節名にマッピング
    for (const [jointName, boneNames] of Object.entries(jointToBoneMap)) {
        for (const boneName of boneNames) {
            const bone = allBones.find(b => 
                b.name.toLowerCase().includes(boneName.toLowerCase()) ||
                boneName.toLowerCase().includes(b.name.toLowerCase())
            );
            if (bone) {
                bones[jointName] = bone;
                console.log(`Mapped ${jointName} to bone ${bone.name}`);
                break;
            }
        }
    }
    
    // ボーンが見つからない場合は、モデル全体を移動
    if (Object.keys(bones).length === 0) {
        console.log('No bones found, will move entire model');
    }
    
    return bones;
}

// 右手のGLBモデルをロード
gltfLoader.load('right.glb', (gltf) => {
    rightHandModel = gltf.scene;
    rightHandModel.visible = false;
    
    // ボーンを抽出
    rightHandBones = extractBones(rightHandModel, true);
    
    rightHandModel.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            // スキニングがある場合は更新を有効化
            if (child.isSkinnedMesh) {
                child.frustumCulled = false;
            }
            // マテリアルの調整
            if (child.material) {
                child.material.side = THREE.DoubleSide;
            }
        }
    });
    scene.add(rightHandModel);
    console.log('Right hand GLB model loaded with bones:', Object.keys(rightHandBones).length);
}, (progress) => {
    console.log('Loading right hand:', (progress.loaded / progress.total * 100) + '%');
}, (error) => {
    console.error('Error loading right hand model:', error);
});

// 左手のGLBモデルをロード
gltfLoader.load('left.glb', (gltf) => {
    leftHandModel = gltf.scene;
    leftHandModel.visible = false;
    
    // ボーンを抽出
    leftHandBones = extractBones(leftHandModel, false);
    
    leftHandModel.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            // スキニングがある場合は更新を有効化
            if (child.isSkinnedMesh) {
                child.frustumCulled = false;
            }
            // マテリアルの調整
            if (child.material) {
                child.material.side = THREE.DoubleSide;
            }
        }
    });
    scene.add(leftHandModel);
    console.log('Left hand GLB model loaded with bones:', Object.keys(leftHandBones).length);
}, (progress) => {
    console.log('Loading left hand:', (progress.loaded / progress.total * 100) + '%');
}, (error) => {
    console.error('Error loading left hand model:', error);
});

// === リアルな手のマテリアル設定 ===
// 肌のマテリアル（サブサーフェススキャッタリング風）
const skinMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffdbac,
    roughness: 0.7,
    metalness: 0.0,
    clearcoat: 0.1,
    clearcoatRoughness: 0.8,
    sheen: 0.3,
    sheenColor: 0xffaaaa,
    emissive: 0xff6644,
    emissiveIntensity: 0.02,
    transmission: 0.05,
    thickness: 0.5
});

// 爪のマテリアル
const nailMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffeeee,
    roughness: 0.3,
    metalness: 0.0,
    clearcoat: 0.5,
    clearcoatRoughness: 0.1,
    opacity: 0.9,
    transparent: true
});

// 各関節用のメッシュとボーンラインを作成
const jointMeshes1 = {};
const jointMeshes2 = {};
const boneLines1 = [];
const boneLines2 = [];
const handData1 = { joints: jointMeshes1, bones: boneLines1, handBack: null };
const handData2 = { joints: jointMeshes2, bones: boneLines2, handBack: null };

// 関節の球体を作成（関節ごとに異なる形状）
function createJointSphere(radius = 0.008, type = 'normal') {
    let geometry;
    if (type === 'knuckle') {
        // ナックル（指の付け根）はより大きく、やや扁平
        geometry = new THREE.SphereGeometry(radius * 1.2, 16, 12);
        geometry.scale(1, 0.8, 1.1);
    } else if (type === 'tip') {
        // 指先は小さく、やや細長い
        geometry = new THREE.SphereGeometry(radius * 0.8, 16, 12);
        geometry.scale(0.9, 0.9, 1.1);
    } else {
        geometry = new THREE.SphereGeometry(radius, 16, 12);
    }
    const mesh = new THREE.Mesh(geometry, skinMaterial);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

// 爪を作成（より現実的な形状）
function createNail() {
    // 爪の形状を作成（実際の爪の形状に近づける）
    const shape = new THREE.Shape();
    // 爪の輪郭を描く（底辺が曲線、上部が半円形）
    shape.moveTo(-0.0035, -0.002);
    shape.quadraticCurveTo(-0.0035, -0.003, -0.003, -0.003);
    shape.quadraticCurveTo(0, -0.0035, 0.003, -0.003);
    shape.quadraticCurveTo(0.0035, -0.003, 0.0035, -0.002);
    shape.quadraticCurveTo(0.0035, 0.002, 0.003, 0.004);
    shape.quadraticCurveTo(0.0015, 0.005, 0, 0.0055);
    shape.quadraticCurveTo(-0.0015, 0.005, -0.003, 0.004);
    shape.quadraticCurveTo(-0.0035, 0.002, -0.0035, -0.002);
    
    const extrudeSettings = {
        depth: 0.0008,
        bevelEnabled: true,
        bevelSegments: 2,
        bevelSize: 0.0003,
        bevelThickness: 0.0002,
        curveSegments: 12
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, 0.002, -0.006);
    
    const mesh = new THREE.Mesh(geometry, nailMaterial);
    mesh.castShadow = true;
    return mesh;
}

// 手の甲のメッシュを作成
function createHandBack() {
    // より複雑で現実的な手の甲の形状
    const shape = new THREE.Shape();
    
    // 手首側（底辺）
    shape.moveTo(-0.035, -0.01);
    
    // 小指側の輪郭
    shape.bezierCurveTo(-0.038, 0.01, -0.04, 0.03, -0.038, 0.05);
    shape.bezierCurveTo(-0.036, 0.065, -0.032, 0.075, -0.025, 0.08);
    
    // 小指の付け根付近
    shape.bezierCurveTo(-0.022, 0.082, -0.02, 0.083, -0.018, 0.082);
    
    // 薬指との谷間
    shape.lineTo(-0.015, 0.078);
    shape.bezierCurveTo(-0.013, 0.082, -0.01, 0.083, -0.008, 0.082);
    
    // 中指との谷間
    shape.lineTo(-0.005, 0.078);
    shape.bezierCurveTo(-0.002, 0.082, 0.002, 0.082, 0.005, 0.078);
    
    // 人差し指との谷間
    shape.lineTo(0.008, 0.082);
    shape.bezierCurveTo(0.01, 0.083, 0.013, 0.082, 0.015, 0.078);
    
    // 人差し指の付け根
    shape.lineTo(0.018, 0.082);
    shape.bezierCurveTo(0.02, 0.083, 0.022, 0.082, 0.025, 0.08);
    
    // 親指側の輪郭
    shape.bezierCurveTo(0.032, 0.075, 0.036, 0.065, 0.038, 0.05);
    shape.bezierCurveTo(0.04, 0.03, 0.038, 0.01, 0.035, -0.01);
    
    // 手首に戻る
    shape.bezierCurveTo(0.025, -0.012, 0.01, -0.013, 0, -0.013);
    shape.bezierCurveTo(-0.01, -0.013, -0.025, -0.012, -0.035, -0.01);
    
    const extrudeSettings = {
        depth: 0.008,
        bevelEnabled: true,
        bevelSegments: 4,
        bevelSize: 0.0015,
        bevelThickness: 0.0015,
        curveSegments: 16
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, 0.002, -0.004);
    
    const mesh = new THREE.Mesh(geometry, skinMaterial);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

// 指の接続関係を定義
const fingerConnections = [
    // 親指
    ['wrist', 'thumb-metacarpal'],
    ['thumb-metacarpal', 'thumb-phalanx-proximal'],
    ['thumb-phalanx-proximal', 'thumb-phalanx-distal'],
    ['thumb-phalanx-distal', 'thumb-tip'],
    // 人差し指
    ['wrist', 'index-finger-metacarpal'],
    ['index-finger-metacarpal', 'index-finger-phalanx-proximal'],
    ['index-finger-phalanx-proximal', 'index-finger-phalanx-intermediate'],
    ['index-finger-phalanx-intermediate', 'index-finger-phalanx-distal'],
    ['index-finger-phalanx-distal', 'index-finger-tip'],
    // 中指
    ['wrist', 'middle-finger-metacarpal'],
    ['middle-finger-metacarpal', 'middle-finger-phalanx-proximal'],
    ['middle-finger-phalanx-proximal', 'middle-finger-phalanx-intermediate'],
    ['middle-finger-phalanx-intermediate', 'middle-finger-phalanx-distal'],
    ['middle-finger-phalanx-distal', 'middle-finger-tip'],
    // 薬指
    ['wrist', 'ring-finger-metacarpal'],
    ['ring-finger-metacarpal', 'ring-finger-phalanx-proximal'],
    ['ring-finger-phalanx-proximal', 'ring-finger-phalanx-intermediate'],
    ['ring-finger-phalanx-intermediate', 'ring-finger-phalanx-distal'],
    ['ring-finger-phalanx-distal', 'ring-finger-tip'],
    // 小指
    ['wrist', 'pinky-finger-metacarpal'],
    ['pinky-finger-metacarpal', 'pinky-finger-phalanx-proximal'],
    ['pinky-finger-phalanx-proximal', 'pinky-finger-phalanx-intermediate'],
    ['pinky-finger-phalanx-intermediate', 'pinky-finger-phalanx-distal'],
    ['pinky-finger-phalanx-distal', 'pinky-finger-tip']
];

// ハンドトラッキングでのピンチ状態を追跡
let hand1Pinching = false;
let hand2Pinching = false;

// ピンチ検出関数
function isPinching(hand) {
    if (!hand.joints || !hand.joints['thumb-tip'] || !hand.joints['index-finger-tip']) {
        return false;
    }
    
    const thumbTip = new THREE.Vector3();
    const indexTip = new THREE.Vector3();
    
    hand.joints['thumb-tip'].getWorldPosition(thumbTip);
    hand.joints['index-finger-tip'].getWorldPosition(indexTip);
    
    const distance = thumbTip.distanceTo(indexTip);
    return distance < 0.02; // 2cm以下でピンチと判定
}

// ハンドメッシュを初期化
function initializeHandMeshes(hand, handData) {
    // 手の甲を作成
    if (!handData.handBack) {
        handData.handBack = createHandBack();
        handData.handBack.visible = false;
        scene.add(handData.handBack);
    }
}

// 初回の手のメッシュを初期化
initializeHandMeshes(hand1, handData1);
initializeHandMeshes(hand2, handData2);

// ハンドトラッキングの更新関数
function updateHandTracking(hand, jointMeshes, boneLines, handData, handModel, isRightHand) {
    if (renderer.xr.isPresenting && hand.joints) {
        // GLBモデルが利用可能かつ有効な場合
        if (useGLBModels && handModel) {
            const wristJoint = hand.joints['wrist'];
            if (wristJoint) {
                const position = new THREE.Vector3();
                const quaternion = new THREE.Quaternion();
                const scale = new THREE.Vector3();
                
                wristJoint.matrixWorld.decompose(position, quaternion, scale);
                
                // GLBモデルを手首の位置に配置
                handModel.position.copy(position);
                handModel.quaternion.copy(quaternion);
                handModel.scale.setScalar(1);
                handModel.visible = true;
                
                // ボーンがある場合は更新を試みる
                const handBones = isRightHand ? rightHandBones : leftHandBones;
                if (Object.keys(handBones).length > 0) {
                    // 全ての関節の位置を更新
                    for (const [jointName, bone] of Object.entries(handBones)) {
                        const joint = hand.joints[jointName];
                        if (joint && bone && joint !== wristJoint) {
                            const jointPos = new THREE.Vector3();
                            const jointQuat = new THREE.Quaternion();
                            
                            joint.matrixWorld.decompose(jointPos, jointQuat, new THREE.Vector3());
                            
                            // 手首からの相対位置を計算
                            const relativePos = jointPos.clone().sub(position);
                            relativePos.applyQuaternion(quaternion.clone().invert());
                            
                            // ボーンのローカル位置を設定
                            bone.position.copy(relativePos);
                            
                            // 相対回転を計算
                            const relativeQuat = jointQuat.clone().premultiply(quaternion.clone().invert());
                            bone.quaternion.copy(relativeQuat);
                        }
                    }
                }
            }
            
            // GLBモデルを使用する場合は、デフォルトのメッシュを非表示に
            for (const jointName in jointMeshes) {
                if (jointMeshes[jointName]) {
                    jointMeshes[jointName].visible = false;
                }
            }
            boneLines.forEach(cylinder => {
                if (cylinder) cylinder.visible = false;
            });
            if (handData && handData.handBack) {
                handData.handBack.visible = false;
            }
            return; // GLBモデルを使用する場合はここで終了
        }
        // 手の甲の位置を更新
        if (handData && handData.handBack && hand.joints['wrist']) {
            const wristPos = new THREE.Vector3();
            const wristQuat = new THREE.Quaternion();
            const wristScale = new THREE.Vector3();
            
            hand.joints['wrist'].getWorldPosition(wristPos);
            hand.joints['wrist'].getWorldQuaternion(wristQuat);
            hand.joints['wrist'].getWorldScale(wristScale);
            
            // 手の甲を手首の位置に配置
            handData.handBack.position.copy(wristPos);
            handData.handBack.quaternion.copy(wristQuat);
            
            // 手の向きに基づいて位置を調整（手の甲を正しく配置）
            const offset = new THREE.Vector3(0, 0.005, -0.03);
            offset.applyQuaternion(wristQuat);
            handData.handBack.position.add(offset);
            
            // 手の甲のスケールを動的に調整（手のサイズに合わせる）
            const thumbDist = hand.joints['thumb-metacarpal'] ? 
                new THREE.Vector3().setFromMatrixPosition(hand.joints['thumb-metacarpal'].matrixWorld).distanceTo(wristPos) : 0.08;
            const scale = thumbDist / 0.08; // 基準サイズに対する比率
            handData.handBack.scale.setScalar(scale);
            
            handData.handBack.visible = true;
        }
        // 各関節の位置を更新
        for (const jointName in hand.joints) {
            const joint = hand.joints[jointName];
            
            // 関節のメッシュがなければ作成
            if (!jointMeshes[jointName]) {
                let radius, type = 'normal';
                if (jointName === 'wrist') {
                    radius = 0.02;
                } else if (jointName.includes('metacarpal')) {
                    radius = 0.012;
                    type = 'knuckle';
                } else if (jointName.includes('tip')) {
                    radius = 0.006;
                    type = 'tip';
                } else if (jointName.includes('proximal')) {
                    radius = 0.009;
                } else if (jointName.includes('intermediate')) {
                    radius = 0.008;
                } else if (jointName.includes('distal')) {
                    radius = 0.007;
                } else {
                    radius = 0.008;
                }
                
                const mesh = createJointSphere(radius, type);
                scene.add(mesh);
                jointMeshes[jointName] = mesh;
                
                // 指先に爪を追加
                if (jointName.includes('tip')) {
                    const nail = createNail();
                    scene.add(nail);
                    jointMeshes[jointName + '-nail'] = nail;
                }
            }
            
            // 関節の位置と回転を更新
            const worldPosition = new THREE.Vector3();
            const worldQuaternion = new THREE.Quaternion();
            const worldScale = new THREE.Vector3();
            
            joint.getWorldPosition(worldPosition);
            joint.getWorldQuaternion(worldQuaternion);
            joint.getWorldScale(worldScale);
            
            jointMeshes[jointName].position.copy(worldPosition);
            jointMeshes[jointName].quaternion.copy(worldQuaternion);
            jointMeshes[jointName].scale.copy(worldScale);
            jointMeshes[jointName].visible = true;
            
            // 爪の位置と向きを調整
            if (jointMeshes[jointName + '-nail']) {
                const nail = jointMeshes[jointName + '-nail'];
                const tipName = jointName;
                const fingerName = tipName.split('-')[0];
                
                // 指の方向を計算（指先の一つ前の関節から指先への方向）
                let prevJointName = '';
                if (tipName === 'thumb-tip') {
                    prevJointName = 'thumb-phalanx-distal';
                } else {
                    prevJointName = tipName.replace('-tip', '-phalanx-distal');
                }
                
                if (hand.joints[prevJointName]) {
                    const prevPos = new THREE.Vector3();
                    const tipPos = new THREE.Vector3();
                    hand.joints[prevJointName].getWorldPosition(prevPos);
                    joint.getWorldPosition(tipPos);
                    
                    // 指の方向ベクトル
                    const fingerDirection = new THREE.Vector3().subVectors(tipPos, prevPos).normalize();
                    
                    // 爪を指先から少し前方に配置
                    nail.position.copy(worldPosition);
                    nail.position.addScaledVector(fingerDirection, 0.006);
                    
                    // 爪を指の方向に向ける
                    const lookAtPoint = new THREE.Vector3().addVectors(nail.position, fingerDirection);
                    nail.lookAt(lookAtPoint);
                    nail.rotateX(-Math.PI / 2);
                    nail.rotateZ(Math.PI);
                    
                    // 指の太さに応じて爪のサイズを調整
                    const nailScale = fingerName === 'thumb' ? 1.2 : 1.0;
                    nail.scale.setScalar(nailScale);
                    nail.visible = true;
                }
            }
        }
        
        // ボーンラインを更新
        fingerConnections.forEach((connection, index) => {
            const [joint1Name, joint2Name] = connection;
            
            if (hand.joints[joint1Name] && hand.joints[joint2Name]) {
                // シリンダーがなければ作成
                if (!boneLines[index]) {
                    const cylinderGeometry = new THREE.CylinderGeometry(0.005, 0.007, 1, 12);
                    const cylinder = new THREE.Mesh(cylinderGeometry, skinMaterial);
                    cylinder.castShadow = true;
                    cylinder.receiveShadow = true;
                    scene.add(cylinder);
                    boneLines[index] = cylinder;
                }
                
                // シリンダーの位置と回転を更新
                const pos1 = new THREE.Vector3();
                const pos2 = new THREE.Vector3();
                hand.joints[joint1Name].getWorldPosition(pos1);
                hand.joints[joint2Name].getWorldPosition(pos2);
                
                // 中点を計算
                const midpoint = new THREE.Vector3();
                midpoint.addVectors(pos1, pos2).multiplyScalar(0.5);
                
                // 距離を計算
                const distance = pos1.distanceTo(pos2);
                
                // シリンダーの位置を中点に設定
                boneLines[index].position.copy(midpoint);
                
                // シリンダーの長さを調整（関節間の隙間を考慮）
                boneLines[index].scale.y = distance * 0.9;
                
                // シリンダーを2点間の方向に回転
                const direction = new THREE.Vector3();
                direction.subVectors(pos2, pos1).normalize();
                const quaternion = new THREE.Quaternion();
                quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
                boneLines[index].quaternion.copy(quaternion);
                
                boneLines[index].visible = true;
                boneLines[index].frustumCulled = false;
            }
        });
    } else {
        // VRモードでない場合は非表示
        for (const jointName in jointMeshes) {
            if (jointMeshes[jointName]) {
                jointMeshes[jointName].visible = false;
            }
        }
        boneLines.forEach(cylinder => {
            if (cylinder) cylinder.visible = false;
        });
        if (handData && handData.handBack) {
            handData.handBack.visible = false;
        }
        // GLBモデルも非表示に
        if (handModel) {
            handModel.visible = false;
        }
    }
}

// ハンドトラッキングでのテレポート更新
function updateHandTeleport(hand, pinching) {
    if (pinching && renderer.xr.isPresenting && hand.joints && hand.joints['index-finger-metacarpal']) {
        // 人差し指の付け根から前方にレイを飛ばす
        const origin = new THREE.Vector3();
        const direction = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        
        hand.joints['index-finger-metacarpal'].getWorldPosition(origin);
        hand.joints['index-finger-metacarpal'].getWorldQuaternion(quaternion);
        
        // 手のひらの向きに基づいて前方向を計算
        direction.set(0, 0, -1).applyQuaternion(quaternion);
        
        // レイキャスターを設定
        raycaster.set(origin, direction);
        
        const intersects = raycaster.intersectObject(teleportFloor);
        if (intersects.length > 0) {
            teleportMarker.position.copy(intersects[0].point);
            teleportMarker.position.y = 0.01;
            teleportMarker.visible = true;
        } else {
            teleportMarker.visible = false;
        }
    }
}

// テレポート機能の設定
const teleportGeometry = new THREE.RingGeometry(0.5, 0.8, 32);
const teleportMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.5
});
const teleportMarker = new THREE.Mesh(teleportGeometry, teleportMaterial);
teleportMarker.rotation.x = -Math.PI / 2;
teleportMarker.visible = false;
scene.add(teleportMarker);

// テレポート用のレイキャスター
const raycaster = new THREE.Raycaster();
const tempMatrix = new THREE.Matrix4();

// ハンド用スポットライト（GLBモデルをより良く見せるため）
const handSpotLight = new THREE.SpotLight(0xffffff, 0.5, 5, Math.PI / 6, 0.5, 1);
handSpotLight.position.set(0, 2, 0);
handSpotLight.castShadow = true;
cameraGroup.add(handSpotLight);

// テレポート可能な床を作成（見えない）
const teleportFloorGeometry = new THREE.PlaneGeometry(300, 300);
const teleportFloorMaterial = new THREE.MeshBasicMaterial({ visible: false });
const teleportFloor = new THREE.Mesh(teleportFloorGeometry, teleportFloorMaterial);
teleportFloor.rotation.x = -Math.PI / 2;
teleportFloor.position.y = 0;
scene.add(teleportFloor);

// テレポートのトリガー状態
let controller1Squeezing = false;
let controller2Squeezing = false;

// コントローラーのスクイーズイベント（グリップボタン）
controller1.addEventListener('squeezestart', () => {
    controller1Squeezing = true;
});

controller1.addEventListener('squeezeend', () => {
    controller1Squeezing = false;
    // テレポート実行
    if (teleportMarker.visible) {
        cameraGroup.position.x = teleportMarker.position.x;
        cameraGroup.position.z = teleportMarker.position.z;
        teleportMarker.visible = false;
    }
});

controller2.addEventListener('squeezestart', () => {
    controller2Squeezing = true;
});

controller2.addEventListener('squeezeend', () => {
    controller2Squeezing = false;
    // テレポート実行
    if (teleportMarker.visible) {
        cameraGroup.position.x = teleportMarker.position.x;
        cameraGroup.position.z = teleportMarker.position.z;
        teleportMarker.visible = false;
    }
});

function updateTeleport(controller, squeezing) {
    if (squeezing && renderer.xr.isPresenting) {
        tempMatrix.identity().extractRotation(controller.matrixWorld);
        raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
        
        const intersects = raycaster.intersectObject(teleportFloor);
        if (intersects.length > 0) {
            teleportMarker.position.copy(intersects[0].point);
            teleportMarker.position.y = 0.01; // 少し上に配置
            teleportMarker.visible = true;
        } else {
            teleportMarker.visible = false;
        }
    }
}

// === マウスによる視点操作 ===
let mouseX = 0;
let mouseY = 0;
let rotationY = 0; // Y軸回転を追跡
let rotationX = 0; // X軸回転を追跡

// マウス操作（非VR時）
document.addEventListener('mousemove', (event) => {
    // マウス位置を-1から1の範囲に正規化
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
});

// === カメラ移動の更新関数 ===
function updateCameraMovement(deltaTime) {
    if (!renderer.xr.isPresenting) { // VRモードでない時のみキーボード移動
        const speed = keys.shift ? moveSpeed * 2 : moveSpeed;
        const moveDistance = speed * deltaTime * 60; // 60fpsを基準に
        
        // カメラの向きを基準に移動方向を計算
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0; // Y軸の移動を無効化（地面に平行に移動）
        forward.normalize();
        
        const right = new THREE.Vector3();
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0));
        
        if (keys.w) {
            cameraGroup.position.addScaledVector(forward, moveDistance);
        }
        if (keys.s) {
            cameraGroup.position.addScaledVector(forward, -moveDistance);
        }
        if (keys.a) {
            cameraGroup.position.addScaledVector(right, -moveDistance);
        }
        if (keys.d) {
            cameraGroup.position.addScaledVector(right, moveDistance);
        }
    }
}

// === アニメーションループ ===
function animate() {
    const deltaTime = clock.getDelta();

    // カメラ移動を更新
    updateCameraMovement(deltaTime);
    
    // VRモードでない時のみマウスでカメラを制御
    if (!renderer.xr.isPresenting) {
        // マウスによる視点移動（位置は移動しない）
        const sensitivityX = 1.5; // 水平方向の感度
        const sensitivityY = 1.0; // 垂直方向の感度
        
        // 目標回転角度を計算
        const targetRotationY = -mouseX * Math.PI * sensitivityX;
        const targetRotationX = mouseY * Math.PI * 0.5 * sensitivityY;
        
        // スムージング
        rotationY += (targetRotationY - rotationY) * 0.1;
        rotationX += (targetRotationX - rotationX) * 0.1;
        
        // X軸回転の制限
        rotationX = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, rotationX));
        
        // カメラの回転を適用（回転順序を正しく設定）
        camera.rotation.order = 'YXZ'; // Y軸回転を先に適用
        camera.rotation.y = rotationY;
        camera.rotation.x = rotationX;
    } else {
        // VRモード時のテレポート更新
        updateTeleport(controller1, controller1Squeezing);
        updateTeleport(controller2, controller2Squeezing);
        
        // ハンドトラッキングの更新
        updateHandTracking(hand1, jointMeshes1, boneLines1, handData1, rightHandModel, true);
        updateHandTracking(hand2, jointMeshes2, boneLines2, handData2, leftHandModel, false);
        
        // ピンチ状態の更新とテレポート処理
        const wasPinching1 = hand1Pinching;
        const wasPinching2 = hand2Pinching;
        
        hand1Pinching = isPinching(hand1);
        hand2Pinching = isPinching(hand2);
        
        // ハンド1のテレポート処理
        if (hand1Pinching) {
            updateHandTeleport(hand1, true);
        } else if (wasPinching1 && !hand1Pinching && teleportMarker.visible) {
            // ピンチを離したときにテレポート実行
            cameraGroup.position.x = teleportMarker.position.x;
            cameraGroup.position.z = teleportMarker.position.z;
            teleportMarker.visible = false;
        }
        
        // ハンド2のテレポート処理
        if (hand2Pinching) {
            updateHandTeleport(hand2, true);
        } else if (wasPinching2 && !hand2Pinching && teleportMarker.visible) {
            // ピンチを離したときにテレポート実行
            cameraGroup.position.x = teleportMarker.position.x;
            cameraGroup.position.z = teleportMarker.position.z;
            teleportMarker.visible = false;
        }
    }

    // パーティクルシステムを更新
    if (particleSystem) {
        particleSystem.update(deltaTime);
    }
}

// WebXR用のアニメーションループ
renderer.setAnimationLoop(function() {
    animate();
    renderer.render(scene, camera);
});

window.addEventListener('resize', () => {
    if (!renderer.xr.isPresenting) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        
        // VRモードでない場合はハンドメッシュを非表示
        for (const jointName in jointMeshes1) {
            if (jointMeshes1[jointName]) jointMeshes1[jointName].visible = false;
        }
        for (const jointName in jointMeshes2) {
            if (jointMeshes2[jointName]) jointMeshes2[jointName].visible = false;
        }
        boneLines1.forEach(line => {
            if (line) line.visible = false;
        });
        boneLines2.forEach(line => {
            if (line) line.visible = false;
        });
        // GLBモデルも非表示に
        if (rightHandModel) rightHandModel.visible = false;
        if (leftHandModel) leftHandModel.visible = false;
    }
});