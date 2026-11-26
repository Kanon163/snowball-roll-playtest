var createSnowRace = (() => {
  const RULES = {
    gift: [12, 3.3, .65, 8],
    snowman: [12, 4, .7, 9],
    fence: [30, 8, 1.3, 12],
    deer: [28, 9, 1.1, 15],
    tree: [45, 14, 1.4, 18],
    house: [85, 26, 4.2, 24],
    lamp: [30,10,.5,13], nutcracker: [60,16,1.1,20], tower: [110,32,2.9,30],
    palace: [120, 0, 11, 10]
  };
  const TUTORIAL_HEADSTART = 45;
  const TAU = Math.PI * 2;

  const village=typeof module==='undefined'?SnowVillage:require('./village.js');
  const PROPS=village.layout(),cells=new Map();
  const LANDMARKS=PROPS.filter(([kind])=>kind==='house'||kind==='palace'||kind==='tower');
  PROPS.forEach(([,x,z],index)=>{
    const key=Math.floor(x/18)+','+Math.floor(z/18);
    if(!cells.has(key))cells.set(key,[]);
    cells.get(key).push(index);
  });
  function around(ball){
    const radius=ball.radius+12, result=[];
    for(let x=Math.floor((ball.x-radius)/18);x<=Math.floor((ball.x+radius)/18);x++)
      for(let z=Math.floor((ball.z-radius)/18);z<=Math.floor((ball.z+radius)/18);z++){
        const list=cells.get(x+','+z);if(list)result.push(...list);
      }
    return result;
  }
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
      this.x = slot === 0 ? 0 : 13;
      this.z = village.spawnRadius;
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
      const limit = village.radius - this.radius, distance = Math.hypot(this.x, this.z);
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
      for (const index of around(ball)) {
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

