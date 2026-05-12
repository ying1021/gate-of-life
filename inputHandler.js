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

  if (canStall()) {
    const stallY = MESSAGE_AREA_TOP + 60;
    ctx.fillStyle = '#3a2a1a'; roundRect(ctx, W - 50, stallY, 40, 80, 8); ctx.fill();
    ctx.fillStyle = '#ddd'; ctx.font = 'bold 11px sans-serif';
    ctx.fillText('营', W - 36, stallY + 30); ctx.fillText('业', W - 36, stallY + 55);
  }
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
      popupMode = null;  // ✅ 执行后关闭
      drawScreen();
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
  longPressTimer = setTimeout(() => { isLongPress = true; handleLongPress(touchStartX, touchStartY); }, 500);
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
      // ✅ 只有点击有效选项才执行操作
      selectedIndex = itemIndex;
      popupData[itemIndex].action();
      popupMode = null;  // ✅ 动作执行后才关闭
      drawScreen();
    }
    // ✅ 点击无效区域就不关闭弹窗
    return;
  }

  // 以下为普通鼠标事件
  if (e.clientX > W - 50 && e.clientY > STATUS_BAR_HEIGHT + 4 && e.clientY < STATUS_BAR_HEIGHT + 44) {
    if (playerData) {
      localStorage.setItem('playerData', JSON.stringify(playerData));
      localStorage.setItem('currentView', 'main');
      addMessage('💾 已保存。', 'system');
      drawScreen();
    }
    return;
  }
  if (e.clientY > H - 100) handleButtonPress(e.clientX, e.clientY);
});


// ================= playerActions.js 完整版 =================

// ================= 游戏逻辑函数 =================

// 新生灵创建
async function newLife() {
  clearScreen();
  addMessage('正在召唤新的生灵...', 'system');

  const result = await API.newLife();
  if (result) {
    playerData = result['玩家状态'];
    const narrative = result['叙事文字'] || result.msg;
    if (narrative) {
      const lines = narrative.split('\n').filter(line => line.trim() && !messages.some(m => m.text === line.trim()));
      lines.forEach(line => addMessage(line, 'system'));
    }

    currentView = 'main';
    if (!playerData.quests) playerData.quests = {};
    playerData.quests['初来乍到'] = { '完成': true, '进度': 1 };

    addMessage('✅ 任务完成：初来乍到', 'heal');
    addMessage('💡 提示：长按按钮有额外功能', 'system');

    saveLocal();
  }
  drawScreen();
}

async function loadPlayer() {
  if (loadLocal()) { addMessage('你回来了。', 'system'); }
  else { addMessage('没有存档。点击"新生命"开始吧。', 'inner'); }
  drawScreen();
}

// 探索
async function explore() {
  if (!playerData) return;
  showMsg('> 你四处探索...', 'normal');
  const pid = playerData.id || 'test';
  const map = playerData.current_map || '城郊青草地';
  const result = await API.explore(pid, map);
  if (result) {
    addMessage(result['叙事'], 'normal');
    (result['获得道具'] || []).forEach(item => {
      addMessage(`获得：${item['道具']}（${item['稀有度']}）`, 'heal');
      if (!playerData.inventory) playerData.inventory = {};
      playerData.inventory[item['道具']] = (playerData.inventory[item['道具']] || 0) + 1;
    });
  }
  const eventResult = await API.randomEvent(pid, map, '晴天');
  if (eventResult && eventResult['触发']) {
    addMessage('✨ ' + eventResult['叙事'], 'event');
    (eventResult['获得道具'] || []).forEach(item => {
      addMessage(`获得：${item['道具']}（${item['稀有度']}）`, 'heal');
      if (!playerData.inventory) playerData.inventory = {};
      playerData.inventory[item['道具']] = (playerData.inventory[item['道具']] || 0) + 1;
    });
  }
  checkQuest('初次探索');
  drawScreen();
}

