// main.js
import * as THREE from 'three';
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
                        // ハンドトラッキングのメッシュをクリーンアップ
                        cleanupHandMeshes();
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

// 各関節用のメッシュとボーンラインを作成
const jointMeshes1 = {};
const jointMeshes2 = {};
const boneLines1 = [];
const boneLines2 = [];
const forearmMesh1 = null;
const forearmMesh2 = null;
const handData1 = { joints: jointMeshes1, bones: boneLines1, forearm: forearmMesh1 };
const handData2 = { joints: jointMeshes2, bones: boneLines2, forearm: forearmMesh2 };

// 関節の球体を作成（関節ごとに異なる形状）
function createJointSphere(radius = 0.008, type = 'normal', jointName = '') {
    let geometry;
    if (type === 'knuckle') {
        // ナックル（指の付け根）はより大きく、やや扁平
        geometry = new THREE.SphereGeometry(radius * 1.2, 16, 12);
        geometry.scale(1, 0.8, 1.1);
    } else if (type === 'tip') {
        // 指先は小さく、やや細長い
        geometry = new THREE.SphereGeometry(radius * 0.8, 16, 12);
        geometry.scale(0.9, 0.9, 1.1);
    } else if (type === 'wrist') {
        // 手首は横長の楕円形
        geometry = new THREE.SphereGeometry(radius, 16, 12);
        geometry.scale(1.8, 0.8, 1.2); // X軸方向に1.8倍、Y軸方向に0.8倍
    } else {
        geometry = new THREE.SphereGeometry(radius, 16, 12);
    }
    const mesh = new THREE.Mesh(geometry, skinMaterial);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

// 指の接続関係を定義
const fingerConnections = [
    // 親指（2関節）
    ['wrist', 'thumb-metacarpal'],                                    // 手首 → 親指中手骨
    ['thumb-metacarpal', 'thumb-phalanx-proximal'],                  // 親指中手骨 → 親指基節骨
    ['thumb-phalanx-proximal', 'thumb-phalanx-distal'],             // 親指基節骨 → 親指末節骨
    ['thumb-phalanx-distal', 'thumb-tip'],                          // 親指末節骨 → 親指先
    
    // 人差し指（3関節）
    ['wrist', 'index-finger-metacarpal'],                           // 手首 → 人差し指中手骨
    ['index-finger-metacarpal', 'index-finger-phalanx-proximal'],   // 中手骨 → 基節骨（第三関節）
    ['index-finger-phalanx-proximal', 'index-finger-phalanx-intermediate'], // 基節骨 → 中節骨（第二関節）
    ['index-finger-phalanx-intermediate', 'index-finger-phalanx-distal'],   // 中節骨 → 末節骨（第一関節）
    ['index-finger-phalanx-distal', 'index-finger-tip'],            // 末節骨 → 指先
    
    // 中指（3関節）
    ['wrist', 'middle-finger-metacarpal'],                          // 手首 → 中指中手骨
    ['middle-finger-metacarpal', 'middle-finger-phalanx-proximal'], // 中手骨 → 基節骨（第三関節）
    ['middle-finger-phalanx-proximal', 'middle-finger-phalanx-intermediate'], // 基節骨 → 中節骨（第二関節）
    ['middle-finger-phalanx-intermediate', 'middle-finger-phalanx-distal'],   // 中節骨 → 末節骨（第一関節）
    ['middle-finger-phalanx-distal', 'middle-finger-tip'],          // 末節骨 → 指先
    
    // 薬指（3関節）
    ['wrist', 'ring-finger-metacarpal'],                            // 手首 → 薬指中手骨
    ['ring-finger-metacarpal', 'ring-finger-phalanx-proximal'],     // 中手骨 → 基節骨（第三関節）
    ['ring-finger-phalanx-proximal', 'ring-finger-phalanx-intermediate'],    // 基節骨 → 中節骨（第二関節）
    ['ring-finger-phalanx-intermediate', 'ring-finger-phalanx-distal'],      // 中節骨 → 末節骨（第一関節）
    ['ring-finger-phalanx-distal', 'ring-finger-tip'],              // 末節骨 → 指先
    
    // 小指（3関節）
    ['wrist', 'pinky-finger-metacarpal'],                           // 手首 → 小指中手骨
    ['pinky-finger-metacarpal', 'pinky-finger-phalanx-proximal'],   // 中手骨 → 基節骨（第三関節）
    ['pinky-finger-phalanx-proximal', 'pinky-finger-phalanx-intermediate'],  // 基節骨 → 中節骨（第二関節）
    ['pinky-finger-phalanx-intermediate', 'pinky-finger-phalanx-distal'],    // 中節骨 → 末節骨（第一関節）
    ['pinky-finger-phalanx-distal', 'pinky-finger-tip']             // 末節骨 → 指先
];

// ハンドトラッキングでのピンチ状態を追跡
let hand1Pinching = false;
let hand2Pinching = false;

// ハンドメッシュのクリーンアップ関数
function cleanupHandMeshes() {
    // ハンド1のクリーンアップ
    for (const jointName in jointMeshes1) {
        if (jointMeshes1[jointName]) {
            scene.remove(jointMeshes1[jointName]);
            jointMeshes1[jointName].geometry.dispose();
            delete jointMeshes1[jointName];
        }
    }
    
    // ハンド2のクリーンアップ
    for (const jointName in jointMeshes2) {
        if (jointMeshes2[jointName]) {
            scene.remove(jointMeshes2[jointName]);
            jointMeshes2[jointName].geometry.dispose();
            delete jointMeshes2[jointName];
        }
    }
    
    // ボーンラインのクリーンアップ
    boneLines1.forEach((line, index) => {
        if (line) {
            scene.remove(line);
            line.geometry.dispose();
            boneLines1[index] = null;
        }
    });
    
    boneLines2.forEach((line, index) => {
        if (line) {
            scene.remove(line);
            line.geometry.dispose();
            boneLines2[index] = null;
        }
    });
    
    // 腕のクリーンアップ
    if (handData1.forearm) {
        scene.remove(handData1.forearm);
        handData1.forearm.geometry.dispose();
        handData1.forearm = null;
    }
    
    if (handData2.forearm) {
        scene.remove(handData2.forearm);
        handData2.forearm.geometry.dispose();
        handData2.forearm = null;
    }
}

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

// ハンドトラッキングの更新関数
function updateHandTracking(hand, jointMeshes, boneLines, handData) {
    if (renderer.xr.isPresenting && hand.joints) {
        // ハンドが検出されているかチェック
        let handDetected = false;
        for (const jointName in hand.joints) {
            if (hand.joints[jointName]) {
                handDetected = true;
                break;
            }
        }
        
        if (!handDetected) {
            // ハンドが検出されていない場合は非表示
            for (const jointName in jointMeshes) {
                if (jointMeshes[jointName]) {
                    jointMeshes[jointName].visible = false;
                }
            }
            boneLines.forEach(cylinder => {
                if (cylinder) cylinder.visible = false;
            });
            if (handData.forearm) {
                handData.forearm.visible = false;
            }
            return;
        }
        // 各関節の位置を更新
        for (const jointName in hand.joints) {
            const joint = hand.joints[jointName];
            
            // 関節のメッシュがなければ作成
            if (!jointMeshes[jointName]) {
                let radius, type = 'normal';
                if (jointName === 'wrist') {
                    // 手首
                    radius = 0.015;
                    type = 'wrist';
                } else if (jointName.includes('metacarpal')) {
                    // 中手骨（手の甲の骨）
                    radius = 0.012;
                    type = 'knuckle';
                } else if (jointName.includes('tip')) {
                    // 指先
                    radius = 0.009;
                    type = 'tip';
                } else if (jointName.includes('proximal')) {
                    // 基節骨（第三関節・MP関節・こぶしの関節）
                    radius = 0.012;
                } else if (jointName.includes('intermediate')) {
                    // 中節骨（第二関節・PIP関節）
                    radius = 0.01;
                } else if (jointName.includes('distal')) {
                    // 末節骨（第一関節・DIP関節）
                    radius = 0.008;
                } else {
                    radius = 0.008;
                }
                
                const mesh = createJointSphere(radius, type, jointName);
                scene.add(mesh);
                jointMeshes[jointName] = mesh;
     
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
        }
        
        // 手首から腕（前腕）を追加
        if (hand.joints['wrist']) {
            // 腕のメッシュがなければ作成
            if (!handData.forearm) {
                // 腕のシリンダー（手首側を手首に合わせた楕円形に）
                // CylinderGeometry(radiusTop, radiusBottom, height, radialSegments)
                const forearmGeometry = new THREE.CylinderGeometry(0.015, 0.030, 0.325, 16); // 0.25 * 1.3 = 0.325
                // 手首の楕円形に合わせてスケールを調整
                forearmGeometry.scale(1.8, 1, 1.2);
                const forearmMesh = new THREE.Mesh(forearmGeometry, skinMaterial);
                forearmMesh.castShadow = true;
                forearmMesh.receiveShadow = true;
                scene.add(forearmMesh);
                handData.forearm = forearmMesh;
            }
            
            // 手首の位置と回転を取得
            const wristPosition = new THREE.Vector3();
            const wristQuaternion = new THREE.Quaternion();
            hand.joints['wrist'].getWorldPosition(wristPosition);
            hand.joints['wrist'].getWorldQuaternion(wristQuaternion);
            
            // 腕の位置を計算（手首から指の反対方向に延長）
            // 指は通常Z軸負方向を向いているので、腕はZ軸正方向に伸びる
            const armOffset = new THREE.Vector3(0, 0, 0.1625); // Z軸正方向（腕の長さの半分: 0.325 / 2）
            armOffset.applyQuaternion(wristQuaternion);
            
            // 腕のメッシュを更新
            handData.forearm.position.copy(wristPosition);
            handData.forearm.position.add(armOffset);
            
            // 腕の回転を手首に合わせる（シリンダーはY軸方向なので90度回転が必要）
            handData.forearm.quaternion.copy(wristQuaternion);
            // シリンダーをZ軸方向に向ける
            handData.forearm.rotateX(-Math.PI / 2);
            handData.forearm.visible = true;
        }
        
        // ボーンラインを更新
        fingerConnections.forEach((connection, index) => {
            const [joint1Name, joint2Name] = connection;
            
            if (hand.joints[joint1Name] && hand.joints[joint2Name]) {
                // シリンダーがなければ作成
                if (!boneLines[index]) {
                    // 部位ごとにシリンダーの太さを調整
                    let radiusTop = 0.004;
                    let radiusBottom = 0.004;
                    
                    // 手の甲（手首から指の付け根まで）
                    if (joint1Name === 'wrist' && joint2Name.includes('metacarpal')) {
                        // 指ごとに手の甲の太さを調整（隙間がなくなるように）
                        if (joint2Name.includes('thumb')) {
                            radiusTop = 0.01;
                            radiusBottom = 0.01;
                        } else if (joint2Name.includes('index')) {
                            radiusTop = 0.01;
                            radiusBottom = 0.01;
                        } else if (joint2Name.includes('middle')) {
                            radiusTop = 0.010;
                            radiusBottom = 0.01;
                        } else if (joint2Name.includes('ring')) {
                            radiusTop = 0.01;
                            radiusBottom = 0.01;
                        } else if (joint2Name.includes('pinky')) {
                            radiusTop = 0.01;
                            radiusBottom = 0.01;
                        }
                    }
                    // 中手骨から基節骨（手の甲から第三関節・こぶしの関節へ）
                    else if (joint1Name.includes('metacarpal') && joint2Name.includes('proximal')) {
                        radiusTop = 0.012;
                        radiusBottom = 0.011;
                    }
                    // 基節骨（第三関節から第二関節へ）
                    else if (joint1Name.includes('proximal') && joint2Name.includes('intermediate')) {
                        radiusTop = 0.010;
                        radiusBottom = 0.011;
                    }
                    // 中節骨（第二関節から第一関節へ）
                    else if (joint1Name.includes('intermediate') && joint2Name.includes('distal')) {
                        radiusTop = 0.008;
                        radiusBottom = 0.010;
                    }
                    // 末節骨（第一関節から指先へ）
                    else if (joint1Name.includes('distal') && joint2Name.includes('tip')) {
                        radiusTop = 0.0065;
                        radiusBottom = 0.008;
                    }
                    // 親指の特別な処理
                    else if (joint1Name.includes('thumb') && joint2Name.includes('thumb')) {
                        if (joint2Name.includes('proximal')) {
                            radiusTop = 0.012;
                            radiusBottom = 0.015;
                        } else if (joint2Name.includes('distal')) {
                            radiusTop = 0.009;
                            radiusBottom = 0.01;
                        } else if (joint2Name.includes('tip')) {
                            radiusTop = 0.009;
                            radiusBottom = 0.01;
                        }
                    }
                    
                    const cylinderGeometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, 1, 12);
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
                
                // 手首から中手骨への接続の場合、手首側の位置を調整
                if (joint1Name === 'wrist' && joint2Name.includes('metacarpal')) {
                    // 各指に応じて手首の楕円形上の位置にオフセット
                    const wristQuaternion = new THREE.Quaternion();
                    hand.joints[joint1Name].getWorldQuaternion(wristQuaternion);
                    
                    let xOffset = 0;
                    let zOffset = 0;
                    if (joint2Name.includes('thumb')) {
                        xOffset = -0.018; // 親指は左側かつ前方
                        zOffset = -0.008;
                    } else if (joint2Name.includes('index')) {
                        xOffset = -0.01; // 人差し指
                        zOffset = -0.002;
                    } else if (joint2Name.includes('middle')) {
                        xOffset = 0; // 中指は中央
                        zOffset = 0;
                    } else if (joint2Name.includes('ring')) {
                        xOffset = 0.01; // 薬指
                        zOffset = -0.002;
                    } else if (joint2Name.includes('pinky')) {
                        xOffset = 0.018; // 小指は右側
                        zOffset = -0.004;
                    }
                    
                    // オフセットを手首の回転に合わせて適用
                    const offset = new THREE.Vector3(xOffset, 0, zOffset);
                    offset.applyQuaternion(wristQuaternion);
                    pos1.add(offset);
                }
                
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
        // 腕も非表示
        if (handData.forearm) {
            handData.forearm.visible = false;
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
        updateHandTracking(hand1, jointMeshes1, boneLines1, handData1);
        updateHandTracking(hand2, jointMeshes2, boneLines2, handData2);
        
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
        // 腕も非表示
        if (handData1.forearm) handData1.forearm.visible = false;
        if (handData2.forearm) handData2.forearm.visible = false;
    }
});