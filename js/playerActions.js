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
        const useResult = await API.inventoryUse(itemName);
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