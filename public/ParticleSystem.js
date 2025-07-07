// ParticleSystem.js
import * as THREE from 'three';

export class ParticleSystem {
    /**
     * @param {THREE.Scene} scene - パーティクルを追加するシーン
     * @param {object} options - パーティクルの設定オプション
     */
    constructor(scene, options = {}) {
        this.scene = scene;
        // デフォルト設定とユーザー設定をマージ
        this.options = Object.assign({
            particleCount: 50, // パーティクルの数
            texture: this.createDefaultTexture(), // デフォルトのテクスチャ
            color: 0xffffff,
            maxSize: 0.2,
            minSize: 0.05,
            positionSpread: new THREE.Vector3(20, 20, 20),
            velocity: new THREE.Vector3(0, -0.1, 0),
            velocitySpread: new THREE.Vector3(0.1, 0.1, 0.1),
            maxAge: 10, // パーティクルの最大寿命
            minAge: 5,
        }, options);

        this.particles = null;
        this.particleData = [];

        this.init();
    }

    // デフォルトのテクスチャを生成（画像ファイルがなくても動作する）
    createDefaultTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        const gradient = context.createRadialGradient(
            canvas.width / 2, canvas.height / 2, 0,
            canvas.width / 2, canvas.height / 2, canvas.width / 2
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.2, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);
        return new THREE.CanvasTexture(canvas);
    }

    init() {
        const geometry = new THREE.BufferGeometry();
        const positions = [];

        // 各パーティクルの初期データを設定
        for (let i = 0; i < this.options.particleCount; i++) {
            const data = {
                position: new THREE.Vector3(
                    (Math.random() - 0.5) * this.options.positionSpread.x,
                    (Math.random() - 0.5) * this.options.positionSpread.y,
                    (Math.random() - 0.5) * this.options.positionSpread.z
                ),
                velocity: new THREE.Vector3(
                    this.options.velocity.x + (Math.random() - 0.5) * this.options.velocitySpread.x,
                    this.options.velocity.y + (Math.random() - 0.5) * this.options.velocitySpread.y,
                    this.options.velocity.z + (Math.random() - 0.5) * this.options.velocitySpread.z
                ),
                age: 0,
                maxAge: this.options.minAge + Math.random() * (this.options.maxAge - this.options.minAge)
            };
            this.particleData.push(data);
            positions.push(data.position.x, data.position.y, data.position.z);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: this.options.color,
            size: this.options.maxSize,
            map: this.options.texture,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true,
            vertexColors: false // 単色なのでfalse
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    /**
     * @param {number} deltaTime - 前フレームからの経過時間
     */
    update(deltaTime) {
        if (!this.particles) return;

        const positions = this.particles.geometry.attributes.position.array;
        
        for (let i = 0; i < this.options.particleCount; i++) {
            const data = this.particleData[i];
            data.age += deltaTime;

            // 寿命が尽きたらリセット
            if (data.age >= data.maxAge) {
                data.age = 0;
                data.position.set(
                    (Math.random() - 0.5) * this.options.positionSpread.x,
                    (Math.random() - 0.5) * this.options.positionSpread.y,
                    (Math.random() - 0.5) * this.options.positionSpread.z
                );
            }

            // 位置を更新
            data.position.addScaledVector(data.velocity, deltaTime);

            // バッファを更新
            const index = i * 3;
            positions[index] = data.position.x;
            positions[index + 1] = data.position.y;
            positions[index + 2] = data.position.z;
        }

        // Three.jsにジオメトリの更新を通知
        this.particles.geometry.attributes.position.needsUpdate = true;
    }
    
    // パーティクルシステムを破棄
    dispose() {
        if (this.particles) {
            // ジオメトリの破棄
            this.particles.geometry.dispose();
            
            // マテリアルの破棄
            this.particles.material.dispose();
            
            // テクスチャの破棄
            if (this.particles.material.map) {
                this.particles.material.map.dispose();
            }
            
            // シーンから削除
            this.scene.remove(this.particles);
            
            // 参照をクリア
            this.particles = null;
            this.particleData = [];
        }
    }
}