// 钓鱼
async function fishing() {
  if (!playerData) return;
  const fishResult = canFish();
  if (!fishResult.status) { showMsg(`> ${fishResult.msg}`, 'system'); return; }
  showMsg('> 你开始钓鱼...', 'normal');
  const pid = playerData.id || 'test';
  const result = await API.fishing(pid, '湖滨芦苇荡');
  if (result) {
    addMessage(result['叙事'], 'event');
    (result['获得道具'] || []).forEach(item => {
      addMessage(`🎣 钓上了：${item['道具']}`, 'heal');
      if (!playerData.inventory) playerData.inventory = {};
      playerData.inventory[item['道具']] = (playerData.inventory[item['道具']] || 0) + 1;
    });
    if (result['需要选择']) {
      addMessage('仙女等待你的回答...', 'inner');
      const cr = await API.fairyChoice('铁斧头');
      if (cr) {
        addMessage(cr['结果'], 'event');
        (cr['获得道具'] || []).forEach(item => {
          addMessage(`✨ 仙女赠予：${item['道具']}`, 'heal');
          playerData.inventory[item['道具']] = (playerData.inventory[item['道具']] || 0) + 1;
        });
      }
    }
  }
  drawScreen();
}

// 战斗
async function battle() {
  if (!playerData) return;
  const enemy = CONFIG.ENEMIES[Math.floor(Math.random() * CONFIG.ENEMIES.length)];
  showMsg('> 你警觉地环顾四周...', 'normal');
  addMessage(`前方传来窸窣声响——你看到了一只${enemy}！`, 'normal'); drawScreen();
  const reaction = CONFIG.REACTIONS[weightedRandom(CONFIG.REACTION_WEIGHTS)];
  if (reaction === 'flee') { showMsg(`那只${enemy}转身逃走了。`, 'inner'); return; }
  if (reaction === 'ignore') { showMsg(`那只${enemy}瞥了你一眼，继续做自己的事。`, 'inner'); return; }
  const desc = CONFIG.ATTACK_DESCS[Math.floor(Math.random() * CONFIG.ATTACK_DESCS.length)].replace('{enemy}', enemy);
  addMessage(desc, 'battle'); drawScreen();
  const result = await API.battle(playerData.species, enemy, playerData.level);
  if (result) {
    const battleDesc = (result['战斗描述'] || '')
      .replace(/skin_laceration/g, '皮肉撕裂').replace(/fracture/g, '骨折').replace(/blood_loss/g, '失血')
      .replace(/poison/g, '中毒').replace(/asphyxia/g, '窒息').replace(/frostbite/g, '冻伤')
      .replace(/burn/g, '灼伤').replace(/sensory_damage/g, '感官受损');
    addMessage(battleDesc, 'battle');
    if (playerData && playerData.vital) {
      playerData.vital['生命机能'] = Math.max(0, (playerData.vital['生命机能'] || 100) - (result['防御方造成效果']['受到伤害'] || 0));
      playerData.vital['体力耐力'] = Math.max(0, (playerData.vital['体力耐力'] || 100) - (result['防御方造成效果']['受到伤害'] || 0) * 0.3);
    }
    addMessage(`你造成了 ${result['攻击方造成效果']['受到伤害']} 点伤害，受到了 ${result['防御方造成效果']['受到伤害']} 点伤害`, 'battle');
    if (Math.random() < 0.3) {
      const redResult = await API.redName(playerData.id || 'test');
      if (redResult && redResult['同大类击杀数'] >= 14) addMessage(`⚠ 你已经击杀了 ${redResult['同大类击杀数']} 个同族！再杀就会变成红名...`, 'battle');
    }
  }
  checkQuest('初次战斗');
  drawScreen();
}

function showInventory() {
  addMessage('> 查看背包', 'system');
  if (playerData && playerData.inventory && Object.keys(playerData.inventory).length > 0) {
    const inv = playerData.inventory;
    const total = Object.values(inv).reduce((a, b) => a + b, 0);
    addMessage(`背包：${Object.keys(inv).length}种，共${total}件`, 'normal');
    for (let [item, qty] of Object.entries(inv)) addMessage(`  ${item} x${qty}`, 'heal');
  } else { addMessage('背包空空如也。', 'inner'); }
  checkQuest('收集物资');
  drawScreen();
}

