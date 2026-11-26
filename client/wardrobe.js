const collectionInk = {
  title: '#fff2d6',
  text: '#eaf3f8',
  muted: '#b8cfdb',
  gold: '#ffd59b',
  green: '#a9dfbd',
  selected: '#263e4a'
};

const defaultSnowball = {id: 0, name: '默认外观', price: 0};

function drawSnowCollection(ui, view) {
  const account = view.account;
  const titles = {shop: '衣橱', tasks: '任务', checkin: '签到'};
  if (!titles[view.page]) return;

  const pad = Math.max(10, Math.round(ui.w * .022));
  const top = Math.max(48, Math.round(ui.h * .17));
  const bottom = ui.h - pad;
  ui.button('collection-back', '返回', pad, 9, 66, top - 18, () => ui.back());
  ui.text(titles[view.page], pad + 81, top / 2, 23, collectionInk.title, 'left');
  if (account) {
    ui.text('积分  ' + account.balance, (ui.headerRight || ui.w) - pad - 4, top / 2, 17, collectionInk.gold, 'right');
  } else {
    ui.text('账户加载中', (ui.headerRight || ui.w) - pad - 4, top / 2, 13, collectionInk.muted, 'right');
  }

  if (view.page === 'shop') drawCollectionShop(ui, view, pad, top, bottom);
  if (view.page === 'tasks') drawCollectionTasks(ui, account, pad, top, bottom);
  if (view.page === 'checkin') drawCollectionCheckin(ui, account, pad, top, bottom);
}

