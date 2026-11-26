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
  const PARTICIPANTS = 16;
  const CRUSH_RATIO = 1.3;
  const CRUSH_LIMIT = 2;
  const REVIVE_LIMIT = 2;
  const REVIVE_PROTECTION = 4;
  const PURSUIT_RADIUS = 41;

  const village=typeof module==='undefined'?SnowVillage:require('./village.js');
  const PROPS=village.layout(),cells=new Map();
  const LANDMARKS=PROPS.filter(([kind])=>kind==='house'||kind==='palace'||kind==='tower');
  PROPS.forEach(([,x,z],index)=>{
    const key=Math.floor(x/18)+','+Math.floor(z/18);
    if(!cells.has(key))cells.set(key,[]);
    cells.get(key).push(index);
  });
  function around(ball, radius = ball.radius + 12){
    const result=[];
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
      const startAngle = slot * TAU / PARTICIPANTS;
      // 保留一只近处对手，其余参赛者分布在村外围。
      this.x = slot === 1 ? 13 : Math.sin(startAngle) * (village.spawnRadius - 4);
      this.z = slot < 2 ? village.spawnRadius : Math.cos(startAngle) * (village.spawnRadius - 4);
      this.angle = Math.atan2(-this.z, -this.x);
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
      this.target = null;
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

  return function createSnowRace(requestedMode = 'quick', tutorial = false, equipped = 0, opponentGear = []) {
    tutorial = Boolean(tutorial);
    const mode = !tutorial && requestedMode === 'endless' ? 'endless' : 'quick';
    const run = makeRunId();
    const removed = new Map();
    const wins = Array(PARTICIPANTS).fill(0);
    let balls = Array.from({length: PARTICIPANTS}, (_, slot) =>
      new Ball(slot, slot === 0 ? equipped : opponentGear[slot - 1] || 0));
    let phase = 'playing', reason = '', time = 0, contacts = 0;
    let segment = 0, segmentWinner = null, priorActive = 0;
    let crushes = 0, revives = 0, defeatCount = 0, defeatId = null;

    function threshold() {
      return mode === 'quick' ? 120 : Math.min(600, 180 + segment * 40);
    }

    function botRestricted(ball) {
      return tutorial && ball.slot !== 0 && time < TUTORIAL_HEADSTART;
    }

    function canRevive() {
      return defeatId !== null && revives < REVIVE_LIMIT;
    }

    function snapshot() {
      const ranking = balls.slice().sort((a, b) => b.mass - a.mass || a.slot - b.slot)
        .map((ball, index) => ({
          slot: ball.slot, rank: index + 1, mass: round(ball.mass, 1000), gear: ball.equipped
        }));
      return {
        type: 'state', phase, reason, time: round(time, 100), contacts,
        balls: balls.map(ball => ball.state()), hidden: Array.from(removed.keys()), present: balls.map(() => true),
        gear: balls.map(ball => ball.equipped), mode, private: tutorial, tutorial,
        room: '', host: 0, wins: wins.slice(), segment, goal: threshold(), winner: segmentWinner,
        ranking, participantCount: balls.length, crushes, revives, canRevive: canRevive(),
        defeatedByCrush: defeatId !== null, defeatId
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
      for (const radius of [24, 64, Infinity]) {
        let target = null, distance = radius * radius;
        const candidates = Number.isFinite(radius) ? around(ball, radius) : PROPS.keys();
        for (const index of candidates) {
          if (index === 0 || removed.has(index)) continue;
          const [kind, x, z] = PROPS[index];
          if (RULES[kind][0] > ball.mass) continue;
          const candidate = (ball.x - x) ** 2 + (ball.z - z) ** 2;
          if (candidate < distance || (candidate === distance && index < target)) {
            target = index;
            distance = candidate;
          }
        }
        if (target !== null) return target;
      }
      return 0;
    }

    function choosePrey(ball) {
      if (ball.immune > 0 || botRestricted(ball)) return null;
      let target = null, best = Infinity;
      for (const rival of balls) {
        if (ball === rival || rival.immune > 0 || ball.mass <= CRUSH_RATIO * rival.mass) continue;
        // 战局模型按半径显示体型。碰撞规则与主动选敌分别判断。
        if (rival.slot === 0 && ball.radius <= rival.radius * 1.20 + 1e-9) continue;
        const distance = (ball.x - rival.x) ** 2 + (ball.z - rival.z) ** 2;
        if (distance > PURSUIT_RADIUS ** 2) continue;
        const score = distance / Math.min(1.7, ball.mass / rival.mass);
        if (score < best) {
          target = rival;
          best = score;
        }
      }
      return target;
    }

    function aimBot(ball, x, z, goal, pursuit) {
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
      const alignment = Math.cos(ball.angle) * ux + Math.sin(ball.angle) * uz;
      const power = pursuit && length < 13 ? clamp(.55 + alignment * .55, .32, 1) : 1;
      ball.dx = ux * power;
      ball.dz = uz * power;
      ball.lastInput = time;
    }

    function steerBot(ball) {
      const goal = botRestricted(ball) ? Infinity : threshold();
      const canClaim = ball.mass >= goal && !removed.has(0);
      const nearSculpture = ball.x ** 2 + ball.z ** 2 < 32 ** 2;
      const prey = canClaim && nearSculpture ? null : choosePrey(ball);
      if (prey) {
        const lead = Math.min(.55, Math.hypot(ball.x - prey.x, ball.z - prey.z) / 22);
        aimBot(ball, prey.x + Math.cos(prey.angle) * prey.speed * lead,
          prey.z + Math.sin(prey.angle) * prey.speed * lead, goal, true);
        return;
      }
      if (canClaim) ball.target = 0;
      else if (ball.target === null || ball.target === 0 || removed.has(ball.target)) {
        ball.target = nearestCollectible(ball);
      }
      const [, x, z] = PROPS[ball.target];
      aimBot(ball, x, z, goal, false);
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

    function collidePair(a, b) {
      const dx = b.x - a.x, dz = b.z - a.z;
      const radius = a.radius + b.radius, distanceSq = dx * dx + dz * dz;
      if (distanceSq >= radius * radius) return null;
      const distance = Math.sqrt(distanceSq);
      const nx = distance ? dx / distance : 1;
      const nz = distance ? dz / distance : 0;
      const gap = (radius - distance + .02) / 2;
      a.x -= nx * gap;
      a.z -= nz * gap;
      b.x += nx * gap;
      b.z += nz * gap;
      const [big, small] = a.mass >= b.mass ? [a, b] : [b, a];
      let defeatsPlayer = false;
      if (Math.max(a.immune, b.immune) === 0 && big.mass > CRUSH_RATIO * small.mass && !botRestricted(big)) {
        // 撞到重量下限的雪球也算一次碾压，仍给它推开和免伤时间。
        const lost = Math.min(small.mass - 12, small.mass * .32);
        small.mass -= lost;
        big.mass += lost;
        big.peak = Math.max(big.peak, big.mass);
        const side = small === b ? 1 : -1;
        small.x += side * nx * 3;
        small.z += side * nz * 3;
        small.immune = 3;
        if (a.slot === 0 || b.slot === 0) contacts += 1;
        if (small.slot === 0) {
          crushes += 1;
          defeatsPlayer = crushes >= CRUSH_LIMIT;
        }
      }
      a.clampToField();
      b.clampToField();
      return defeatsPlayer ? big.slot : null;
    }

    function collideBalls() {
      for (let i = 0; i < balls.length - 1; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          const crusher = collidePair(balls[i], balls[j]);
          if (crusher !== null) return crusher;
        }
      }
      return null;
    }

    function step(dt) {
      if (phase !== 'playing' || segmentWinner !== null || !Number.isFinite(dt) || dt <= 0) return null;
      time += dt;
      for (let slot = 1; slot < balls.length; slot++) steerBot(balls[slot]);
      respawnProps();
      for (const ball of balls) {
        if (rollBall(ball, dt)) segmentWinner = ball.slot;
      }
      if (segmentWinner === null) {
        const crusher = collideBalls();
        if (crusher !== null) {
          defeatId = ++defeatCount;
          segmentWinner = crusher;
          reason = '你被碾压了两次';
          phase = 'ended';
        }
      } else {
        wins[segmentWinner] += 1;
        reason = (segmentWinner + 1) + ' 号雪球夺下大冰雕';
        if (mode === 'quick') phase = 'ended';
      }
      return segmentWinner;
    }

    function revive(expectedDefeatId = defeatId) {
      if (!canRevive() || expectedDefeatId !== defeatId) return false;
      const old = balls[0], player = new Ball(0, old.equipped);
      player.active = old.active;
      player.peak = old.peak;
      player.objects = old.objects;
      player.collected = old.collected;
      player.immune = REVIVE_PROTECTION;
      balls[0] = player;
      revives += 1;
      crushes = 0;
      defeatId = null;
      segmentWinner = null;
      phase = 'playing';
      reason = '';
      return true;
    }

    function settlement(reason) {
      const player = balls[0];
      return {
        run, segment: segment + 1, mode, reason, peak: player.peak,
        active: player.active, runActive: priorActive + player.active, props: {...player.objects}, tutorial
      };
    }

    function nextSegment() {
      if (mode !== 'endless' || phase !== 'playing' || segmentWinner === null) return false;
      priorActive += balls[0].active;
      segment += 1;
      segmentWinner = null;
      balls = balls.map(ball => new Ball(ball.slot, ball.equipped));
      removed.clear();
      removed.set(0, time + 2);
      return true;
    }

    return {props: PROPS, snapshot, input, step, settlement, nextSegment, revive};
  };
})();

if (typeof module !== 'undefined') module.exports = createSnowRace;
