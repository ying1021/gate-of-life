// ========== 登录 / 注册 / 角色选择 ==========

const AUTH_TOKEN_KEY = 'authToken';

function getToken() { return localStorage.getItem(AUTH_TOKEN_KEY); }
function setToken(token) { localStorage.setItem(AUTH_TOKEN_KEY, token); }
function clearToken() { localStorage.removeItem(AUTH_TOKEN_KEY); }

function showAuthError(message) {
  document.getElementById('authError').textContent = message || '';
}

function showCharError(message) {
  document.getElementById('charError').textContent = message || '';
}

// 任意接口返回 401 时由 api.js 调用
function handleUnauthorized(failedToken) {
  if (getToken() && failedToken !== getToken()) return;
  clearToken();
  if (typeof stopTickTimer === 'function') stopTickTimer();
  if (typeof clearLocal === 'function') clearLocal();
  playerData = null;
  currentView = 'login';
  Auth.session++;
  Auth.entering = false;
  const newBtn = document.getElementById('newCharBtn');
  if (newBtn) newBtn.disabled = false;
  Auth.resetPopup();
  Auth.showLogin('登录已过期，请重新登录');
}

const Auth = {
  mode: 'login',
  session: 0,
  entering: false,

  resetPopup() {
    popupMode = null;
    popupData = [];
    popupTitle = '';
    selectedIndex = 0;
  },

  async init() {
    const token = getToken();
    if (!token) { this.showLogin(); return; }
    const me = await API.me();
    if (getToken() !== token) return; // 期间已重新登录，交给新流程
    if (!me || !me.id) {
      // 401 已由 handleUnauthorized 清除令牌；网络故障时保留令牌，刷新后可重试
      if (getToken()) this.showLogin('无法连接服务器，请刷新重试');
      return;
    }
    await this.showCharacters();
  },

  showLogin(message) {
    document.getElementById('authOverlay').classList.remove('hidden');
    document.getElementById('charOverlay').classList.add('hidden');
    this.setMode('login');
    showAuthError(message);
  },

  showCharacters: async function() {
    const session = this.session;
    document.getElementById('authOverlay').classList.add('hidden');
    document.getElementById('charOverlay').classList.remove('hidden');
    showCharError('');
    const listEl = document.getElementById('charList');
    listEl.innerHTML = '';
    if (typeof apiCache !== 'undefined') apiCache.clear();

    const result = await API.playerList();
    if (session !== this.session) return;
    if (!result || !result.players) { showCharError('加载角色失败，请重试'); return; }

    if (result.players.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = '还没有角色，先创建一个吧。';
      listEl.appendChild(empty);
      return;
    }

    for (const player of result.players) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'char-card';
      const map = player.current_map || '未知';
      const time = String(player.updated_at || '').replace('T', ' ').slice(0, 16);
      card.textContent = `${player.species || '未知'}  Lv.${player.level || 1}  · ${map}  · ${time}`;
      card.addEventListener('click', () => this.enterGame(player.id));
      listEl.appendChild(card);
    }
  },

  enterGame: async function(playerId) {
    if (this.entering) return;
    this.entering = true;
    const session = this.session;
    try {
      showCharError('');
      const result = await API.playerState(playerId);
      if (session !== this.session) return;
      if (!result || !result['玩家状态']) { showCharError('进入游戏失败，请重试'); return; }

      playerData = result['玩家状态'];
      if (!playerData.inventory) playerData.inventory = {};
      if (!playerData.vital) {
        playerData.vital = { '生命机能': 100, '体力耐力': 100, '饱腹值': 100, '精神状态': 100 };
      }
      if (!playerData.current_map) playerData.current_map = '城郊青草地';

      this.resetPopup();
      document.getElementById('charOverlay').classList.add('hidden');
      document.getElementById('authOverlay').classList.add('hidden');
      currentView = 'main';
      clearScreen();
      addMessage('你回到了众生之域。', 'system');
      startTickTimer();
      drawScreen();
    } finally {
      if (session === this.session) this.entering = false;
    }
  },

  newCharacter: async function() {
    if (this.entering) return;
    this.entering = true;
    const session = this.session;
    const btn = document.getElementById('newCharBtn');
    showCharError('');
    btn.disabled = true;
    try {
      const result = await API.newLife();
      if (session !== this.session) return;
      if (!result || !result['玩家状态']) { showCharError('创建角色失败，请重试'); return; }

      playerData = result['玩家状态'];
      if (!playerData.inventory || Object.keys(playerData.inventory).length === 0) {
        playerData.inventory = { '野果': 2, '草药绷带': 1, '生锈的铁刀': 1 };
      }
      if (!playerData.vital) {
        playerData.vital = { '生命机能': 100, '体力耐力': 100, '饱腹值': 100, '精神状态': 100 };
      }
      if (!playerData.current_map) playerData.current_map = '城郊青草地';
      if (!playerData.quests) playerData.quests = {};
      playerData.quests['初来乍到'] = { '完成': true, '进度': 1 };

      this.resetPopup();
      document.getElementById('charOverlay').classList.add('hidden');
      document.getElementById('authOverlay').classList.add('hidden');
      currentView = 'main';
      clearScreen();
      addMessage(result['叙事文字'] || result.msg, 'system');
      startTickTimer();
      if (typeof saveLocal === 'function') saveLocal();
      drawScreen();
    } finally {
      btn.disabled = false;
      if (session === this.session) this.entering = false;
    }
  },

  logout: function() {
    clearToken();
    if (typeof stopTickTimer === 'function') stopTickTimer();
    if (typeof clearLocal === 'function') clearLocal();
    this.session++;
    this.entering = false;
    const newBtn = document.getElementById('newCharBtn');
    if (newBtn) newBtn.disabled = false;
    this.resetPopup();
    playerData = null;
    currentView = 'login';
    this.showLogin();
  },

  setMode(mode) {
    this.mode = mode;
    document.getElementById('tabLogin').classList.toggle('active', mode === 'login');
    document.getElementById('tabRegister').classList.toggle('active', mode === 'register');
    document.getElementById('authPassword2').classList.toggle('hidden', mode !== 'register');
    document.getElementById('authSubmit').textContent = mode === 'register' ? '注册' : '登录';
    document.getElementById('authPassword').autocomplete = mode === 'register' ? 'new-password' : 'current-password';
    showAuthError('');
  },

  async submit() {
    const submitBtn = document.getElementById('authSubmit');
    if (submitBtn.disabled) return;
    submitBtn.disabled = true;
    try {
      const username = document.getElementById('authUsername').value.trim();
      const password = document.getElementById('authPassword').value;
      showAuthError('');

      if (this.mode === 'register') {
        const password2 = document.getElementById('authPassword2').value;
        if (password !== password2) { showAuthError('两次输入的密码不一致'); return; }
        const result = await API.register(username, password);
        if (result && result.access_token) {
          setToken(result.access_token);
          document.getElementById('authForm').reset();
          await this.showCharacters();
        } else {
          showAuthError((result && result.error) || '注册失败');
        }
        return;
      }

      const result = await API.login(username, password);
      if (result && result.access_token) {
        setToken(result.access_token);
        document.getElementById('authForm').reset();
        await this.showCharacters();
      } else {
        showAuthError((result && result.error) || '登录失败');
      }
    } finally {
      submitBtn.disabled = false;
    }
  },
};

document.getElementById('tabLogin').addEventListener('click', () => Auth.setMode('login'));
document.getElementById('tabRegister').addEventListener('click', () => Auth.setMode('register'));
document.getElementById('authForm').addEventListener('submit', (event) => {
  event.preventDefault();
  Auth.submit();
});
document.getElementById('newCharBtn').addEventListener('click', () => Auth.newCharacter());
document.getElementById('logoutBtn').addEventListener('click', () => Auth.logout());
