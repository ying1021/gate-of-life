// ========== 常量配置 ==========
const CONFIG = {
  // 尺寸
  STATUS_BAR_HEIGHT: 40,
  FONT_SIZE: 13,
  LINE_HEIGHT: 20,
  PADDING: 10,
  BOX_PADDING: 8,
  BOX_SPACING: 4,
  MAX_MESSAGES: 200,

  // 按钮
  BTN_COLOR: '#2a3a4a',
  BTN_H: 30,

  // 消息类型颜色
  TYPE_COLORS: {
    system: '#c8b878',
    battle: '#cc5544',
    heal: '#88bb88',
    event: '#ddcc88',
    inner: '#aa88cc',
    normal: '#999999',
  },

  // 水域地图
  WATER_MAPS: ['淡水水域', '海水水域', '污水水域', '浅水水域', '湖滨芦苇荡', '跨海长桥', '沉船深海遗迹'],

  // 营业物种
  STALL_SPECIES: ['人类', '狐', '浣熊', '猩猩', '乌鸦', '兔', '鹿', '羊', '马', '牛', '树懒', '考拉'],

  // 战斗
  ENEMIES: ['兔', '鹿', '狐', '鼠', '蛙', '蛇', '鹰', '狼'],
  ATTACK_DESCS: [
    '突然，那只{enemy}猛地向你扑来！',
    '{enemy}发出低沉的威胁声，朝你冲了过来！',
    '毫无征兆地，{enemy}从侧面发起了突袭！',
    '{enemy}似乎把你当成了猎物，发起了攻击！',
  ],
  REACTIONS: ['attack', 'flee', 'ignore'],
  REACTION_WEIGHTS: [0.5, 0.3, 0.2],

  // 专精
  SPEC_POINTS_INTERVAL: 5,
  SPEC_NAMES: ['气候抗性', '水域适应', '体质强化', '生态适应', '生存博弈', '野外捕猎'],

  // 任务
  QUESTS: {
    '初来乍到': { condition: 'create', target: 1, reward: {}, msg: '你降临在这片众生之域。' },
    '初次探索': { condition: 'explore', target: 1, reward: { exp: 20 }, msg: '你探索了周围的环境。' },
    '收集物资': { condition: 'inventory', target: 3, reward: { '净水': 2 }, msg: '你的背包渐渐充实起来。' },
    '安营扎寨': { condition: 'build', target: 1, reward: { '木材': 5 }, msg: '你建起了简易营地。' },
    '初次战斗': { condition: 'battle', target: 1, reward: { exp: 50 }, msg: '你经历了第一场战斗。' },
  },
  CONFIG.PLANT_SPECIES = ['橡树', '竹', '蔷薇', '藤蔓', '仙人掌', '菌菇', '海带', '芦苇', '猪笼草', '含羞草', '捕蝇草', '银杏', '香菇', '灵芝', '木耳', '银耳', '冬虫夏草', '毒蝇伞', '马勃菌'];
};
