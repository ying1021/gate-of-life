// ========== API 请求封装 ==========
const API_BASE = 'https://gate-backend-hq8w.onrender.com';

// 简单缓存（30秒）
const apiCache = new Map();
function getCached(key) {
  const entry = apiCache.get(key);
  if (entry && Date.now() - entry.time < 30000) return entry.data;
  apiCache.delete(key);
  return null;
}
function setCache(key, data) {
  apiCache.set(key, { data, time: Date.now() });
}

function detailText(detail) {
  if (Array.isArray(detail)) return detail.map(d => (d && d.msg) || String(d)).join('；');
  return typeof detail === 'string' ? detail : '';
}

async function request(path, method = 'GET', body = null) {
  const noCache = path.startsWith('/auth/') || path.startsWith('/player/list') || path.startsWith('/player/state');
  const cacheKey = method === 'GET' && !noCache ? path : null;
  if (cacheKey) {
    const cached = getCached(cacheKey);
    if (cached) return cached;
  }

  const url = API_BASE + path;
  const token = localStorage.getItem('authToken');
  const options = { method, headers: { 'Content-Type': 'application/json' } };
  if (token) options.headers['Authorization'] = 'Bearer ' + token;
  if (body) options.body = JSON.stringify(body);

  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        if (typeof handleUnauthorized === 'function') handleUnauthorized(token);
        return null;
      }
      if (res.status >= 400 && res.status < 500) {
        const detail = detailText(data && data.detail);
        if (detail) addMessage('【' + detail + '】', 'system');
        return null;
      }
      throw new Error('Server error');
    }
    const data = await res.json();
    if (cacheKey) setCache(cacheKey, data);
    return data;
  } catch (e) {
    addMessage('【正在唤醒服务器...】', 'system');
    try {
      const retry = await fetch(url, options);
      if (!retry.ok) throw new Error('Retry failed');
      const data = await retry.json();
      if (cacheKey) setCache(cacheKey, data);
      return data;
    } catch (e2) {
      addMessage('【网络延迟，请重试】', 'system');
      return null;
    }
  }
}

async function authRequest(path, body) {
  try {
    const res = await fetch(API_BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: detailText(data && data.detail) || '请求失败' };
    return data;
  } catch (e) {
    return { error: '网络错误，请稍后重试' };
  }
}

// 常用 API 快捷方法
const API = {
  register: (username, password) => authRequest('/auth/register', { username, password }),
  login: (username, password) => authRequest('/auth/login', { username, password }),
  me: () => request('/auth/me', 'GET'),
  playerList: () => request('/player/list', 'GET'),
  playerState: (pid) => request(`/player/state?player_id=${encodeURIComponent(pid)}`, 'GET'),

  newLife: async () => {
    const result = await request('/player/new_life', 'POST');
    if (result && result.玩家状态) {
      const player = result.玩家状态;
      if (!player.species) {
        player.species = '草鱼';
      }
      if (!player.vital) {
        player.vital = {
        '生命机能': 100,
        '体力耐力': 100,
        '饱腹值': 100,
        '精神状态': 100
        };
      }
      if (!player.inventory) {
        player.inventory = [];
      }
      if (!player.current_map) {
        player.current_map = '城郊青草地';
      }
      return result; // ✅ return 放在 if 内部
    }
    return null; // ✅ return 放在 if 外部
  },

  explore: (pid, map) => request(`/game/explore?player_id=${pid}&map_region=${map}`, 'POST'),
  fishing: (pid, map) => request(`/game/fishing?player_id=${pid}&map_region=${map}`, 'POST'),
  battle: (species, enemy, level) => request(`/game/battle?attacker_species=${species}&defender_species=${enemy}&attacker_level=${level}`, 'POST'),
  randomEvent: (pid, map, weather) => request(`/game/random_event?player_id=${pid}&map_region=${map}&weather_str=${weather}`, 'POST'),
  fairyChoice: (pid, choice) => request(`/game/fairy_choice?player_id=${pid}&choice=${choice}`, 'POST'),
  shopInfo: (map) => request(`/shop/info?map_region=${map}`, 'GET'),
  shopBuy: (map, shop, item, pid) => request(`/shop/buy?map_region=${map}&shop_name=${shop}&item_name=${item}&player_id=${pid}`, 'POST'),
  inventoryView: (pid) => request(`/inventory/view?player_id=${pid}`, 'GET'),

  // ⚠️ 修改 inventoryUse，传入 pid 避免未定义 playerData
  inventoryUse: (pid, item) => request(
    `/inventory/use?player_id=${pid}&item_name=${encodeURIComponent(item)}`, 
    'POST'
  ),

  settlementView: (pid) => request(`/settlement/view?player_id=${pid}`, 'GET'),
  settlementBuild: (pid, building) => request(`/settlement/build?player_id=${pid}&building_str=${encodeURIComponent(building)}`, 'POST'),
  settlementDismantle: (pid, building) => request(`/settlement/dismantle?player_id=${pid}&building_str=${encodeURIComponent(building)}`, 'POST'),
  mapMoves: (pid, map) => request(`/map/moves?player_id=${pid}&map_region=${map}`, 'GET'),
  mapMove: (pid, target) => request(`/map/move?player_id=${pid}&target_map=${target}`, 'POST'),
  redName: (pid) => request(`/player/red_name?player_id=${pid}`, 'GET'),
  suicide: (pid) => request(`/player/suicide?player_id=${pid}`, 'POST'),
  deathCooldown: (pid) => request(`/player/death_cooldown?player_id=${pid}`, 'GET'),
  allocateSpec: (pid, spec, level) => request(`/player/allocate_spec?player_id=${pid}&spec_name=${spec}&level=${level}`, 'POST'),
  stallOpen: (pid) => request(`/stall/open?player_id=${pid}`, 'POST'),
  stallClose: (pid) => request(`/stall/close?player_id=${pid}`, 'POST'),
  healthCheck: () => request('/', 'GET'),
  savePlayer: (pid) => request(`/player/online?player_id=${pid}`, 'POST'),
  instanceEnter: (pid, map) => request(`/instance/enter?player_id=${pid}&map_name=${encodeURIComponent(map)}`, 'POST'),
  instanceExit: (pid) => request(`/instance/exit?player_id=${pid}`, 'POST'),
  tick: (pid, map) => request(`/game/tick?player_id=${pid}&map_region=${map}`, 'POST'),
  plantGrowth: (pid, weather) => request(`/plant/growth?player_id=${pid}&weather_str=${weather || '晴天'}`, 'POST'),
  plantHarvest: (pid) => request(`/plant/harvest?player_id=${pid}`, 'POST'),
};