function drawCollectionShop(ui, view, pad, top, bottom) {
  const catalog = view.catalog || [];
  const selected = catalog.find(item => item.id === view.selected) || {id:0,name:'未佩戴'+view.part,price:0};
  const account = view.account;
  const equipped = account ? account.loadout[view.part] || 0 : 0;
  const owned = new Set(account ? account.owned : [0]);
  owned.add(0);
  const leftWidth = Math.max(150, Math.round(ui.w * .312));
  const rightX = pad + leftWidth + Math.max(12, pad);
  const rightWidth = ui.w - rightX - pad;
  const leftMiddle = pad + leftWidth / 2;
  const actionY = bottom - 38;

  // Keep the left upper area clear for the scene's live model.
  ui.preview(selected.id);
  ui.text(selected.name, leftMiddle, actionY - 49, 22, collectionInk.title, 'center');

  const isEquipped = equipped === selected.id;
  const isOwned = owned.has(selected.id);
  const shortfall = account && !isOwned ? Math.max(0, selected.price - account.balance) : 0;
  let detail = selected.id === 0 ? '空置部位' : view.part;
  if (isEquipped) detail = '当前装备';
  else if (shortfall) detail = '还差 ' + shortfall + ' 积分';
  else if (isOwned) detail = '已拥有 · 试穿中';
  else detail += ' · 试穿中';
  ui.text(detail, leftMiddle, actionY - 24, 13, collectionInk.muted, 'center');

  const actionWidth = Math.floor(leftWidth * .54) - 4;
  const actionLabel = shortfall ? '看广告 +20 分' : isEquipped ? '已装备' : isOwned ? '装备' : '购买 ' + selected.price + ' 分';
  const action = shortfall ? 'reward_ad' : isOwned ? 'equip' : 'buy';
  ui.button('shop-action', actionLabel, pad, actionY, actionWidth, 38,
    () => ui.action(action, selected.id), true, !account || isEquipped);
  const defaultX = pad + actionWidth + 8;
  ui.button('shop-default', equipped ? '卸下本部位' : '取下预览', defaultX, actionY, pad + leftWidth - defaultX, 38,
    () => {
      view.setSelected(0);
      if (equipped) ui.action('equip', 0);
    }, false, !account || (!equipped && selected.id === 0));

  ui.panel(rightX, top, rightWidth, bottom - top);
  const innerX = rightX + 10;
  const innerWidth = rightWidth - 20;
  const gap = 7;
  const columns = innerWidth >= 340 ? 5 : 4;
  const perPage = columns * 2;
  const parts = ['帽子','眼镜','围巾','手臂','披风','嘴部装饰'];
  const entries = catalog.filter(item => item.slot === view.part && (!item.legacy || owned.has(item.id)))
    .sort((a,b) => Number(!!a.starter)-Number(!!b.starter) || a.price - b.price || a.id - b.id);
  const pages = Math.max(1,Math.ceil(entries.length / perPage));
  const page = Math.min(pages - 1, Math.max(0, Math.floor(view.pageIndex || 0)));
  const tabGap = 3, tabWidth = (innerWidth - tabGap * 5) / 6;
  const tabY = top + 8;
  parts.forEach((name,i) => {
    ui.button('shop-slot-'+i, name === '嘴部装饰' ? '嘴饰' : name, innerX+i*(tabWidth+tabGap),tabY,
      tabWidth,34,()=>view.setPart(name),view.part===name);
  });

  const gridY = tabY + 43;
  const navY = bottom - 44;
  const cellWidth = Math.floor((innerWidth - gap * (columns - 1)) / columns);
  const cellHeight = Math.floor((navY - gridY - gap - 7) / 2);
  const items = entries.slice(page * perPage, (page + 1) * perPage);
  if (!items.length) {
    ui.text('暂无外观', rightX + rightWidth / 2, (gridY + navY) / 2, 16, collectionInk.muted, 'center');
  }
  items.forEach((item, index) => {
    const x = innerX + (index % columns) * (cellWidth + gap);
    const y = gridY + Math.floor(index / columns) * (cellHeight + gap);
    const active = selected.id === item.id;
    const title = String(item.name);
    const price = equipped === item.id ? '当前装备' : owned.has(item.id) ? '已拥有' : item.price + ' 积分';
    const nameSize = Math.min(14, Math.floor((cellWidth - 6) / Math.max(1, title.length)));
    ui.button('shop-item-' + item.id, '', x, y, cellWidth, cellHeight,
      () => view.setSelected(item.id), active);
    if(ui.icon)ui.icon(item.id,x+cellWidth/2,y+cellHeight*.29,Math.min(cellWidth*.70,cellHeight*.53));
    ui.text(title, x + cellWidth / 2, y + cellHeight * .64, nameSize,
      active ? collectionInk.selected : collectionInk.text, 'center');
    ui.text(price, x + cellWidth / 2, y + cellHeight * .85, 11,
      active ? collectionInk.selected : collectionInk.gold, 'center');
  });

  const navWidth = Math.min(85, Math.floor((innerWidth - 65) / 2));
  ui.button('shop-prev', '上一页', innerX, navY, navWidth, 34,
    () => view.setPageIndex(page - 1), false, page === 0);
  ui.text((page + 1) + ' / ' + pages, rightX + rightWidth / 2, navY + 17, 13, collectionInk.muted, 'center');
  ui.button('shop-next', '下一页', innerX + innerWidth - navWidth, navY, navWidth, 34,
    () => view.setPageIndex(page + 1), false, page + 1 === pages);
}

