// ========== 消息系统 ==========

const messages = [];
let scrollOffset = 0;
let msgGroupId = 0;

const MESSAGE_AREA_TOP = CONFIG.STATUS_BAR_HEIGHT + 4;
const MESSAGE_AREA_BOTTOM = H - 72;

function addMessage(text, type = 'normal') {
  if (!text) return;

  const maxWidth = W - CONFIG.PADDING * 2 - CONFIG.BOX_PADDING * 2 - 100; // 调整边距，防止超出

  const lines = text.split('\n');
  const groupId = msgGroupId++;

  for (let line of lines) {
    line = line.trim();
        let safety = 0;
        while (line.length > 0 && safety < 500) {
            safety++;
            let low = 1, high = line.length;
            if (measureCached(line) <= maxWidth) {
               messages.push({ text: line, type, group: groupId });
               break;
             }
             while (low < high) {
                  const mid = Math.floor((low + high) / 2);
                  const sub = line.substring(0, mid);
                  if (measureCached(sub) > maxWidth) high = mid;
                  else low = mid + 1;
              }
              const part = line.substring(0, low - 1);
              if (part.length > 0) messages.push({ text: part, type, group: groupId });
              line = line.substring(low - 1);
          }
   }
  // 限制消息数量
  if (messages.length > CONFIG.MAX_MESSAGES) {
    messages.splice(0, messages.length - CONFIG.MAX_MESSAGES);
  }

  scrollOffset = 0;
}

function clearScreen() {
  messages.length = 0;
  scrollOffset = 0;
  if (typeof clearTextCache === 'function') clearTextCache();
}

function showMsg(text, type = 'normal') {
  addMessage(text, type);
  drawScreen();
}

function drawMergedBox(lines, startY) {
  if (lines.length === 0) return;
  const lineH = CONFIG.LINE_HEIGHT;
  const boxP = CONFIG.BOX_PADDING;
  const boxS = CONFIG.BOX_SPACING;
  const boxH = (lineH + boxP * 2) * lines.length + boxS * (lines.length - 1);
  let maxTextWidth = 0;
  for (let { msg } of lines) {
    const tw = measureCached(msg.text);
    if (tw > maxTextWidth) maxTextWidth = tw;
  }
  const boxW = maxTextWidth + boxP * 2;
  const boxX = CONFIG.PADDING;

  ctx.fillStyle = 'rgba(20, 20, 20, 0.85)';
  roundRect(ctx, boxX, startY, boxW, boxH, 6);
  ctx.fill();
  const borderColor = CONFIG.TYPE_COLORS[lines[0].msg.type] || CONFIG.TYPE_COLORS.normal;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  roundRect(ctx, boxX, startY, boxW, boxH, 6);
  ctx.stroke();

  for (let i = 0; i < lines.length; i++) {
    ctx.fillStyle = '#d0d0c8';
    ctx.font = CONFIG.FONT_SIZE + 'px "Courier New", monospace';
    ctx.fillText(lines[i].msg.text, boxX + boxP, startY + boxP + CONFIG.FONT_SIZE + i * (lineH + boxS));
  }
}

function drawMessages() {
  const msgAreaH = MESSAGE_AREA_BOTTOM - MESSAGE_AREA_TOP;
  let visibleMessages = [];
  const unitH = CONFIG.LINE_HEIGHT + CONFIG.BOX_PADDING * 2 + CONFIG.BOX_SPACING;
  let totalMsgHeight = messages.length * unitH;
  let currentY = MESSAGE_AREA_BOTTOM - totalMsgHeight + Math.floor(scrollOffset) * unitH;

  for (let msg of messages) {
    const boxH = CONFIG.BOX_PADDING * 2 + CONFIG.LINE_HEIGHT + CONFIG.BOX_SPACING;
    if (currentY + boxH >= MESSAGE_AREA_TOP && currentY <= MESSAGE_AREA_BOTTOM) {
      visibleMessages.push({ msg, y: currentY });
    }
    currentY += boxH;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, MESSAGE_AREA_TOP, W, msgAreaH);
  ctx.clip();

  let lastGroup = -1, boxStartY = 0, boxLines = [];
  for (let { msg, y } of visibleMessages) {
    if (msg.group !== lastGroup) {
      if (boxLines.length > 0) drawMergedBox(boxLines, boxStartY);
      lastGroup = msg.group;
      boxStartY = y;
      boxLines = [{ msg, y }];
    } else {
      boxLines.push({ msg, y });
    }
  }
  if (boxLines.length > 0) drawMergedBox(boxLines, boxStartY);
  ctx.restore();

  ctx.fillStyle = '#333';
  ctx.fillRect(0, H - 72, W, 1);
  if (scrollOffset > 0) {
    ctx.fillStyle = 'rgba(200,200,200,0.3)';
    ctx.fillRect(W - 6, MESSAGE_AREA_TOP, 4, 20);
  }
}