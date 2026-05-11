// ========== 工具函数 ==========

// 权重随机
function weightedRandom(weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

// 检查营业资格
function canStall() {
  if (!playerData) return false;
  return CONFIG.STALL_SPECIES.includes(playerData.species);
}

// 检查钓鱼条件
function canFish() {
  if (!playerData) return false;
  const map = playerData.current_map || '';
  let inWater = false;
  for (let wm of CONFIG.WATER_MAPS) {
    if (map.includes(wm)) { inWater = true; break; }
  }
  if (!inWater) return { status: false, msg: '这里没有水域，无法钓鱼。' };
  const inv = playerData.inventory || {};
  if (!inv['简易钓竿'] || inv['简易钓竿'] < 1) return { status: false, msg: '你没有钓竿，无法钓鱼。' };
  return { status: true, msg: '' };
}

// 文本测量缓存（兼容 Canvas 高 DPI 和字体）
const textCache = new Map();

function measureCached(text, font = CONFIG.FONT_SIZE + 'px "Courier New", monospace') {
  // 确保 ctx.font 与绘制一致
  if (ctx.font !== font) ctx.font = font;

  const key = font + '|' + text; // 字体+文本做缓存 key
  if (textCache.has(key)) return textCache.get(key);

  const w = ctx.measureText(text).width;
  textCache.set(key, w);
  return w;
}

function clearTextCache() {
  textCache.clear();
}

// 本地存档
function saveLocal() {
  if (playerData) {
    const str = JSON.stringify(playerData);
    localStorage.setItem('playerData', btoa(encodeURIComponent(str)));
    localStorage.setItem('currentView', 'main');
  }
}
function loadLocal() {
  const str = localStorage.getItem('playerData');
  if (str) {
    try {
      playerData = JSON.parse(decodeURIComponent(atob(str)));
      currentView = localStorage.getItem('currentView') || 'main';
      return true;
    } catch (e) { return false; }
  }
  return false;
}