async function showSettlement() {
  addMessage('> 查看营地', 'system');
  const pid = playerData?.id || 'test';
  const result = await API.settlementView(pid);
  if (result) {
    if (result['建筑数量'] === 0) addMessage('你还未建造任何东西。', 'inner');
    else { addMessage(result.msg, 'normal'); (result['建筑列表'] || []).forEach(b => addMessage(`  🏕 ${b}`, 'heal')); }
  }
  drawScreen();
}

async function showBuild() {
  addMessage('> 建造系统', 'system'); addMessage('简易营地：木材x5 藤绳x2 石块x3', 'normal');
  const pid = playerData?.id || 'test';
  const result = await API.settlementBuild(pid);
  if (result) {
    addMessage(result['叙事'] || result.msg, 'heal');
    if (!result['成功']) addMessage('材料不足，请先探索收集材料。', 'inner');
    else checkQuest('安营扎寨');
  }
  drawScreen();
}

async function showMap() {
  addMessage('> 查看地图', 'system');
  const map = playerData?.current_map || '城郊青草地';
  addMessage(`📍 当前位置：${map}`, 'system');
  const result = await API.mapMoves(playerData?.id || 'test', map);
  if (result && result['可前往'] && result['可前往'].length > 0) {
    addMessage('--- 可前往 ---', 'normal');
    for (let dest of result['可前往']) {
      const displayName = dest['已探索'] ? dest['名称'] : '???';
      if (dest['已探索']) {
        const shopResult = await API.shopInfo(dest['名称']);
        let shopInfo = shopResult && shopResult['有商店'] ? `  🏪 x${shopResult['商店数量']}` : '';
        addMessage(`  → ${displayName}${shopInfo}`, 'heal');
      } else { addMessage(`  → ${displayName}（未探索）`, 'normal'); }
    }
  }
  drawScreen();
}

// ========== 任务系统 ==========
function checkQuest(name) {
  if (!playerData) return;
  if (!playerData.quests) playerData.quests = {};
  const q = CONFIG.QUESTS[name];
  if (!q) return;
  if (!playerData.quests[name] || !playerData.quests[name]['完成']) {
    playerData.quests[name] = playerData.quests[name] || { '完成': false, '进度': 0 };
    playerData.quests[name]['进度']++;
    if (playerData.quests[name]['进度'] >= q.target && !playerData.quests[name]['完成']) {
      playerData.quests[name]['完成'] = true;
      if (q.reward.exp) playerData.exp = (playerData.exp || 0) + q.reward.exp;
      for (let [item, qty] of Object.entries(q.reward)) {
        if (item === 'exp') continue;
        if (!playerData.inventory) playerData.inventory = {};
        playerData.inventory[item] = (playerData.inventory[item] || 0) + qty;
      }
      const rewardText = Object.entries(q.reward).map(([k, v]) => `${k}+${v}`).join('，');
      addMessage(`✅ 任务完成：${name}！${rewardText}`, 'heal');
    }
  }
}

// ========== 长按功能 ==========
function longPressExplore() { showMsg(`📍 当前位置：${playerData?.current_map || '未知'}`, 'system'); }
function longPressFishing() {
  const fishResult = canFish();
  if (fishResult.status) showMsg('🎣 可以钓鱼，可钓获鱼干、净水等', 'heal');
  else { showMsg(`🎣 ${fishResult.msg}`, 'inner'); }
}

// ========== 弹窗系统 ==========
function drawPopup() {
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, W, H);
  const popW = W - 40; const popH = Math.min(H - 100, popupData.length * 36 + 80);
  const popX = 20, popY = (H - popH) / 2;
  ctx.fillStyle = '#1a1a2e'; roundRect(ctx, popX, popY, popW, popH, 10); ctx.fill();
  ctx.strokeStyle = '#555'; ctx.lineWidth = 2; roundRect(ctx, popX, popY, popW, popH, 10); ctx.stroke();
  ctx.fillStyle = '#c8b878'; ctx.font = 'bold 15px sans-serif'; ctx.fillText(popupTitle, popX + 15, popY + 30);
  ctx.font = '13px sans-serif';
  for (let i = 0; i < popupData.length; i++) {
    const itemY = popY + 55 + i * 36;
    if (i === selectedIndex) { ctx.fillStyle = '#2a4a6a'; roundRect(ctx, popX + 10, itemY - 5, popW - 20, 30, 5); ctx.fill(); }
    ctx.fillStyle = '#ddd'; ctx.fillText(popupData[i].label, popX + 20, itemY + 17);
  }
  ctx.fillStyle = '#888'; ctx.font = '11px sans-serif'; ctx.fillText('点击选择', popX + 15, popY + popH - 15);
}

