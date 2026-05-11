// ========== Canvas 渲染 ==========

// 圆角矩形
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// 绘制按钮
function drawButton(x, y, w, h, text, color) {
  ctx.fillStyle = color;
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px sans-serif';
  const tw = ctx.measureText(text).width;
  ctx.fillText(text, x + (w - tw) / 2, y + h / 2 + 5);
}

// 状态栏
function drawStatusBar() {
  if (!playerData || currentView !== 'main') return;
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, W, CONFIG.STATUS_BAR_HEIGHT);
  ctx.fillStyle = '#555';
  ctx.fillRect(0, CONFIG.STATUS_BAR_HEIGHT - 1, W, 1);
  const v = playerData.vital;
  ctx.fillStyle = '#eee';
  ctx.font = 'bold 14px sans-serif';
  let nameText = `${playerData.species}  Lv.${playerData.level}`;
  if (playerData.red_name) { nameText += '  🔴'; ctx.fillStyle = '#ff4444'; }
  ctx.fillText(nameText, 12, 28);
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#ccc';
  const statsText = `❤️ ${v['生命机能']}  ⚡${v['体力耐力']}  🍖${v['饱腹值']}  🧠${v['精神状态']}`;
  ctx.fillText(statsText, W - ctx.measureText(statsText).width - 12, 28);
}

// 封面
function drawCover() {
  if (messages.length <= 3 && currentView === 'login') {
    ctx.fillStyle = '#c8b878';
    ctx.font = 'bold 18px sans-serif';
    const title = '众生之门';
    ctx.fillText(title, (W - ctx.measureText(title).width) / 2, H / 2 - 30);
    ctx.fillStyle = '#aa88cc';
    ctx.font = '13px "Courier New", monospace';
    const subtitle = '万物皆玩家，静默求生。';
    ctx.fillText(subtitle, (W - ctx.measureText(subtitle).width) / 2, H / 2);
  }
}

// 主绘制
function drawScreen() {
  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(0, 0, W, H);
  drawStatusBar();
  drawCover();
  drawMessages();
  drawButtons();
  drawSideButtons();
  if (popupMode) drawPopup();
}