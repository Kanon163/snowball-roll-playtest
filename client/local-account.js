const LOCAL_WEIGHT_BANDS = [[12, 0], [30, 4], [60, 7], [120, 11], [300, 16],
  [600, 22], [1500, 29], [3000, 37], [6000, 46], [12000, 56]];
const LOCAL_DAILY_TASKS = [
  {id: 'deer', title: '单局撞破 5 个冰雕小鹿', target: 5, reward: 10},
  {id: 'tree', title: '单局撞破 3 棵圣诞树', target: 3, reward: 12},
  {id: 'house', title: '单局撞破 2 间房屋', target: 2, reward: 15}
];
const LOCAL_ROUND_TASKS = [
  {id: 'rounds_3', title: '累计完成 3 局', target: 3, reward: 15},
  {id: 'rounds_10', title: '累计完成 10 局', target: 10, reward: 35},
  {id: 'rounds_30', title: '累计完成 30 局', target: 30, reward: 70}
];
const LOCAL_ENDLESS_TASK = {id: 'endless_20min', title: '单局坚持 20 分钟', target: 1200, reward: 40};
const LOCAL_CONTINUING = ['win', 'segment_end'];
const LOCAL_ABANDONED = ['leave', 'disconnected'];
const LOCAL_FINISH = ['win', 'finish', 'defeat'];
const LOCAL_REASONS = LOCAL_CONTINUING.concat(LOCAL_ABANDONED, 'finish', 'defeat', 'cancelled');
const LOCAL_SIGN_REWARD = 8;
const LOCAL_SIGN_CYCLE = 7;
const LOCAL_SIGN_BONUS = 16;
const LOCAL_TIME_EPSILON = 1e-7;

function localAccountNewStore() {
  return {version: 1, balance: 0, owned: [0], equipped: 0, rounds: 0, tutorialDone: false,
    bestPeak: 0, bestEndless: 0, signCount: 0, signDay: '', daily: {}, runs: {}};
}

function localAccountCopy(value) {
  return JSON.parse(JSON.stringify(value));
}

function localAccountObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function localBeijingDay(now) {
  return new Date(+now + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function localTaskStatus(task, period, progress) {
  return {...task, period, progress: Math.min(Math.floor(progress), task.target), completed: progress >= task.target};
}

function localTaskAward({id, title, reward}) {
  return {id, title, reward};
}

function localAccountSnapshot(store, day) {
  const daily = store.daily[day] || {};
  const tasks = LOCAL_DAILY_TASKS.map(task => localTaskStatus(task, 'daily', daily[task.id] || 0));
  for (const task of LOCAL_ROUND_TASKS) tasks.push(localTaskStatus(task, 'lifetime', store.rounds));
  tasks.push(localTaskStatus(LOCAL_ENDLESS_TASK, 'lifetime', store.bestEndless));
  return {id: 1, balance: store.balance, owned: store.owned.slice(), equipped: store.equipped,
    total_rounds: store.rounds, tutorial_done: store.tutorialDone, best_peak_kg: store.bestPeak,
    sign_in: {day, signed_today: store.signDay === day, total_days: store.signCount,
      next_bonus_in: LOCAL_SIGN_CYCLE - store.signCount % LOCAL_SIGN_CYCLE, reward: LOCAL_SIGN_REWARD,
      bonus_every: LOCAL_SIGN_CYCLE, bonus_reward: LOCAL_SIGN_BONUS}, tasks};
}

function localWeightPoints(weight) {
  for (let i = LOCAL_WEIGHT_BANDS.length - 1; i >= 0; i--) {
    if (weight >= LOCAL_WEIGHT_BANDS[i][0]) return LOCAL_WEIGHT_BANDS[i][1];
  }
  return 0;
}

function localPropCount(props, id) {
  return Object.prototype.hasOwnProperty.call(props, id) ? props[id] : 0;
}

function localValidateSettlement({run, segment, mode, reason, active, runActive, peak, start, props, tutorial}) {
  const values = [active, runActive, peak, start];
  const countersValid = localAccountObject(props) && LOCAL_DAILY_TASKS.every(({id}) => {
    const count = localPropCount(props, id);
    return Number.isInteger(count) && count >= 0 && count < 2 ** 31;
  });
  if (typeof run !== 'string' || run.length > 128 || !run.trim() ||
      !Number.isInteger(segment) || segment < 1 || segment >= 2 ** 31 ||
      !['quick', 'endless'].includes(mode) || !LOCAL_REASONS.includes(reason) ||
      typeof tutorial !== 'boolean' || (tutorial && mode !== 'quick') ||
      (mode === 'quick' && (segment !== 1 || reason === 'segment_end')) ||
      values.some(value => !Number.isFinite(value) || value < 0 || value > 1e12) ||
      start < 12 || peak < start || runActive + LOCAL_TIME_EPSILON < active || !countersValid) {
    throw Error('invalid_settlement');
  }
}

function localReward(receipt, store, day, duplicate) {
  return {...receipt, type: 'reward', duplicate, task_awards: receipt.task_awards.map(award => ({...award})),
    account: localAccountSnapshot(store, day)};
}

function localDailyAwards(store, participation, props, day) {
  const earned = [];
  const daily = store.daily[day] || (store.daily[day] = {});
  const paidTasks = participation.taskDays;
  for (const task of LOCAL_DAILY_TASKS) {
    const id = task.id;
    const current = Math.min(task.target, (participation.props[id] || 0) + localPropCount(props, id));
    participation.props[id] = current;
    if (paidTasks.includes(id) || current <= (daily[id] || 0)) continue;
    daily[id] = current;
    if (current === task.target) {
      paidTasks.push(id);
      earned.push(localTaskAward(task));
    }
  }
  return earned;
}

function localItemId(item) {
  if (!Number.isInteger(item) || item < 0 || item > 40) throw Error('invalid_item');
  return item;
}

// load 和 save 同步执行，每次修改一次性保存可序列化的完整账户。
function createLocalAccount({load, save, now = Date.now}, catalog = []) {
  const prices = new Map(catalog.filter(item => Number.isInteger(item.price) && item.price > 0)
    .map(item => [item.id, item.price]));

  function read() {
    const stored = load();
    if (stored == null || stored === '') return localAccountNewStore();
    let state = stored;
    if (typeof stored === 'string') {
      try { state = JSON.parse(stored); } catch (_) { throw Error('invalid_account'); }
    }
    if (!localAccountObject(state) || state.version !== 1) throw Error('invalid_account');
    return state;
  }

  function snapshot() {
    return localAccountSnapshot(read(), localBeijingDay(now()));
  }

  function signin() {
    const day = localBeijingDay(now());
    const state = localAccountCopy(read());
    if (state.signDay < day) {
      state.signDay = day;
      state.signCount++;
      state.balance += LOCAL_SIGN_REWARD + (state.signCount % LOCAL_SIGN_CYCLE ? 0 : LOCAL_SIGN_BONUS);
      save(state);
    }
    return localAccountSnapshot(state, day);
  }

  function purchase(item) {
    const id = localItemId(item);
    const day = localBeijingDay(now());
    const state = localAccountCopy(read());
    if (state.owned.includes(id)) return localAccountSnapshot(state, day);
    const price = prices.get(id);
    if (price === undefined) throw Error('invalid_item');
    if (state.balance < price) throw Error('insufficient_balance');
    state.balance -= price;
    state.owned.push(id);
    state.owned.sort((a, b) => a - b);
    save(state);
    return localAccountSnapshot(state, day);
  }

  function equip(item) {
    const id = localItemId(item);
    const day = localBeijingDay(now());
    const state = localAccountCopy(read());
    if (!state.owned.includes(id)) throw Error('item_not_owned');
    if (state.equipped !== id) {
      state.equipped = id;
      save(state);
    }
    return localAccountSnapshot(state, day);
  }

  function settle(input) {
    if (!localAccountObject(input)) throw Error('invalid_settlement');
    const {run, segment, mode, reason, active, runActive, peak, start = 12, props = {}, tutorial = false} = input;
    localValidateSettlement({run, segment, mode, reason, active, runActive, peak, start, props, tutorial});
    const day = localBeijingDay(now());
    const saved = read();
    const key = 'run:' + run;
    const previous = saved.runs[key];
    const replay = previous && previous.segments[segment - 1];
    if (replay) return localReward(replay, saved, day, true);
    if (tutorial && saved.tutorialDone) throw Error('tutorial_done');
    if (segment !== (previous ? previous.segments.length : 0) + 1) throw Error('segment_out_of_order');
    if (previous && previous.closed) throw Error('run_closed');
    if ((previous && (previous.mode !== mode || previous.tutorial !== tutorial)) ||
        Math.abs(runActive - ((previous ? previous.active : 0) + active)) > LOCAL_TIME_EPSILON) {
      throw Error('invalid_settlement');
    }

    const state = localAccountCopy(saved);
    const participation = state.runs[key] || (state.runs[key] = {mode, tutorial, active: 0, counted: false,
      points: 0, taskPoints: 0, peak: 0, props: {}, taskDays: [], segments: []});
    const abandoned = LOCAL_ABANDONED.includes(reason);
    const eligible = !tutorial && reason !== 'cancelled' && (mode === 'endless' || !abandoned) && peak >= 30 &&
      active + LOCAL_TIME_EPSILON >= (abandoned ? 20 : 5);
    const participationPoints = eligible ? (mode === 'quick' ? 4 : 2) : 0;
    const weightPoints = eligible ? localWeightPoints(peak) - (mode === 'endless' ? localWeightPoints(start) : 0) : 0;
    const awarded = weightPoints + participationPoints;
    const countedRound = eligible && !participation.counted;
    const taskAwards = eligible ? localDailyAwards(state, participation, props, day) : [];

    if (countedRound) {
      participation.counted = true;
      state.rounds++;
      for (const task of LOCAL_ROUND_TASKS) {
        if (state.rounds === task.target) taskAwards.push(localTaskAward(task));
      }
    }
    if (mode === 'endless' && participation.counted && reason !== 'cancelled') {
      const goal = LOCAL_ENDLESS_TASK.target;
      const duration = runActive + LOCAL_TIME_EPSILON >= goal ? goal : runActive;
      if (state.bestEndless < goal && duration === goal) taskAwards.push(localTaskAward(LOCAL_ENDLESS_TASK));
      state.bestEndless = Math.max(state.bestEndless, duration);
    }
    if (eligible) state.bestPeak = Math.max(state.bestPeak, peak);
    if (tutorial && LOCAL_FINISH.includes(reason)) state.tutorialDone = true;

    const taskPoints = taskAwards.reduce((sum, task) => sum + task.reward, 0);
    state.balance += awarded + taskPoints;
    participation.active = runActive;
    participation.closed = mode === 'quick' || !LOCAL_CONTINUING.includes(reason);
    participation.peak = Math.max(participation.peak, peak);
    participation.points += awarded;
    participation.taskPoints += taskPoints;
    const receipt = {run_id: run, segment, reason, peak: Math.round(peak), peak_kg: peak,
      run_peak_kg: participation.peak, awarded, participation_points: participationPoints,
      weight_points: weightPoints, task_awards: taskAwards, counted_round: countedRound, eligible,
      run_awarded: participation.points, run_task_awarded: participation.taskPoints};
    participation.segments.push(receipt);
    save(state);
    return localReward(receipt, state, day, false);
  }

  return {snapshot, signin, purchase, equip, settle};
}

function localAccountSelftest() {
  function check(condition, name) {
    if (!condition) throw Error('local-account: ' + name);
  }
  function expectError(action, code) {
    let actual;
    try { action(); } catch (error) { actual = error.message; }
    check(actual === code, 'expected ' + code + ', got ' + actual);
  }

  let saved;
  let timestamp = Date.UTC(2026, 10, 25, 15, 59);
  let cannotSave = false;
  const storage = {load: () => saved, save(value) {
    if (cannotSave) throw Error('save failed');
    saved = JSON.stringify(value);
  }, now: () => timestamp};
  const catalog = [{id: 1, price: 30}, {id: 40, price: 560}];
  let account = createLocalAccount(storage, catalog);
  check(account.snapshot().owned.join() === '0' && account.snapshot().best_peak_kg === 0, 'fresh snapshot');
  expectError(() => account.purchase(1), 'insufficient_balance');
  expectError(() => account.purchase(99), 'invalid_item');
  expectError(() => account.equip(1), 'item_not_owned');
  check(account.signin().balance === 8 && account.signin().balance === 8, 'daily sign-in idempotency');
  timestamp += 60 * 1000;
  check(account.signin().balance === 16, 'Beijing midnight');
  for (let i = 0; i < 5; i++) {
    timestamp += (i === 0 ? 2 : 1) * 86400000;
    account.signin();
  }
  check(account.snapshot().balance === 72 && account.snapshot().sign_in.total_days === 7, 'cumulative sign-in bonus');
  check(account.purchase(1).balance === 42 && account.purchase(1).balance === 42, 'purchase idempotency');
  check(account.equip(1).equipped === 1 && account.equip(0).equipped === 0, 'equip and restore');
  account.equip(1);

  const round = {segment: 1, mode: 'quick', reason: 'finish', active: 5, runActive: 5, peak: 318.75};
  const tutorial = {...round, tutorial: true, props: {deer: 5}};
  const early = account.settle({...tutorial, run: 'early', reason: 'leave'});
  check(!early.account.tutorial_done && early.account.best_peak_kg === 0, 'early tutorial exit');
  const trained = account.settle({...tutorial, run: 'tutorial'});
  check(trained.account.tutorial_done && trained.awarded === 0 && !trained.task_awards.length &&
    !trained.account.total_rounds && trained.account.best_peak_kg === 0, 'unrewarded training completion');
  expectError(() => account.settle({...tutorial, run: 'tutorial-again'}), 'tutorial_done');
  const quit = account.settle({...round, run: 'quick-leave', reason: 'leave', peak: 900});
  check(quit.awarded === 0 && !quit.counted_round && quit.account.best_peak_kg === 0, 'quick abandonment');
  const quick = account.settle({...round, reason: 'defeat', run: '__proto__'});
  check(quick.awarded === 20 && quick.counted_round && quick.peak === 319 && quick.account.best_peak_kg === 318.75,
    'quick defeat uses exact peak');

  const endless = {run: 'endless', mode: 'endless', reason: 'win', segment: 1, active: 1199, runActive: 1199,
    peak: 12000, props: {tree: 2, deer: 5}};
  expectError(() => account.settle({...endless, segment: 2}), 'segment_out_of_order');
  const first = account.settle(endless);
  check(first.awarded === 58 && first.counted_round && first.task_awards[0].id === 'deer', 'first endless segment');
  const continued = {...endless, reason: 'segment_end', segment: 2, active: 1 - 1e-9, runActive: 1200 - 1e-9,
    peak: 61, props: {tree: 1}};
  const second = account.settle(continued);
  check(second.awarded === 0 && !second.counted_round && second.task_awards[0].id === 'endless_20min',
    'valid run reaches duration on short segment');
  const third = account.settle({...continued, reason: 'leave', segment: 3, active: 20, runActive: 1220 - 1e-9,
    peak: 612, props: {tree: 1}});
  check(third.awarded === 24 && third.run_awarded === 82 && third.run_peak_kg === 12000 &&
    third.task_awards[0].id === 'tree' && third.account.total_rounds === 2, 'paid endless leave and carry-over');
  expectError(() => account.settle({...continued, segment: 4}), 'run_closed');

  const durableSnapshot = JSON.stringify(account.snapshot());
  account = createLocalAccount(storage, catalog);
  check(JSON.stringify(account.snapshot()) === durableSnapshot && account.snapshot().equipped === 1,
    'tutorial, wallet, outfit and record survive restart');
  timestamp += 86400000;
  const replay = account.settle(endless);
  check(replay.duplicate && replay.awarded === first.awarded && replay.account.balance === third.account.balance &&
    replay.account.tasks[0].progress === 0, 'durable replay uses current account day and balance');
  cannotSave = true;
  expectError(() => account.settle({...round, run: 'retry'}), 'save failed');
  check(account.snapshot().total_rounds === 2, 'storage failure does not apply balance or progress');
  cannotSave = false;
  const retried = account.settle({...round, run: 'retry'});
  check(retried.task_awards[0].id === 'rounds_3' && retried.account.total_rounds === 3, 'retry and lifetime round task');
  return true;
}

createLocalAccount.selftest = localAccountSelftest;
if (typeof module !== 'undefined') {
  module.exports = createLocalAccount;
  module.exports.createLocalAccount = createLocalAccount;
  if (typeof require === 'function' && require.main === module) {
    localAccountSelftest();
    console.log('local-account 自检通过');
  }
}
