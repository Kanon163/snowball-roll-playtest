function createSnowGuide() {
  const copy = [
    '拖动左侧摇杆移动。',
    '点右侧闪避。',
    '撞物品变大，躲开比你大的雪球。',
    '长到目标重量，撞碎大冰雕。'
  ];

  function draw(ui, page, onNext) {
    if (!Number.isInteger(page) || page < 0 || page >= copy.length) return;
    const {w, h, button, text, panel, circle, fill} = ui;
    const width = Math.min(454, w - 36), height = 280;
    const x = (w - width) / 2, y = (h - height) / 2;
    const cx = w / 2, cy = y + 89;

    const ivory = '#ecf6fb', ice = '#a5c8dd', amber = '#ffdb98';
    function snowball(px, py, radius, scarf = '#d46c56') {
      fill(px - radius, py + radius - 2, radius * 2, 7, 4, '#7191ac');
      circle(px, py, radius, ivory, ice);
      circle(px - radius * .32, py - radius * .34, radius * .19, '#ffffff');
      fill(px - radius + 2, py + radius * .18, radius * 2 - 4, radius * .3, 3, scarf);
      fill(px - radius * .5, py + radius * .21, 5, radius * .22, 2, '#fff1d9');
    }
    function arrow(px, py) {
      text('›', px, py - 1, 37, '#244763', 'center', true);
    }
    function snowTrail(px, py) {
      for (let i = 0; i < 3; i++) circle(px + i * 7, py - i * 4, 2 + i * .5, ice);
    }

    panel(x, y, width, height);
    fill(cx - 151, y + 26, 302, 116, 16, '#bfd7e6', '#f1faff');
    fill(cx - 143, y + 108, 286, 20, 10, '#a0bbd3');

    switch (page) {
      case 0:
        circle(cx - 79, cy, 27, '#8faac2', '#f2fbff');
        circle(cx - 69, cy - 7, 12, ivory, '#fff5df');
        snowTrail(cx + 19, cy + 9);
        arrow(cx, cy);
        snowball(cx + 80, cy - 9, 21);
        break;
      case 1:
        circle(cx - 83, cy + 4, 25, '#f1ad5f', '#fff1c2');
        text('››', cx - 84, cy, 27, '#754325', 'center', true);
        snowball(cx + 56, cy - 19, 21, '#4e9b9a');
        snowTrail(cx + 15, cy + 26);
        snowball(cx + 89, cy + 13, 17);
        break;
      case 2:
        snowball(cx - 106, cy + 11, 13);
        fill(cx - 69, cy + 1, 27, 22, 4, '#cc6759', '#b45348');
        fill(cx - 58, cy + 1, 5, 22, 2, amber);
        fill(cx - 70, cy, 29, 5, 2, amber);
        arrow(cx - 21, cy + 8);
        snowball(cx + 15, cy + 4, 20);
        snowball(cx + 91, cy - 5, 32, '#4e9b9a');
        break;
      case 3:
        snowTrail(cx - 104, cy + 16);
        snowball(cx - 64, cy + 3, 23);
        arrow(cx - 18, cy + 5);
        for (const [px, tower] of [[21, 34], [43, 63], [70, 46], [92, 33]]) {
          fill(cx + px, cy + 21 - tower, 19, tower, 5, '#d9f7ff', '#7ab5d9');
          fill(cx + px + 4, cy + 25 - tower, 3, tower - 9, 2, '#ffffff');
        }
        fill(cx + 15, cy + 20, 103, 11, 5, '#71a8ce', '#e7f9ff');
        break;
    }

    text(copy[page], cx, y + 170, 21, '#fff1d4', 'center', true);
    for (let i = 0; i < copy.length; i++) {
      circle(cx + (i - 1.5) * 14, y + 202, i === page ? 4 : 3, i === page ? amber : '#6e8ea5');
    }
    button('guide-next', page === copy.length - 1 ? '开始' : '下一步',
      cx - 88, y + 221, 176, 42, () => onNext(), true);
  }

  return {count: copy.length, draw};
}

if (typeof module !== 'undefined') module.exports = createSnowGuide;
