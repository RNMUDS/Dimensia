AFRAME.registerComponent('particle-wave', {
  // コンポーネントのプロパティ（HTMLから調整できる値）を定義
  schema: {
    count: { type: 'int', default: 5000 },          // パーティクルの数
    spread: { type: 'number', default: 100 },        // パーティクルが広がる範囲
    particleSize: { type: 'number', default: 0.02 }, // パーティクルの大きさ
    amplitude: { type: 'number', default: 0.3 },    // 波の振幅（高さ）
    frequency: { type: 'number', default: 2.0 },    // 波の周波数（細かさ）
    speed: { type: 'number', default: 0.2 },        // 波が広がる速さ
    color: { type: 'color', default: '#FFF' },      // パーティクルの色
  },

  // コンポーネントの初期化処理
  init: function () {
    this.particles = []; // 生成したパーティクルを保存する配列

    // 指定された数だけパーティクルを生成
    for (let i = 0; i < this.data.count; i++) {
      const particle = document.createElement('a-sphere');
      const spread = this.data.spread;

      // XZ平面にランダムに配置
      const x = (Math.random() - 0.5) * spread;
      const z = (Math.random() - 0.5) * spread;
      
      particle.setAttribute('position', { x: x, y: 0, z: z });
      particle.setAttribute('radius', this.data.particleSize);
      particle.setAttribute('color', this.data.color);
      
      // 生成したパーティクルをシーンに追加
      this.el.appendChild(particle);
      this.particles.push(particle);
    }
  },

  // 毎フレーム呼ばれる更新処理 (アニメーション)
  tick: function (time, timeDelta) {
    // 時間に速さをかけて波のアニメーションを制御
    const t = time * 0.001 * this.data.speed;
    const { amplitude, frequency } = this.data;

    // すべてのパーティクルの位置を更新
    this.particles.forEach(particle => {
      const pos = particle.object3D.position;

      // 中心からの距離を計算
      const distance = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
      
      // 波の関数を使ってY座標を計算
      // y = 振幅 * sin(距離 * 周波数 - 時間)
      const y = amplitude * Math.sin(distance * frequency - t);

      // 計算したY座標を適用
      particle.object3D.position.y = y;
    });
  }
});