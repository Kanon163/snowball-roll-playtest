var createSnowRace = (() => {
  const RULES = {
    gift: [12, 3.3, .65, 8],
    snowman: [12, 4, .7, 9],
    fence: [30, 8, 1.3, 12],
    deer: [28, 9, 1.1, 15],
    tree: [45, 14, 1.4, 18],
    house: [85, 26, 4.2, 24],
    palace: [120, 0, 11, 10]
  };
  const TUTORIAL_HEADSTART = 45;
  const TAU = Math.PI * 2;

  // 用 server.py 的 level()、种子 3824 生成。索引也是场景的道具 ID。
  const PROPS = [
    ['palace', 0, 0], ['gift', -6, 37], ['gift', 6, 37],
    ['house', -39.65, 18.34], ['house', -9.54, 49.43], ['house', 31.51, 9.15],
    ['house', -25.26, 20.49], ['house', -23.37, -32.5], ['house', -58.64, -19.56],
    ['house', 28.69, 51.99], ['house', 61.08, -9.26], ['house', 27.44, 23.12],
    ['tree', -1.27, 15.46], ['tree', 16.34, -15.51], ['tree', 20.95, 7.95],
    ['tree', -22.16, 45.04], ['tree', -36.37, -10.62], ['tree', -16.84, 7.96],
    ['tree', -7.83, -41.44], ['tree', 36.55, 42.37], ['tree', -4.6, 55.26],
    ['tree', 11.7, 28], ['tree', 48.96, -33.75], ['tree', -48.07, 37.49],
    ['tree', -14.68, 19.03], ['tree', -23.23, 7.12], ['tree', -52.59, -16.42],
    ['tree', -9.36, 9.14], ['tree', 15.19, -40.94], ['tree', 15.71, -59.15],
    ['tree', -34.01, -39.46], ['tree', -10.38, 25.85], ['tree', -18.85, -21.5],
    ['tree', -13.37, -18.02], ['tree', -56.83, -3.05], ['tree', -29.88, -39.44],
    ['tree', 35.95, 34.46], ['tree', 39.49, -5.93], ['tree', 3.99, 18.2],
    ['tree', -34.64, 36.56], ['tree', 27.58, -14.11], ['tree', -8.1, -32.48],
    ['tree', -20.92, -7.04], ['tree', -6.54, 26.5], ['tree', 12.29, -61.18],
    ['tree', 0.61, 35.36], ['tree', 14.64, 50.63], ['tree', -16.93, -17.82],
    ['tree', 13.88, -54.95], ['deer', -39, -5.17], ['deer', -26.14, 42.05],
    ['deer', 48.63, 9.79], ['deer', -39.12, -19.1], ['deer', -10.13, -29.99],
    ['deer', 1.95, -28.4], ['deer', -0.86, 22.98], ['deer', -21.84, 59],
    ['deer', -18.53, -57.21], ['deer', -4.55, 22.89], ['deer', 32.91, -47.91],
    ['deer', 8.93, 50.59], ['deer', 48.05, -11.26], ['deer', -25.07, -26.84],
    ['deer', 53.87, 3.06], ['deer', -13.67, 7.12], ['deer', 35.4, 28.43],
    ['deer', -1.44, 43.55], ['deer', 55.53, 26.11], ['deer', -59.17, 11.63],
    ['deer', -8.56, -49.98], ['deer', 39.01, 23.83], ['deer', -30.97, -16.08],
    ['deer', 7.31, 18.58], ['deer', -3.09, 31.6], ['deer', -2.39, -17.23],
    ['deer', 28.38, 15.25], ['deer', -44.31, -5.16], ['deer', 1.14, -43.66],
    ['deer', -51.07, 12.15], ['deer', 35.63, 0.75], ['deer', 58.42, -18.95],
    ['deer', -41.85, -29.46], ['deer', 42.44, 18.24], ['deer', -50.88, -12.81],
    ['fence', 17.15, -11.38], ['fence', -32.47, -51.69], ['fence', -29.66, 32.21],
    ['fence', 23.63, -27.27], ['fence', -0.8, 47.96], ['fence', -48.18, -6.66],
    ['fence', 50.27, 33.84], ['fence', 57.04, 9.75], ['fence', -48.69, 23.42],
    ['fence', 44.54, 8], ['fence', 11.4, 47.02], ['fence', 29.98, -20.32],
    ['fence', 37.01, -41.74], ['fence', 0.52, -62.58], ['fence', -59.24, 0.33],
    ['fence', 30.87, -16.81], ['fence', 33.9, -5.97], ['fence', -35.33, 0.09],
    ['fence', 45.44, 3.64], ['fence', -53.39, -1.51], ['fence', 41.22, -1.95],
    ['fence', -3.12, -60.68], ['fence', -34.67, -17.41], ['fence', 2.1, -22.15],
    ['fence', 40.09, -16.84], ['fence', 9.77, 16.15], ['fence', 12.73, 34.14],
    ['fence', -9.65, -59.25], ['fence', 50.85, 2.13], ['fence', -38.16, 3.37],
    ['fence', -35.77, -43.66], ['fence', 4.6, 22.3], ['fence', 22.2, -53.29],
    ['fence', 36.86, -2.24], ['fence', 52.01, -30.74], ['fence', -10.45, 34.41],
    ['fence', 56.35, 16.17], ['fence', -0.54, -51.28], ['fence', 24.55, 33.68],
    ['fence', 61.14, 5.41], ['fence', -2.71, -38.31], ['fence', -42.26, 28.27],
    ['fence', 46.22, -36.65], ['fence', 44.28, 22.03], ['fence', -14.87, -58.6],
    ['fence', -20.88, -54.21], ['fence', 33.83, -38], ['fence', -1.76, -26.44],
    ['fence', -18.92, 4.76], ['fence', 9.81, 58.91], ['fence', -62.89, 3.72],
    ['fence', -61.37, -6.18], ['fence', 20.2, -36.24], ['fence', 29.54, -3.75],
    ['gift', -47.43, -41.46], ['gift', 38.83, 46.16], ['gift', 4.84, -24.71],
    ['gift', -33.38, 6.05], ['gift', -25.3, -48.64], ['gift', -30.54, 53.39],
    ['gift', -39.47, 40.23], ['gift', 28.66, 43.79], ['gift', -0.34, -33.24],
    ['gift', -47.19, -37.44], ['gift', -20.06, -0.34], ['gift', -56.18, 9.63],
    ['gift', 40.82, 43.57], ['gift', 25.97, 36.09], ['gift', 9.62, -34.23],
    ['gift', 40.39, 33.11], ['gift', -30.01, 47.73], ['gift', -47.07, 2.68],
    ['gift', 5.48, 31.88], ['gift', 12.19, -12.36], ['gift', 17.21, -45.27],
    ['gift', -58.68, 16.86], ['gift', 31.71, -7.85], ['gift', -47.51, -33.72],
    ['gift', 52.69, -1.64], ['gift', -31.88, 2.06], ['gift', -20.11, 11.88],
    ['gift', 57.28, -4.74], ['gift', 9.09, 36.07], ['gift', -31.99, -28.73],
    ['gift', -13.99, -6.91], ['gift', -15.58, -37.76], ['gift', -12.03, -10.57],
    ['gift', 18.99, -2.31], ['gift', -28.82, -11.88], ['gift', -3.35, 26.03],
    ['gift', -13.41, 37.17], ['gift', -32.46, -0.52], ['gift', -17.06, -9.34],
    ['gift', 20.34, 17.92], ['gift', -23.9, 28.51], ['gift', -43.09, -44.19],
    ['gift', 25.38, 11.83], ['gift', 12.69, -28.81], ['gift', -21.98, 2.09],
    ['gift', 8.81, -55.24], ['gift', -10.37, -44.51], ['gift', 4.94, 11.97],
    ['gift', 31.23, -42.12], ['gift', 44.92, -19.31], ['gift', -41.35, -12.65],
    ['gift', -17.36, 40.86], ['gift', -14.17, -32.71], ['gift', -16.2, 52.04],
    ['gift', 46.03, 42.74], ['gift', -9.83, -17.57], ['gift', 0.16, -36.27],
    ['gift', 37.52, 14.53], ['gift', 53.08, -21.66], ['gift', 2.64, -31.92],
    ['gift', 54.38, -18.91], ['gift', 12.95, -44.58], ['gift', 12.26, 11.45],
    ['gift', 2.6, -55.97], ['gift', -38.73, -14.78], ['gift', -17.31, -52.83],
    ['gift', -24.25, -24.48], ['gift', 51.84, 7.35], ['gift', 5.46, -58.72],
    ['gift', 24.03, -12.52], ['gift', 26.51, -8.53], ['gift', 11.44, 50.43],
    ['gift', -24.76, -57.34], ['gift', 47.87, 2.43], ['gift', 38.74, -23.71],
    ['gift', 32.39, 44.46], ['gift', -57.53, 20.51], ['gift', -0.76, -47.73],
    ['gift', -17.47, -1.1], ['gift', -15.06, -52.03], ['gift', 51.49, -35.31],
    ['gift', 24.86, -38.32], ['gift', 53.23, -11.39], ['gift', 15.26, 44.07],
    ['gift', -38.08, 41.94], ['gift', -4.74, -14.8], ['gift', 32.32, -29.99],
    ['gift', 36.34, -49.39], ['gift', 44.57, 32.84], ['gift', -6.35, 59.03],
    ['gift', 35.02, -35.27], ['gift', -0.13, 27.38], ['gift', 55.81, 28.89],
    ['gift', 43.56, -25.84], ['gift', 61.66, 9.69], ['gift', 14.93, 13.48],
    ['gift', -51.14, -30.54], ['gift', -15.44, 28.09], ['gift', -12.23, 41.6],
    ['gift', -17.16, 21.29], ['gift', 50.01, 27.58], ['gift', -44.54, 7.76],
    ['gift', 42.75, 32.01], ['gift', -24.34, -42.96], ['gift', -21.12, 56.47],
    ['gift', 7.95, -25.5], ['gift', 15.04, 16.8], ['gift', -7.21, 16.6],
    ['gift', 22.41, 27.95], ['gift', 17.74, 5.96], ['gift', 10.25, -39.53],
    ['gift', -14.56, 12.75], ['gift', -55.69, 25.26], ['gift', 8.29, 32.09],
    ['gift', -10.74, 55.44], ['gift', 4.53, -35.57], ['gift', -34.69, -13.24],
    ['gift', 25.32, -4.76], ['gift', 17.33, -48.38], ['gift', 59.33, 12.85],
    ['gift', 50.99, -5.28], ['gift', 27.32, 45.81], ['gift', 3.46, -52.92],
    ['gift', 8.66, 11.01], ['gift', 40.5, 3.72], ['gift', 0.43, 50.65],
    ['gift', 29.32, 32.75], ['gift', -11.82, 58.71], ['gift', -28.57, 40.59],
    ['gift', 34.36, -42.47], ['gift', -7.18, -18.99], ['gift', -9.24, -24.98],
    ['gift', 1.49, -59.63], ['gift', 4.35, 61.24], ['gift', -48.2, 27.67],
    ['gift', -19.99, 40.75], ['gift', -31.97, -44.94], ['gift', -54.06, -7.25],
    ['gift', -24.8, -52.69], ['gift', 34.41, 37.27], ['gift', 22.09, -10.17],
    ['gift', 27.6, -11.11], ['gift', -36.28, -20.62], ['gift', 21.83, 12.6],
    ['gift', 6.74, -23.64], ['gift', 24.23, -31.55], ['gift', -49.62, -35.42],
    ['gift', 18.59, 31.15], ['gift', 18.28, -40.68], ['gift', -24.53, -54.78],
    ['gift', -33.53, 25.51], ['gift', 18.15, 19.64], ['gift', 44.27, -39.57],
    ['gift', -13.88, 15.38], ['gift', 11.71, -52.5], ['gift', 26.49, -44.47],
    ['gift', 45.72, -13.62], ['gift', -6.02, -21.11], ['gift', 4.42, -37.83],
    ['gift', 44.19, 40.77], ['gift', 16.02, -1.77], ['gift', 21.81, -44.12],
    ['gift', -42.38, -0.72], ['gift', -22.29, -0.22], ['gift', -15.87, -34.45],
    ['gift', 22.46, -21.54], ['gift', -15.92, 58.14], ['gift', -20.7, -18.53],
    ['gift', 24.17, -48.59], ['gift', 46.08, 10.67], ['gift', -44.17, 10.17],
    ['gift', 30.82, -49.85], ['gift', -42.3, -35.08], ['gift', 24.17, 6.49],
    ['gift', -9.78, -52.54], ['gift', 28.29, -0.9], ['gift', -49.31, 34.98],
    ['gift', 52.17, 11.76], ['gift', 20.63, -46.45], ['gift', 26.03, -20.3],
    ['gift', 6.61, -33.9], ['gift', 12.39, -25.91], ['gift', -41.42, -6.35],
    ['gift', 43.32, 0.97], ['gift', -20.65, 9.4], ['snowman', -15.87, -43.84],
    ['snowman', 45.54, -2.38], ['snowman', -41.2, -37.06], ['snowman', 59.44, 17.78],
    ['snowman', 21.18, 39.11], ['snowman', 5.22, 57.8], ['snowman', -4.21, -29.06],
    ['snowman', -34.42, 31.52], ['snowman', 6.66, 51.99], ['snowman', 49.82, 29.76],
    ['snowman', 1.03, 57.16], ['snowman', -11.79, 29.01], ['snowman', -53.67, 19.64],
    ['snowman', 36.32, -37.14], ['snowman', -45.28, 30.24], ['snowman', -37.97, -7.38],
    ['snowman', 4.89, -21.43], ['snowman', -32.9, 40.56], ['snowman', 26.68, 40.14],
    ['snowman', 7.94, -45.52], ['snowman', -42.05, 38.46], ['snowman', 43.04, -31.76],
    ['snowman', -33.5, -34.16], ['snowman', 14.78, 54.98], ['snowman', -28.28, 35.59],
    ['snowman', 12.17, 31.49], ['snowman', 15.21, -33.15], ['snowman', -18.99, -45],
    ['snowman', 41.78, -13.53], ['snowman', 14.31, -37.96], ['snowman', 52.01, 4.97],
    ['snowman', 58.67, 1.34], ['snowman', -13.8, -30.56], ['snowman', 53.13, 26.89],
    ['snowman', 43.72, -35.85], ['snowman', -23.4, -21.48], ['snowman', -19.87, 26.16],
    ['snowman', -39.41, -45.19], ['snowman', 19.34, 51.97], ['snowman', 14.05, -23.54],
    ['snowman', 18.21, 28.74], ['snowman', 14.5, 40.91], ['snowman', 15.73, 37.37],
    ['snowman', -38.97, -48.69], ['snowman', -24.36, 3.28], ['snowman', -39.58, 6.87],
    ['snowman', 18.3, -28.43], ['snowman', -19.81, 15.66], ['snowman', -46.89, 19.12],
    ['snowman', -33.03, -46.8], ['snowman', -44.3, -27.74], ['snowman', -45.83, 23.63],
    ['snowman', -32.7, 15.48], ['snowman', -18.58, 49.78], ['snowman', -46.33, 33.69],
    ['snowman', -9.19, 32.12], ['snowman', 29.1, -52.42], ['snowman', -55.45, -29.68],
    ['snowman', 43.1, -22.15], ['snowman', -25.71, -38.44], ['snowman', 41.74, -29.45],
    ['snowman', 20.45, -19.12], ['snowman', -46.48, 10.34], ['snowman', -25.29, 34.42],
    ['snowman', 6.61, -27.36], ['snowman', -15.49, 5.26], ['snowman', 41.62, 21.59],
    ['snowman', 46.77, 29.72], ['snowman', -29.28, -50.6], ['snowman', 49.78, -8.22],
    ['snowman', -44.79, 40.76], ['snowman', 16.1, -30.88], ['snowman', -27.94, -47.51],
    ['snowman', -15.58, 26.12], ['snowman', 29.28, 40.67], ['snowman', 32.61, -25.18],
    ['snowman', 46.23, 34.61], ['snowman', -26.68, -24.65], ['snowman', -8.08, -38.62],
    ['snowman', -31.89, -23.29],
  ];
  PROPS.forEach(Object.freeze);
  Object.freeze(PROPS);
  const LANDMARKS = PROPS.filter(([kind]) => kind === 'house' || kind === 'palace');

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function round(value, precision) {
    return Math.round(value * precision) / precision;
  }

  class Ball {
    constructor(slot, equipped = 0) {
      this.slot = slot;
      this.equipped = equipped;
      this.x = slot === 0 ? -6 : 6;
      this.z = 41;
      this.angle = -Math.PI / 2;
      this.speed = 0;
      this.mass = 12;
      this.energy = 100;
      this.collected = 0;
      this.peak = 12;
      this.active = 0;
      this.objects = {deer: 0, tree: 0, house: 0};
      this.dx = 0;
      this.dz = 0;
      this.boost = 0;
      this.immune = 0;
      this.dodgeCooldown = 0;
      this.lastInput = 0;
    }

    get radius() {
      return .8 * (this.mass / 12) ** (1 / 3);
    }

    clampToField() {
      const limit = 68 - this.radius, distance = Math.hypot(this.x, this.z);
      if (distance > limit) {
        this.x *= limit / distance;
        this.z *= limit / distance;
      }
    }

    move(dt, time) {
      if (time - this.lastInput > 1) {
        this.dx = 0;
        this.dz = 0;
      }
      const power = Math.min(1, Math.hypot(this.dx, this.dz));
      const radius = this.radius;
      const cruise = 7.6 + Math.min(radius, 4) * 2 + clamp(radius - 4, 0, 5) * 1.2;
      const target = this.boost > 0 ? 24 : power * cruise;
      this.speed += clamp(target - this.speed, -22 * dt, (this.boost > 0 ? 90 : 15) * dt);
      if (power > .02) {
        const desired = Math.atan2(this.dz, this.dx);
        const delta = (((desired - this.angle + Math.PI) % TAU) + TAU) % TAU - Math.PI;
        const turn = 5.6 / (1 + (this.speed / 9) ** 2) * dt;
        this.angle += clamp(delta, -turn, turn);
      }
      this.x += Math.cos(this.angle) * this.speed * dt;
      this.z += Math.sin(this.angle) * this.speed * dt;
      this.mass = Math.min(12000, this.mass + this.speed * dt * (.16 + .018 * Math.sqrt(this.mass)));
      this.dodgeCooldown = Math.max(0, this.dodgeCooldown - dt);
      this.energy = 100 * (1 - this.dodgeCooldown / 3);
      this.boost = Math.max(0, this.boost - dt);
      this.immune = Math.max(0, this.immune - dt);
      this.clampToField();
      return power > .02;
    }

    dodge() {
      if (this.dodgeCooldown > 0) return;
      if (Math.hypot(this.dx, this.dz) > .1) this.angle = Math.atan2(this.dz, this.dx);
      this.boost = .32;
      this.immune = Math.max(this.immune, .45);
      this.dodgeCooldown = 3;
      this.energy = 0;
    }

    state() {
      return [this.x, this.z, this.angle, this.speed, this.mass, this.energy, this.boost, this.immune, this.collected]
        .map(value => round(value, 1000));
    }
  }

  let runSequence = 0;
  function makeRunId() {
    runSequence += 1;
    return Date.now().toString(36) + '-' + runSequence.toString(36) + '-' + Math.random().toString(36).slice(2);
  }

  return function createSnowRace(requestedMode = 'quick', tutorial = false, equipped = 0) {
    tutorial = Boolean(tutorial);
    const mode = !tutorial && requestedMode === 'endless' ? 'endless' : 'quick';
    const run = makeRunId();
    const removed = new Map();
    const wins = [0, 0];
    let balls = [new Ball(0, equipped), new Ball(1)];
    let phase = 'playing', reason = '', time = 0, contacts = 0;
    let segment = 0, segmentWinner = null, botTarget = null, priorActive = 0;

    function threshold() {
      return mode === 'quick' ? 120 : Math.min(600, 180 + segment * 40);
    }

    function botRestricted(ball) {
      return tutorial && ball.slot === 1 && time < TUTORIAL_HEADSTART;
    }

    function snapshot() {
      return {
        type: 'state', phase, reason, time: round(time, 100), contacts,
        balls: balls.map(ball => ball.state()), hidden: Array.from(removed.keys()), present: [true, true],
        gear: balls.map(ball => ball.equipped), mode, private: tutorial, tutorial,
        room: '', host: 0, wins: wins.slice(), segment, goal: threshold(), winner: segmentWinner
      };
    }

    function input(x, z, dodge = false) {
      if (phase !== 'playing' || segmentWinner !== null ||
          !Number.isFinite(x) || !Number.isFinite(z) || Math.abs(x) > 1 || Math.abs(z) > 1) return;
      const player = balls[0];
      player.dx = x;
      player.dz = z;
      player.lastInput = time;
      if (dodge === true) player.dodge();
    }

    function nearestCollectible(ball) {
      let target = 0, distance = Infinity;
      for (let index = 1; index < PROPS.length; index++) {
        const [kind, x, z] = PROPS[index];
        if (removed.has(index) || RULES[kind][0] > ball.mass) continue;
        const candidate = Math.hypot(ball.x - x, ball.z - z);
        if (candidate < distance) {
          target = index;
          distance = candidate;
        }
      }
      return target;
    }

    function steerBot() {
      const ball = balls[1];
      const goal = botRestricted(ball) ? Infinity : threshold();
      if (botTarget === null || removed.has(botTarget) || ball.mass >= goal) {
        botTarget = ball.mass >= goal && !removed.has(0) ? 0 : nearestCollectible(ball);
      }
      const [, x, z] = PROPS[botTarget];
      const dx = x - ball.x, dz = z - ball.z;
      const length = Math.max(.01, Math.hypot(dx, dz));
      let ux = dx / length, uz = dz / length;
      for (const [kind, px, pz] of LANDMARKS) {
        const weightGate = kind === 'palace' ? goal : RULES[kind][0];
        if (weightGate <= ball.mass) continue;
        const ox = px - ball.x, oz = pz - ball.z;
        const ahead = ox * ux + oz * uz, side = ox * uz - oz * ux;
        const clearance = RULES[kind][2] + ball.radius + 1;
        if (ahead > 0 && ahead < clearance + 3 && Math.abs(side) < clearance) {
          const sign = side >= 0 ? 1 : -1;
          [ux, uz] = [-uz * sign, ux * sign];
          break;
        }
      }
      ball.dx = ux;
      ball.dz = uz;
      ball.lastInput = time;
    }

    function respawnProps() {
      for (const [index, due] of removed) {
        if (due > time) continue;
        const [kind, x, z] = PROPS[index];
        const radius = RULES[kind][2];
        if (balls.every(ball => Math.hypot(ball.x - x, ball.z - z) > radius + ball.radius + 1)) {
          removed.delete(index);
        }
      }
    }

    function rollBall(ball, dt) {
      const oldX = ball.x, oldZ = ball.z;
      const hasInput = ball.move(dt, time);
      ball.peak = Math.max(ball.peak, ball.mass);
      let won = false, radius = ball.radius;
      for (let index = 0; index < PROPS.length; index++) {
        if (removed.has(index)) continue;
        const [kind, x, z] = PROPS[index];
        const [weight, gain, objectRadius, delay] = RULES[kind];
        const dx = ball.x - x, dz = ball.z - z;
        const distance = Math.hypot(dx, dz);
        if (distance >= objectRadius + radius) continue;
        const weightGate = kind === 'palace' ? (botRestricted(ball) ? Infinity : threshold()) : weight;
        if (ball.mass >= weightGate) {
          const scale = weightGate > 12 ? Math.max(1, (ball.mass / weightGate) ** .72) : (12 / ball.mass) ** .45;
          ball.collected += 1;
          ball.mass = Math.min(12000, ball.mass + gain * scale);
          ball.peak = Math.max(ball.peak, ball.mass);
          radius = ball.radius;
          if (Object.prototype.hasOwnProperty.call(ball.objects, kind)) ball.objects[kind] += 1;
          removed.set(index, time + delay);
          if (kind === 'palace') won = true;
        } else {
          const nx = distance ? dx / distance : 1;
          const nz = distance ? dz / distance : 0;
          ball.x = x + nx * (objectRadius + radius + .01);
          ball.z = z + nz * (objectRadius + radius + .01);
          if (Math.cos(ball.angle) * nx + Math.sin(ball.angle) * nz < -.2) ball.speed *= .75;
        }
      }
      ball.clampToField();
      if (ball.slot === 0 && hasInput) {
        const traveled = (ball.x - oldX) * Math.cos(ball.angle) + (ball.z - oldZ) * Math.sin(ball.angle);
        if (traveled > .002) ball.active += dt;
      }
      return won;
    }

    function collideBalls() {
      const [a, b] = balls;
      const dx = b.x - a.x, dz = b.z - a.z;
      const distance = Math.hypot(dx, dz), radius = a.radius + b.radius;
      if (distance >= radius) return;
      const nx = distance ? dx / distance : 1;
      const nz = distance ? dz / distance : 0;
      const gap = (radius - distance + .02) / 2;
      a.x -= nx * gap;
      a.z -= nz * gap;
      b.x += nx * gap;
      b.z += nz * gap;
      const [big, small] = a.mass >= b.mass ? [a, b] : [b, a];
      if (Math.max(a.immune, b.immune) === 0 && big.mass > 1.3 * small.mass && !botRestricted(big)) {
        const lost = Math.min(small.mass - 12, small.mass * .32);
        small.mass -= lost;
        big.mass += lost;
        big.peak = Math.max(big.peak, big.mass);
        const side = small === b ? 1 : -1;
        small.x += side * nx * 3;
        small.z += side * nz * 3;
        small.immune = 3;
        contacts += 1;
      }
      a.clampToField();
      b.clampToField();
    }

    function step(dt) {
      if (phase !== 'playing' || segmentWinner !== null || !Number.isFinite(dt) || dt <= 0) return null;
      time += dt;
      steerBot();
      respawnProps();
      for (const ball of balls) {
        if (rollBall(ball, dt)) segmentWinner = ball.slot;
      }
      if (segmentWinner === null) {
        collideBalls();
      } else {
        wins[segmentWinner] += 1;
        reason = (segmentWinner + 1) + ' 号雪球夺下大冰雕';
        if (mode === 'quick') phase = 'ended';
      }
      return segmentWinner;
    }

    function settlement(reason) {
      const player = balls[0];
      return {
        run, segment: segment + 1, mode, reason, peak: player.peak,
        active: player.active, runActive: priorActive + player.active, props: {...player.objects}, tutorial
      };
    }

    function nextSegment() {
      if (mode !== 'endless' || segmentWinner === null) return false;
      priorActive += balls[0].active;
      segment += 1;
      segmentWinner = null;
      botTarget = null;
      balls = balls.map(ball => new Ball(ball.slot, ball.equipped));
      removed.clear();
      removed.set(0, time + 2);
      return true;
    }

    return {props: PROPS, snapshot, input, step, settlement, nextSegment};
  };
})();

if (typeof module !== 'undefined') module.exports = createSnowRace;