function drawCollectionTasks(ui, account, pad, top, bottom) {
  const tasks = account ? account.tasks || [] : [];
  const groups = [
    {period: 'daily', title: '每日任务'},
    {period: 'lifetime', title: '累计挑战'}
  ];
  const width = (ui.w - pad * 3) / 2;
  const rows = Math.max(4, ...groups.map(group => tasks.filter(task => task.period === group.period).length));
  const rowGap = 5;
  const rowStart = top + 33;
  const rowHeight = Math.floor((bottom - rowStart - rowGap * (rows - 1)) / rows);

  groups.forEach((group, groupIndex) => {
    const x = pad + groupIndex * (width + pad);
    ui.text(group.title, x + 5, top + 13, 16, collectionInk.title, 'left');
    if (groupIndex === 0) ui.text('结算后自动入账', x + width - 5, top + 13, 12, collectionInk.muted, 'right');
    tasks.filter(task => task.period === group.period).forEach((task, i) => {
      const y = rowStart + i * (rowHeight + rowGap);
      const progress = task.id === 'endless_20min' ? collectionTime(task.progress) + ' / 20:00' : task.progress + ' / ' + task.target;
      const outcome = task.completed ? '已入账 +' + task.reward : '+' + task.reward + ' 积分';
      ui.panel(x, y, width, rowHeight);
      ui.text(task.title, x + 11, y + rowHeight * .35, 14, collectionInk.text, 'left');
      ui.text(progress, x + 11, y + rowHeight * .73, 12, collectionInk.muted, 'left');
      ui.text(outcome, x + width - 11, y + rowHeight / 2, 13,
        task.completed ? collectionInk.green : collectionInk.gold, 'right');
    });
  });
}

function collectionTime(progress) {
  const seconds = Math.max(0, Math.floor(progress));
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
}

function drawCollectionCheckin(ui, account, pad, top, bottom) {
  const signIn = account && account.sign_in;
  const panelWidth = ui.w - pad * 2;
  ui.panel(pad, top, panelWidth, bottom - top);
  if (!signIn) return;

  const {signed_today: signed, total_days: total, next_bonus_in: remaining, streak,
    day_rewards: dayRewards, cycle_progress: progress, today_reward: todayPoints,
    makeup_day: makeupDay, makeup_reward: makeupPoints, reward, bonus_every: cycle, bonus_reward: bonus} = signIn;
  const cycleDone = progress == null ? (signed && total && total % cycle === 0 ? cycle : total % cycle) : progress;
  const listX = pad + 15;
  const listWidth = panelWidth - 30;
  const gap = 8;
  const tileWidth = (listWidth - gap * (cycle - 1)) / cycle;
  const height = bottom - top;
  const tileY = top + Math.round(height * .27);
  const tileHeight = Math.round(height * .32);
  const center = ui.w / 2;
  const status = streak == null ? '累计签到 ' + total + ' 天' : '连续 ' + streak + ' 天 · 累计签到 ' + total + ' 天';
  ui.text(status, listX, top + height * .13, 18, collectionInk.title, 'left');
  ui.text('累计再签 ' + remaining + ' 天加送 ' + bonus + ' 分', listX + listWidth, top + height * .13,
    14, collectionInk.gold, 'right');

  for (let day = 1; day <= cycle; day++) {
    const x = listX + (day - 1) * (tileWidth + gap);
    const credited = day <= cycleDone;
    const points = dayRewards ? dayRewards[day - 1] : day === cycle ? reward + bonus : reward;
    ui.panel(x, tileY, tileWidth, tileHeight);
    ui.text('第 ' + day + ' 次', x + tileWidth / 2, tileY + tileHeight * .31, 12, collectionInk.muted, 'center');
    ui.text(credited ? '已签' : '+' + points, x + tileWidth / 2, tileY + tileHeight * .67, 17,
      credited ? collectionInk.green : collectionInk.gold, 'center');
  }

  const todayReward = todayPoints == null ? reward + (!signed && remaining === 1 ? bonus : 0) : todayPoints;
  const buttonWidth = Math.min(224, (panelWidth - 46) / (makeupDay ? 2 : 1));
  const buttonX = makeupDay ? center - buttonWidth - gap / 2 : center - buttonWidth / 2;
  const buttonY = bottom - 59;
  ui.button('checkin-claim', signed ? '今日已签到' : '签到领 ' + todayReward + ' 积分', buttonX,
    buttonY, buttonWidth, 40, () => ui.action('signin'), true, signed);
  if (makeupDay) {
    ui.button('checkin-makeup', '看广告补昨天 +' + makeupPoints + ' 分', center + gap / 2,
      buttonY, buttonWidth, 40, () => ui.action('makeup_signin', makeupDay));
  }
}

if (typeof module !== 'undefined') module.exports = drawSnowCollection;
