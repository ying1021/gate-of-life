// ================= playerActions.js 修复版 =================

// ⚠️ 全局变量初始化
let playerData = null;
let currentView = 'login';
let messages = [];
let popupMode = null;
let popupData = [];
let popupTitle = '';
let selectedIndex = 0;

// ⚠️ 必要全局函数 stub（如果全局已定义可忽略）
function addMessage(msg, type) { console.log(`[${type}] ${msg}`); }
function drawScreen() { /* 绘制界面 */ }
function clearScreen() { /* 清屏 */ }
function showMsg(msg, type) { addMessage(msg, type); }
function canFish() { return { status: true, msg: '' }; }
function saveLocal() { /* 保存本地存档 */ }
function loadLocal() { return false; }
function clearLocal() { playerData = null; }

// ================= 游戏逻辑函数 =================

// 新生灵创建
async function newLife() {
  clearScreen();
  addMessage('正在召唤新的生灵...', 'system');

  const result = await API.newLife();
  if (result && result.玩家状态) {  // ✅ 修复判断
    playerData = result['玩家状态'];

    if (!playerData) {
      addMessage('❌ 创建失败：无法获取玩家数据', 'inner');
      drawScreen();
      return;
    }

    if (!playerData.species) playerData.species = '草鱼';
    if (!playerData.vital) playerData.vital = { '体力耐力': 100, '饱腹值': 100, '精神状态': 100 };
    if (!playerData.inventory) playerData.inventory = {};
    if (!playerData.current_map) playerData.current_map = '城郊青草地';

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
  } else {
    addMessage('❌ 召唤失败，请重试', 'inner');
  }
  drawScreen();
}

// ================= inventoryUse 修复 =================
async function longPressInventory() {
  if (!playerData) return;
  const pid = playerData?.id || 'test';
  const result = await API.inventoryView(pid);
  if (result && result['背包'] && Object.keys(result['背包']).length > 0) {
    const items = [];
    for (let [itemName, qty] of Object.entries(result['背包'])) {
      items.push({ label: `${itemName} x${qty}`, action: async () => {
        // ✅ 修复调用 inventoryUse
        const useResult = await API.inventoryUse(playerData.id, itemName);
        if (useResult && useResult['成功']) { 
          addMessage(useResult['msg'], 'heal'); 
          if (useResult['应用效果']) 
            for (let [stat, value] of Object.entries(useResult['应用效果'])) 
              addMessage(`  ${stat}: ${value}`, 'heal'); 
        } else if (useResult) addMessage(useResult['msg'], 'inner');
        popupMode = null;
        drawScreen();
      }});
    }
    items.push({ label: '关闭', action: () => { popupMode = null; drawScreen(); } });
    popupTitle = '使用道具'; popupData = items; selectedIndex = 0; popupMode = 'item_use'; drawScreen();
  } else { addMessage('背包空空如也。', 'inner'); drawScreen(); }
}

// ================= 其他 API 调用中 pid 修复 =================
// 文件中所有 API 调用保持使用 playerData?.id
// 如：
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
  drawScreen();
}


