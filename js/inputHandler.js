// ========== 事件处理 ==========

const BUTTONS = {
  login: [
    { x: 10, y: H - 50, w: 80, h: 35, action: () => newLife() },
    { x: 100, y: H - 50, w: 80, h: 35, action: () => loadPlayer() },
  ],
  main: [],
};

function buildMainButtons() {
  const bw = Math.floor((W - 60) / 3), btnH = CONFIG.BTN_H, topY = H - 66, bottomY = H - 32;
  BUTTONS.main = [
    { x: 15, y: topY, w: bw, h: btnH, action: () => explore(), longPress: () => longPressExplore() },
    { x: 30 + bw, y: topY, w: bw, h: btnH, action: () => fishing(), longPress: () => longPressFishing() },
    { x: 45 + bw * 2, y: topY, w: bw, h: btnH, action: () => battle(), longPress: () => longPressBattle() },
    { x: 15, y: bottomY, w: bw, h: btnH, action: () => showInventory(), longPress: () => longPressInventory() },
    { x: 30 + bw, y: bottomY, w: bw, h: btnH, action: () => showSettlement(), longPress: () => longPressSettlement() },
    { x: 45 + bw * 2, y: bottomY, w: bw, h: btnH, action: () => showMap(), longPress: () => longPressMap() },
  ];
}

function drawButtons() {
  const list = currentView === 'login' ? BUTTONS.login : BUTTONS.main;
  const texts = ['探索', '钓鱼', '战斗', '背包', '营地', '地图'];
  let i = 0;
  for (let btn of list) {
    const text = currentView === 'login' ? (btn === BUTTONS.login[0] ? '新生命' : '继续') : texts[i++];
    drawButton(btn.x, btn.y, btn.w, btn.h, text, CONFIG.BTN_COLOR);
  }
}

function drawSideButtons() {
  if (currentView !== 'main') return;

  // 存档按钮
  const saveX = W - 50, saveY = CONFIG.STATUS_BAR_HEIGHT + 2;
  ctx.fillStyle = '#2a3a1a'; roundRect(ctx, saveX, saveY, 32, 32, 6); ctx.fill();
  ctx.fillStyle = '#ddd'; ctx.font = 'bold 10px sans-serif';
  ctx.fillText('存', saveX + 9, saveY + 13); ctx.fillText('档', saveX + 9, saveY + 26);

  // 营业按钮
  if (canStall()) {
    const stallY = saveY + 40;
    ctx.fillStyle = '#3a2a1a'; roundRect(ctx, W - 50, stallY, 40, 80, 8); ctx.fill();
    ctx.fillStyle = '#ddd'; ctx.font = 'bold 11px sans-serif';
    ctx.fillText('营', W - 36, stallY + 30); ctx.fillText('业', W - 36, stallY + 55);
  }

  // 帮助按钮
  const helpY = canStall() ? saveY + 130 : saveY + 40;
  ctx.fillStyle = '#1a2a3a'; roundRect(ctx, W - 50, helpY, 32, 32, 6); ctx.fill();
  ctx.fillStyle = '#ddd'; ctx.font = 'bold 14px sans-serif';
  ctx.fillText('?', W - 40, helpY + 23);
}

function findButton(x, y) {
  const list = currentView === 'login' ? BUTTONS.login : BUTTONS.main;
  for (let btn of list) {
    if (x >= btn.x - 10 && x <= btn.x + btn.w + 10 && y >= btn.y - 15 && y <= btn.y + btn.h + 15) return btn;
  }
  return null;
}