async function longPressBattle() {
  if (!playerData) return;
  popupTitle = '战斗选项';
  popupData = [
    { label: '查看红名状态', action: async () => {
        const pid = playerData?.id || 'test';
        const result = await API.redName(pid);
        if (result) {
          addMessage(`⚔ Lv.${playerData.level} ${playerData.species}`, 'system');
          addMessage(`同族击杀数：${result['同大类击杀数']}`, result['is_red_name'] ? 'battle' : 'normal');
          if (result['is_red_name']) { addMessage('🔴 你是红名玩家！', 'battle'); addMessage(`忏悔进度：${result['忏悔进度']}`, 'inner'); }
        }
        popupMode = null;
        drawScreen();
      }
    },
    { label: '查看天赋与专精', action: () => {
        if (!playerData) return;
        addMessage(`【天赋】${playerData.talent || '无'}`, 'inner');
        addMessage(`【等级】Lv.${playerData.level}`, 'normal');
        const specPoints = Math.floor((playerData.level || 1) / CONFIG.SPEC_POINTS_INTERVAL);
        addMessage(`【可用专精点】${specPoints}`, 'normal');
        if (specPoints > 0) {
          popupTitle = '分配专精';
          popupData = CONFIG.SPEC_NAMES.map(spec => ({
            label: spec, action: async () => {
              const pid = playerData?.id || 'test';
              const r = await API.allocateSpec(pid, spec, playerData.level);
              if (r) addMessage(r['msg'], r['成功'] ? 'heal' : 'inner');
              popupMode = null;
              drawScreen();
            }
          }));
          popupData.push({ label: '关闭', action: () => { popupMode = null; drawScreen(); } });
          selectedIndex = 0; popupMode = 'alloc_spec'; drawScreen();
          return;
        }
        popupMode = null;
        drawScreen();
      }
    },
    { label: '自绝', action: () => {
        popupTitle = '确认自绝？';
        popupData = [
          { label: '确定自绝（数据将全部清空）', action: async () => {
              clearLocal();
              const pid = playerData?.id || 'test';
              const result = await API.suicide(pid);
              if (result) { addMessage(result['叙事文字'] || result.msg, 'battle'); playerData = null; currentView = 'login'; }
              popupMode = null; drawScreen();
            }
          },
          { label: '取消', action: () => { popupMode = null; drawScreen(); } }
        ];
        selectedIndex = 0; popupMode = 'confirm_suicide'; drawScreen();
      }
    },
    { label: '关闭', action: () => { popupMode = null; drawScreen(); } }
  ];
  selectedIndex = 0; popupMode = 'battle_menu'; drawScreen();
}

async function longPressInventory() {
  if (!playerData) return;
  const pid = playerData?.id || 'test';
  const result = await API.inventoryView(pid);
  if (result && result['背包'] && Object.keys(result['背包']).length > 0) {
    const items = [];
    for (let [itemName, qty] of Object.entries(result['背包'])) {
      items.push({ label: `${itemName} x${qty}`, action: async () => {
        const useResult = await API.inventoryUse(playerData.id, itemName);
        if (useResult && useResult['成功']) { addMessage(useResult['msg'], 'heal'); if (useResult['应用效果']) for (let [stat, value] of Object.entries(useResult['应用效果'])) addMessage(`  ${stat}: ${value}`, 'heal'); }
        else if (useResult) addMessage(useResult['msg'], 'inner');
        popupMode = null;
        drawScreen();
      }});
    }
    items.push({ label: '关闭', action: () => { popupMode = null; drawScreen(); } });
    popupTitle = '使用道具'; popupData = items; selectedIndex = 0; popupMode = 'item_use'; drawScreen();
  } else { addMessage('背包空空如也。', 'inner'); drawScreen(); }
}

async function longPressSettlement() {
  if (!playerData) return;
  const map = playerData.current_map || '城郊青草地';
  const pid = playerData?.id || 'test';
  const shopResult = await API.shopInfo(map);
  if (shopResult && shopResult['有商店'] && shopResult['商店列表'].length > 0) {
    const items = [];
    for (let shop of shopResult['商店列表']) {
      for (let item of shop['商品']) {
        items.push({ label: `[${shop['商店名']}] ${item['名称']}（${item['价格']}）`, action: async () => {
            const buyResult = await API.shopBuy(map, shop['商店名'], item['名称'], pid);
            if (buyResult) {
              addMessage(buyResult['msg'], buyResult['成功'] ? 'heal' : 'inner');
              if (buyResult['成功'] && playerData) {
                if (!playerData.inventory) playerData.inventory = {};
                playerData.inventory[buyResult['获得']] = (playerData.inventory[buyResult['获得']] || 0) + 1;
                const pp = buyResult['付出'].split('x');
                if (pp.length === 2 && playerData.inventory[pp[0]]) { playerData.inventory[pp[0]] -= parseInt(pp[1]); if (playerData.inventory[pp[0]] <= 0) delete playerData.inventory[pp[0]]; }
              }
            }
            popupMode = null;
            drawScreen();
          }
        });
      }
    }
    items.push({ label: '关闭', action: () => { popupMode = null; drawScreen(); } });
    popupTitle = `购物（${map}）`; popupData = items; selectedIndex = 0; popupMode = 'shop_buy';
    drawScreen();
  } else { addMessage('这里没有商店。', 'inner'); drawScreen(); }
}

async function longPressMap() {
  if (!playerData) return;
  const map = playerData.current_map || '城郊青草地';
  const result = await API.mapMoves(playerData?.id || 'test', map);
  if (!result || !result['可前往'] || result['可前往'].length === 0) { addMessage('没有可前往的其他地图。', 'inner'); drawScreen(); return; }
  const destinations = result['可前往'];
  popupTitle = '前往何处？';
  popupData = destinations.map(dest => ({
    label: dest['已探索'] ? dest['名称'] : `???（${dest['真实名称']}方向）`,
    action: function() {
      const target = dest['已探索'] ? dest['名称'] : dest['真实名称'];
      popupTitle = `前往 ${target}？`;
      popupData = [
        { label: '确定（消耗体力、饱腹、心神）', action: async function() {
          const mr = await API.mapMove(playerData?.id || 'test', target);
          if (mr) {
            addMessage(mr['msg'], mr['成功'] ? 'heal' : 'inner');
            if (mr['成功'] && playerData && playerData.vital) {
              playerData.current_map = mr['当前地图'];
              playerData.vital['体力耐力'] = Math.max(0, (playerData.vital['体力耐力'] || 100) - 8);
              playerData.vital['饱腹值'] = Math.max(0, (playerData.vital['饱腹值'] || 100) - 5);
              playerData.vital['精神状态'] = Math.max(0, (playerData.vital['精神状态'] || 100) - 3);
            }
          }
          popupMode = null; drawScreen();
        }},
        { label: '取消', action: function() { popupMode = null; drawScreen(); } }
      ];
      selectedIndex = 0; popupMode = 'confirm_move'; drawScreen();
    }
  }));
  popupData.push({ label: '取消', action: () => { popupMode = null; drawScreen(); } });
  selectedIndex = 0; popupMode = 'map_move'; drawScreen();
}

async function openStallPopup() {
  if (!playerData) return;
  const map = playerData.current_map || '城郊青草地';
  const shopResult = await API.shopInfo(map);
  if (!shopResult || !shopResult['有商店']) { addMessage('这里没有商店，无法营业。', 'inner'); drawScreen(); return; }
  popupTitle = '商店营业';
  popupData = [
    { label: '开启营业（挂出野果x2 → 石块x1）', action: async () => { const r = await API.stallOpen(); if (r) addMessage(r['msg'], r['成功'] ? 'heal' : 'inner'); popupMode = null; drawScreen(); } },
    { label: '关闭营业', action: async () => { const r = await API.stallClose(); if (r) addMessage(r['msg'], r['成功'] ? 'heal' : 'inner'); popupMode = null; drawScreen(); } }
  ];
  selectedIndex = 0; popupMode = 'stall'; drawScreen();
}