// 触摸事件
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (popupMode) {
    const touch = e.touches[0];
    const popH = Math.min(H - 100, popupData.length * 36 + 80);
    const popY = (H - popH) / 2;
    const itemIndex = Math.floor((touch.clientY - popY - 55) / 36);
    if (itemIndex >= 0 && itemIndex < popupData.length) {
      selectedIndex = itemIndex;
      drawScreen();
    }
    return;
  }
  const touch = e.touches[0];
  touchStartY = touch.clientY; touchStartX = touch.clientX;
  isDragging = false; isLongPress = false;
  longPressTimer = setTimeout(() => { isLongPress = true; const btn = findButton(touchStartX, touchStartY); if (btn?.longPress) btn.longPress(); }, 500);
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (popupMode) {
    const touch = e.touches[0];
    const popH = Math.min(H - 100, popupData.length * 36 + 80);
    const popY = (H - popH) / 2;
    const itemIndex = Math.floor((touch.clientY - popY - 55) / 36);
    if (itemIndex >= 0 && itemIndex < popupData.length) {
      selectedIndex = itemIndex;
      drawScreen();
    }
    return;
  }
  const touch = e.touches[0];
  const dy = touch.clientY - touchStartY;
  if (Math.abs(dy) > 5) {
    isDragging = true; clearTimeout(longPressTimer);
    if (touchStartY > MESSAGE_AREA_TOP && touchStartY < MESSAGE_AREA_BOTTOM) {
      const boxH = CONFIG.BOX_PADDING * 2 + CONFIG.LINE_HEIGHT + CONFIG.BOX_SPACING;
      const maxScroll = Math.max(0, messages.length - Math.floor((MESSAGE_AREA_BOTTOM - MESSAGE_AREA_TOP) / boxH));
      scrollOffset = Math.max(0, Math.min(maxScroll, scrollOffset - dy / boxH));
      drawScreen();
    }
  }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  if (popupMode) {
    const touch = e.changedTouches[0];
    const popH = Math.min(H - 100, popupData.length * 36 + 80);
    const popY = (H - popH) / 2;
    const itemIndex = Math.floor((touch.clientY - popY - 55) / 36);
    if (itemIndex >= 0 && itemIndex < popupData.length) {
      popupData[itemIndex].action();
      // ✅ 不要在这里关闭弹窗，由各个 action 自己管理 popupMode
    }
    return;
  }

  clearTimeout(longPressTimer);
  if (!isDragging && !isLongPress) {
    const touch = e.changedTouches[0];
    // 侧边按钮
    if (touch.clientX > W - 50 && touch.clientY > CONFIG.STATUS_BAR_HEIGHT + 2 && touch.clientY < CONFIG.STATUS_BAR_HEIGHT + 34) {
      saveLocal(); showMsg('💾 已保存。', 'system'); return;
    }
    if (canStall() && touch.clientX > W - 50 && touch.clientY > MESSAGE_AREA_TOP + 60 && touch.clientY < MESSAGE_AREA_TOP + 140) {
      openStallPopup(); return;
    }
    // 帮助按钮
    const helpY = canStall() ? CONFIG.STATUS_BAR_HEIGHT + 132 : CONFIG.STATUS_BAR_HEIGHT + 42;
    if (touch.clientX > W - 50 && touch.clientY > helpY && touch.clientY < helpY + 40) {
      showHelpPopup(); return;
    }
    const btn = findButton(touch.clientX, touch.clientY);
    if (btn) { btn.action(); drawScreen(); }
  }
}, { passive: false });

// 鼠标事件
canvas.addEventListener('mousedown', (e) => {
  if (popupMode) {
    const popH = Math.min(H - 100, popupData.length * 36 + 80);
    const popY = (H - popH) / 2;
    const itemIndex = Math.floor((e.clientY - popY - 55) / 36);
    if (itemIndex >= 0 && itemIndex < popupData.length) {
      selectedIndex = itemIndex;
      drawScreen();
    }
    // 点击非选项区域时，弹窗不关闭，直接忽略
    return;
  }
  touchStartY = e.clientY;
  touchStartX = e.clientX;
  longPressTimer = setTimeout(() => { 
    isLongPress = true; 
    const btn = findButton(touchStartX, touchStartY); 
    if (btn?.longPress) btn.longPress(); 
  }, 500);
}); 

canvas.addEventListener('mousemove', (e) => {
  if (popupMode) {
    const popH = Math.min(H - 100, popupData.length * 36 + 80);
    const popY = (H - popH) / 2;
    const itemIndex = Math.floor((e.clientY - popY - 55) / 36);
    if (itemIndex >= 0 && itemIndex < popupData.length) {
      selectedIndex = itemIndex;
      drawScreen();
    }
  }
});

function handleButtonPress(x, y) {
  const btn = findButton(x, y);
  if (btn) btn.action();
}

canvas.addEventListener('mouseup', (e) => {
  clearTimeout(longPressTimer);
  
  if (popupMode) {
    const popH = Math.min(H - 100, popupData.length * 36 + 80);
    const popY = (H - popH) / 2;
    const itemIndex = Math.floor((e.clientY - popY - 55) / 36);
    
    if (itemIndex >= 0 && itemIndex < popupData.length) {
      selectedIndex = itemIndex;
      popupData[itemIndex].action();
      // ✅ 不要在这里关闭弹窗，由各个 action 自己管理 popupMode
    }
    return;
  }

  // 以下为普通鼠标事件
  if (e.clientX > W - 50 && e.clientY > CONFIG.STATUS_BAR_HEIGHT + 4 && e.clientY < CONFIG.STATUS_BAR_HEIGHT + 44) {
    if (playerData) {
      localStorage.setItem('playerData', JSON.stringify(playerData));
      localStorage.setItem('currentView', 'main');
      addMessage('💾 已保存。', 'system');
      drawScreen();
    }
    return;
  }
    // 营业按钮
  const stallBtnY = CONFIG.STATUS_BAR_HEIGHT + 42;
  if (canStall() && e.clientX > W - 50 && e.clientY > stallBtnY && e.clientY < stallBtnY + 80) {
    openStallPopup(); return;
  }
  // 帮助按钮
  const helpBtnY = canStall() ? CONFIG.STATUS_BAR_HEIGHT + 132 : CONFIG.STATUS_BAR_HEIGHT + 42;
  if (e.clientX > W - 50 && e.clientY > helpBtnY && e.clientY < helpBtnY + 40) {
    showHelpPopup(); return;
  }
  if (e.clientY > H - 100) handleButtonPress(e.clientX, e.clientY);
});

