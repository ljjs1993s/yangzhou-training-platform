import { api } from '../api.js';

export async function renderMessageCenter() {
  const content = document.querySelector('.admin-content');
  if (!content) { console.error('MC: admin-content not found'); return; }

  // Load config & templates
  let msgCfg = {}, templates = [];
  try {
    msgCfg = await api.getMessageConfig();
  } catch(e) {
    console.error('MC: getMessageConfig failed:', e.message, e.stack);
    content.innerHTML = '<div class="empty-state"><div class="empty-icon">❌</div><h4>加载配置失败</h4><p>getMessageConfig: ' + window.escapeHtml(e.message) + '</p></div>';
    return;
  }
  try {
    templates = await api.getMessageTemplates();
  } catch(e) {
    console.error('MC: getMessageTemplates failed:', e.message, e.stack);
    content.innerHTML = '<div class="empty-state"><div class="empty-icon">❌</div><h4>加载模板失败</h4><p>getMessageTemplates: ' + window.escapeHtml(e.message) + '</p></div>';
    return;
  }

  const pushCfg = msgCfg.push_config || {};
  const filterCfg = msgCfg.filter_settings || {};

  // State
  let currentTab = 'compose';
  let selectedUsers = [];
  let allUsers = [];

  content.innerHTML = `
    <div class="admin-content-header"><h2>📨 消息中心</h2></div>
    <div class="tabs mb-6" id="mc-tabs">
      <button class="tab active" onclick="window.switchMCTab('compose')">✍️ 发送消息</button>
      <button class="tab" onclick="window.switchMCTab('history')">📋 发送记录</button>
      <button class="tab" onclick="window.switchMCTab('delivery')">📊 送达追踪</button>
    </div>
    <div id="mc-tab-content"></div>
  `;

  // ===== Tab: Compose =====
  const renderCompose = () => {
    const activeMethods = [];
    if (pushCfg.wechat && pushCfg.wechat.enabled !== false) activeMethods.push('wechat');
    if (pushCfg.sms && pushCfg.sms.enabled) activeMethods.push('sms');
    if (pushCfg.email && pushCfg.email.enabled !== false) activeMethods.push('email');
    // Default select all enabled
    const selectedMethods = [...activeMethods];

    const methodLabels = { wechat: '💚 微信', sms: '📱 短信', email: '📧 邮件' };

    return `
    <div class="msg-compose-layout">
      <div class="msg-compose-main">
        <div class="form-group">
          <label class="form-label">消息标题 <span style="color:var(--color-error)">*</span></label>
          <input class="form-input" id="mc-title" placeholder="请输入消息标题">
        </div>
        <div class="form-group">
          <label class="form-label">消息内容 <span style="color:var(--color-error)">*</span></label>
          <textarea class="form-textarea" id="mc-content" rows="6" placeholder="支持变量替换，如 {name}、{course}、{start_time}、{cost}、{progress}"></textarea>
        </div>
        <div id="mc-preview-box" class="msg-preview-box" style="display:none">
          <div class="msg-preview-title">📝 消息预览</div>
          <div class="msg-preview-content" id="mc-preview-content"></div>
        </div>
        <div class="msg-send-options">
          <div class="msg-option-row">
            <span class="msg-option-label">消息模板</span>
            <select class="form-select" id="mc-template" onchange="window.applyMcTemplate()" style="width:220px">
              <option value="">-- 不使用模板 --</option>
              ${templates.filter(t=>t.status==='active').map(t=>`<option value="${t.id}">${window.escapeHtml(t.name)} (${t.type==='wechat'?'微信':t.type==='sms'?'短信':'邮件'})</option>`).join('')}
            </select>
          </div>
          <div class="msg-option-row">
            <span class="msg-option-label">推送方式 <span style="color:var(--color-error)">*</span></span>
            <div class="flex gap-3" id="mc-methods">
              ${activeMethods.map(m => `<label class="radio-label" style="cursor:pointer"><input type="checkbox" name="mc-method" value="${m}" checked> ${methodLabels[m]||m}</label>`).join('')}
              ${activeMethods.length===0?'<span class="text-sm text-muted">⚠ 请先在消息配置中启用推送方式</span>':''}
            </div>
          </div>
          <div class="msg-option-row">
            <span class="msg-option-label">发送类型</span>
            <div class="flex gap-3">
              <label class="radio-label" style="cursor:pointer"><input type="radio" name="mc-send-type" value="now" checked onchange="window.toggleMcSchedule()"> 立即发送</label>
              <label class="radio-label" style="cursor:pointer"><input type="radio" name="mc-send-type" value="delayed" onchange="window.toggleMcSchedule()"> 延迟发送</label>
            </div>
          </div>
          <div class="msg-option-row" id="mc-schedule-row" style="display:none">
            <span class="msg-option-label">发送时间</span>
            <input class="form-input" type="datetime-local" id="mc-scheduled-at" style="width:220px">
          </div>
          <div class="msg-option-row">
            <span class="msg-option-label">推送策略</span>
            <div class="flex gap-3">
              <label class="radio-label" style="cursor:pointer"><input type="radio" name="mc-strategy" value="once" checked> 单次推送</label>
              <label class="radio-label" style="cursor:pointer"><input type="radio" name="mc-strategy" value="automated"> 自动策略</label>
            </div>
          </div>
          <div class="msg-option-row" id="mc-strategy-row" style="display:none">
            <span class="msg-option-label">触发条件</span>
            <select class="form-select" id="mc-strategy-trigger" style="width:220px">
              <option value="enroll">学员报名时</option>
              <option value="complete">课程完成时</option>
              <option value="cert">证书颁发时</option>
              <option value="expire">即将过期提醒</option>
            </select>
          </div>
        </div>
        <div class="msg-compose-actions">
          <button class="btn btn-outline" onclick="window.clearMcCompose()">清空</button>
          <button class="btn btn-primary btn-lg" onclick="window.sendMcMessage()" style="flex:1">🚀 发送消息</button>
        </div>
      </div>
      <div class="msg-recipient-panel">
        <div class="msg-recipient-header">
          <h4 style="margin:0">选择收件人</h4>
          <span class="badge badge-primary" id="mc-selected-count">已选 0 人</span>
        </div>
        <div class="msg-recipient-search">
          <input class="form-input" id="mc-user-search" placeholder="🔍 搜索姓名/手机号..." oninput="window.searchMcUsers()">
        </div>
        <div class="msg-recipient-filters flex gap-2 mb-2">
          <select class="form-select form-select-sm" id="mc-role-filter" onchange="window.searchMcUsers()" style="flex:1">
            <option value="">全部角色</option>
            <option value="student">学员</option>
            <option value="teacher">教师</option>
            <option value="admin">管理员</option>
          </select>
          <button class="btn btn-outline btn-sm" onclick="window.toggleMcSelectAll()" id="mc-select-all-btn">全选</button>
        </div>
        <div class="msg-recipient-list" id="mc-user-list">
          <div class="skeleton skeleton-text" style="height:40px"></div>
          <div class="skeleton skeleton-text" style="height:40px"></div>
          <div class="skeleton skeleton-text" style="height:40px"></div>
        </div>
      </div>
    </div>`;
  };

  // ===== Tab: History =====
  const renderHistory = () => `
    <div class="admin-content-header" style="padding:0;margin-bottom:16px">
      <div class="flex gap-2" style="align-items:center">
        <input class="form-input" id="mh-search" placeholder="搜索消息标题..." style="width:240px" oninput="window.loadMcHistory()">
        <select class="form-select" id="mh-status" style="width:140px" onchange="window.loadMcHistory()">
          <option value="">全部状态</option>
          <option value="pending">待发送</option>
          <option value="sending">发送中</option>
          <option value="sent">已发送</option>
          <option value="partial">部分失败</option>
          <option value="failed">发送失败</option>
        </select>
      </div>
    </div>
    <div class="table-container">
      <table class="table">
        <thead><tr>
          <th>消息标题</th><th>模板</th><th>目标人数</th><th>推送方式</th><th>策略</th><th>状态</th><th>时间</th><th>操作</th>
        </tr></thead>
        <tbody id="mc-history-body"><tr><td colspan="8" class="text-center"><div class="skeleton skeleton-text"></div></td></tr></tbody>
      </table>
    </div>`;

  // ===== Tab: Delivery =====
  const renderDelivery = () => `
    <div class="admin-content-header" style="padding:0;margin-bottom:16px">
      <div class="flex gap-2" style="align-items:center">
        <select class="form-select" id="md-message" style="width:300px" onchange="window.loadMcDelivery()">
          <option value="">-- 选择一条消息查看送达情况 --</option>
        </select>
      </div>
    </div>
    <div id="mc-delivery-content">
      <div class="empty-state"><div class="empty-icon">📊</div><h4>请选择一条已发送的消息</h4><p>查看每条消息的送达详情和用户状态</p></div>
    </div>`;

  // Render current tab
  const tabRenderers = { compose: renderCompose, history: renderHistory, delivery: renderDelivery };
  document.getElementById('mc-tab-content').innerHTML = tabRenderers[currentTab]();

  // ===== Global Tab Switch =====
  window.switchMCTab = (tab) => {
    currentTab = tab;
    document.querySelectorAll('#mc-tabs .tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#mc-tabs .tab').forEach(t => {
      if (t.textContent.includes(tab === 'compose' ? '发送消息' : tab === 'history' ? '发送记录' : '送达追踪')) t.classList.add('active');
    });
    document.getElementById('mc-tab-content').innerHTML = tabRenderers[tab]();
    if (tab === 'compose') initCompose();
    if (tab === 'history') loadMcHistory();
    if (tab === 'delivery') loadDeliveryMessages();
  };

  // ===== Compose Logic =====
  function initCompose() {
    selectedUsers = [];
    searchMcUsers();
  }

  window.searchMcUsers = async () => {
    const q = document.getElementById('mc-user-search')?.value || '';
    const role = document.getElementById('mc-role-filter')?.value || '';
    try {
      allUsers = await api.searchUsers({ q, role, status: 'active', limit: 100 });
      renderUserList();
    } catch(e) { console.error(e); }
  };

  function renderUserList() {
    const list = document.getElementById('mc-user-list');
    if (!list) return;
    if (!allUsers.length) {
      list.innerHTML = '<div class="empty-state" style="padding:20px"><p>未找到用户</p></div>';
      return;
    }
    const roleLabels = { admin: '管理员', teacher: '教师', student: '学员' };
    list.innerHTML = allUsers.map(u => `
      <label class="msg-recipient-item ${selectedUsers.includes(u.id)?'selected':''}">
        <input type="checkbox" value="${u.id}" ${selectedUsers.includes(u.id)?'checked':''} onchange="window.toggleMcUser(${u.id},this.checked)">
        <span class="msg-recipient-avatar">${(u.realname||u.username||'?')[0]}</span>
        <span class="msg-recipient-name">${window.escapeHtml(u.realname||u.username)}</span>
        <span class="badge badge-sm ${u.role==='admin'?'badge-error':u.role==='teacher'?'badge-warning':'badge-info'}">${roleLabels[u.role]||u.role}</span>
        <span class="text-sm text-muted" style="margin-left:auto">${u.phone||''}</span>
      </label>
    `).join('');
    updateSelectedCount();
  }

  window.toggleMcUser = (id, checked) => {
    if (checked) {
      if (!selectedUsers.includes(id)) selectedUsers.push(id);
    } else {
      selectedUsers = selectedUsers.filter(uid => uid !== id);
    }
    updateSelectedCount();
    // Update item highlight
    const items = document.querySelectorAll('.msg-recipient-item');
    items.forEach(item => {
      const cb = item.querySelector('input[type="checkbox"]');
      if (cb && Number(cb.value) === id) {
        item.classList.toggle('selected', checked);
      }
    });
  };

  window.toggleMcSelectAll = () => {
    const btn = document.getElementById('mc-select-all-btn');
    if (selectedUsers.length === allUsers.length) {
      selectedUsers = [];
      btn.textContent = '全选';
    } else {
      selectedUsers = allUsers.map(u => u.id);
      btn.textContent = '取消';
    }
    renderUserList();
  };

  function updateSelectedCount() {
    const el = document.getElementById('mc-selected-count');
    const btn = document.getElementById('mc-select-all-btn');
    if (el) el.textContent = '已选 ' + selectedUsers.length + ' 人';
    if (btn) btn.textContent = selectedUsers.length === allUsers.length && allUsers.length > 0 ? '取消' : '全选';
  }

  window.toggleMcSchedule = () => {
    const type = document.querySelector('input[name="mc-send-type"]:checked')?.value;
    const row = document.getElementById('mc-schedule-row');
    if (row) row.style.display = type === 'delayed' ? '' : 'none';
  };

  // Auto strategy toggle
  document.addEventListener('change', (e) => {
    if (e.target.name === 'mc-strategy') {
      const row = document.getElementById('mc-strategy-row');
      if (row) row.style.display = e.target.value === 'automated' ? '' : 'none';
    }
  });

  window.applyMcTemplate = () => {
    const tid = document.getElementById('mc-template')?.value;
    if (!tid) return;
    const t = templates.find(x => x.id === Number(tid));
    if (!t) return;
    document.getElementById('mc-title').value = t.title || '';
    document.getElementById('mc-content').value = t.content || '';
    // Select matching method
    if (t.type) {
      const cbs = document.querySelectorAll('input[name="mc-method"]');
      cbs.forEach(cb => { cb.checked = cb.value === t.type; });
    }
    window.showToast('模板已应用', 'info');
  };

  window.clearMcCompose = () => {
    document.getElementById('mc-title').value = '';
    document.getElementById('mc-content').value = '';
    document.getElementById('mc-template').value = '';
    selectedUsers = [];
    renderUserList();
  };

  window.sendMcMessage = async () => {
    const title = document.getElementById('mc-title').value.trim();
    const content = document.getElementById('mc-content').value.trim();
    if (!title) { window.showToast('请输入消息标题', 'warning'); return; }
    if (!content) { window.showToast('请输入消息内容', 'warning'); return; }

    // Get selected methods
    const methods = [];
    document.querySelectorAll('input[name="mc-method"]:checked').forEach(cb => methods.push(cb.value));
    if (!methods.length) { window.showToast('请至少选择一种推送方式', 'warning'); return; }

    if (!selectedUsers.length) { window.showToast('请至少选择一个收件人', 'warning'); return; }

    // Check keyword filter
    const keywords = (filterCfg.keywords || '').split(',').map(s => s.trim()).filter(Boolean);
    for (const kw of keywords) {
      if (content.includes(kw) || title.includes(kw)) {
        window.showToast('消息包含过滤关键词: ' + kw, 'warning');
        return;
      }
    }

    // Check DND
    const now = new Date();
    const hhmm = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
    const dndStart = filterCfg.dndStart || '22:00';
    const dndEnd = filterCfg.dndEnd || '08:00';
    let inDnd = false;
    if (dndStart <= dndEnd) {
      inDnd = hhmm >= dndStart && hhmm <= dndEnd;
    } else {
      inDnd = hhmm >= dndStart || hhmm <= dndEnd;
    }
    if (inDnd) {
      window.showToast('当前处于免打扰时段（' + dndStart + ' ~ ' + dndEnd + '），消息将延迟到非免打扰时段发送', 'warning');
    }

    // Get schedule
    const sendType = document.querySelector('input[name="mc-send-type"]:checked')?.value;
    let scheduledAt = null;
    if (sendType === 'delayed') {
      scheduledAt = document.getElementById('mc-scheduled-at')?.value;
      if (!scheduledAt) { window.showToast('请选择延迟发送时间', 'warning'); return; }
      scheduledAt = scheduledAt.replace('T', ' ');
    }

    // Get strategy
    const strategy = document.querySelector('input[name="mc-strategy"]:checked')?.value || 'once';
    let strategyRule = null;
    if (strategy === 'automated') {
      const trigger = document.getElementById('mc-strategy-trigger')?.value || 'enroll';
      strategyRule = { trigger, template_id: Number(document.getElementById('mc-template')?.value) || null };
    }

    const tid = document.getElementById('mc-template')?.value;
    const templateId = tid ? Number(tid) : null;

    try {
      const result = await api.createMessageQueue({
        title, content, template_id: templateId,
        push_methods: methods,
        target_user_ids: selectedUsers,
        strategy, strategy_rule: strategyRule,
        scheduled_at: scheduledAt
      });
      const statusLabel = { pending: '已加入发送队列', sending: '发送中', sent: '发送成功', partial: '部分发送失败', failed: '发送失败' };
      window.showToast(statusLabel[result.status] || '消息已创建', result.status === 'sent' ? 'success' : 'info');
      // Clear form
      window.clearMcCompose();
      // Switch to history
      window.switchMCTab('history');
    } catch(e) {
      window.showToast('发送失败: ' + (e.message || '请稍后重试'), 'error');
    }
  };

  // ===== History Logic =====
  window.loadMcHistory = async () => {
    const q = document.getElementById('mh-search')?.value || '';
    const status = document.getElementById('mh-status')?.value || '';
    try {
      const messages = await api.getMessageQueues({ q, status });
      renderHistoryTable(messages);
    } catch(e) { console.error(e); }
  };

  function renderHistoryTable(messages) {
    const tbody = document.getElementById('mc-history-body');
    if (!tbody) return;
    if (!messages.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">暂无发送记录</td></tr>';
      return;
    }
    const statusMap = {
      pending: '<span class="badge badge-warning">待发送</span>',
      sending: '<span class="badge badge-info">发送中</span>',
      sent: '<span class="badge badge-success">已发送</span>',
      partial: '<span class="badge badge-warning">部分失败</span>',
      failed: '<span class="badge badge-error">发送失败</span>'
    };
    const methodLabels = { wechat: '💚', sms: '📱', email: '📧' };

    tbody.innerHTML = messages.map(m => `<tr>
      <td><strong>${window.escapeHtml(m.title||'')}</strong></td>
      <td><span class="badge badge-info">${m.template_id?'模板#'+m.template_id:'自定义'}</span></td>
      <td>${m.target_user_ids?.length||0} 人</td>
      <td>${(m.push_methods||[]).map(x=>methodLabels[x]||x).join(' ')}</td>
      <td>${m.strategy==='automated'?'<span class="badge badge-info">自动</span>':'<span class="badge">单次</span>'}</td>
      <td>${statusMap[m.status]||m.status}</td>
      <td style="font-size:0.8rem">
        ${m.scheduled_at?'<div>计划: '+m.scheduled_at+'</div>':''}
        ${m.sent_at?'<div>发送: '+m.sent_at+'</div>':''}
        ${m.created_at?'<div>创建: '+m.created_at+'</div>':''}
      </td>
      <td>
        <div class="flex gap-1">
          ${m.status==='pending'?`<button class="btn btn-outline btn-sm" onclick="window.retryMcSend(${m.id})">发送</button>`:''}
          <button class="btn btn-outline btn-sm" onclick="window.viewMcDetail(${m.id})">详情</button>
          ${m.status==='pending'?`<button class="btn btn-outline btn-sm" style="color:var(--color-error)" onclick="window.cancelMcMessage(${m.id})">取消</button>`:''}
        </div>
      </td>
    </tr>`).join('');
  }

  window.retryMcSend = async (id) => {
    try {
      const r = await api.sendMessage(id);
      window.showToast('发送完成: 成功' + r.sent_count + '条，失败' + r.failed_count + '条', r.failed_count>0?'warning':'success');
      window.loadMcHistory();
    } catch(e) { window.showToast('发送失败: ' + e.message, 'error'); }
  };

  window.cancelMcMessage = async (id) => {
    window.showModal({
      title: '确认取消', width: '360px',
      content: '<p>确定取消这条待发送的消息吗？</p>',
      confirmText: '取消发送', confirmClass: 'btn-error',
      onConfirm: async () => {
        try {
          await api.deleteMessageQueue(id);
          window.showToast('消息已取消', 'success');
          window.loadMcHistory();
        } catch(e) { window.showToast('取消失败', 'error'); }
      }
    });
  };

  window.viewMcDetail = async (id) => {
    try {
      const m = await api.getMessageQueue(id);
      const statusMap = { pending: '待发送', sending: '发送中', sent: '已发送', partial: '部分失败', failed: '发送失败' };
      const methodLabels = { wechat: '微信', sms: '短信', email: '邮件' };
      const results = (m.send_results || []).slice(0, 50); // limit display
      window.showModal({
        title: '消息详情', width: '600px',
        content: `
          <div class="form-group"><label class="form-label">标题</label><p>${window.escapeHtml(m.title||'')}</p></div>
          <div class="form-group"><label class="form-label">内容</label><p style="white-space:pre-wrap;background:var(--color-bg);padding:8px;border-radius:4px">${window.escapeHtml(m.content||'')}</p></div>
          <div class="settings-grid" style="grid-template-columns:repeat(4,1fr)">
            <div><span class="text-sm text-muted">状态</span><div>${statusMap[m.status]||m.status}</div></div>
            <div><span class="text-sm text-muted">目标</span><div>${m.target_user_ids?.length||0} 人</div></div>
            <div><span class="text-sm text-muted">成功</span><div style="color:var(--color-success)">${m.sent_count||0}</div></div>
            <div><span class="text-sm text-muted">失败</span><div style="color:var(--color-error)">${m.failed_count||0}</div></div>
          </div>
          <div class="form-group"><label class="form-label">推送方式</label><p>${(m.push_methods||[]).map(x=>methodLabels[x]||x).join('、')}</p></div>
          ${m.scheduled_at?`<div class="form-group"><label class="form-label">计划发送</label><p>${m.scheduled_at}</p></div>`:''}
          ${m.sent_at?`<div class="form-group"><label class="form-label">实际发送</label><p>${m.sent_at}</p></div>`:''}
          ${results.length > 0 ? `
          <div class="form-group"><label class="form-label">发送明细（前50条）</label>
            <div style="max-height:200px;overflow-y:auto">
              <table class="table"><thead><tr><th>用户</th><th>方式</th><th>状态</th><th>时间</th></tr></thead>
              <tbody>${results.map(r=>`<tr>
                <td>${window.escapeHtml(r.user_name||'用户#'+r.user_id)}</td>
                <td>${methodLabels[r.method]||r.method}</td>
                <td><span class="badge ${r.status==='sent'?'badge-success':'badge-error'}">${r.status==='sent'?'成功':'失败'}</span></td>
                <td style="font-size:0.75rem">${r.sent_at||'-'}</td>
              </tr>`).join('')}</tbody></table>
            </div>
          </div>` : ''}
          ${results.length < (m.send_results||[]).length ? `<p class="text-sm text-muted">...还有 ${(m.send_results||[]).length - results.length} 条记录</p>` : ''}
        `,
        confirmText: '关闭'
      });
    } catch(e) { window.showToast('加载失败', 'error'); }
  };

  // ===== Delivery Logic =====
  async function loadDeliveryMessages() {
    const sel = document.getElementById('md-message');
    if (!sel) return;
    try {
      const messages = await api.getMessageQueues({});
      const sent = messages.filter(m => m.status === 'sent' || m.status === 'partial');
      sel.innerHTML = '<option value="">-- 选择一条消息查看送达情况 --</option>' +
        sent.map(m => `<option value="${m.id}">${window.escapeHtml(m.title||'消息#'+m.id)} - ${m.sent_at||m.created_at||''}</option>`).join('');
    } catch(e) {}
  }

  window.loadMcDelivery = async () => {
    const id = document.getElementById('md-message')?.value;
    const container = document.getElementById('mc-delivery-content');
    if (!id || !container) {
      if (container) container.innerHTML = '<div class="empty-state"><div class="empty-icon">📊</div><h4>请选择一条已发送的消息</h4></div>';
      return;
    }
    try {
      const d = await api.getDeliveryDetail(id);
      const methodLabels = { wechat: '微信', sms: '短信', email: '邮件' };
      const successRate = d.total_count > 0 ? Math.round(d.sent_count / d.total_count * 100) : 0;

      container.innerHTML = `
        <div class="msg-delivery-header">
          <h4 style="margin:0">${window.escapeHtml(d.title||'消息送达详情')}</h4>
          <span class="badge ${d.status==='sent'?'badge-success':'badge-warning'}">${d.status==='sent'?'全部送达':'部分送达'}</span>
        </div>
        <div class="msg-delivery-stats">
          <div class="stat-card"><div class="stat-value">${d.total_count||0}</div><div class="stat-label">总发送量</div></div>
          <div class="stat-card" style="border-color:var(--color-success)"><div class="stat-value" style="color:var(--color-success)">${d.sent_count||0}</div><div class="stat-label">已送达</div></div>
          <div class="stat-card" style="border-color:var(--color-error)"><div class="stat-value" style="color:var(--color-error)">${d.failed_count||0}</div><div class="stat-label">发送失败</div></div>
          <div class="stat-card" style="border-color:var(--color-info)"><div class="stat-value" style="color:var(--color-info)">${d.read_count||0}</div><div class="stat-label">已读</div></div>
          <div class="stat-card"><div class="stat-value">${successRate}%</div><div class="stat-label">送达率</div></div>
        </div>
        <div class="progress-bar" style="margin-bottom:16px"><div class="progress-fill" style="width:${successRate}%;background:${successRate>=90?'var(--color-success)':successRate>=50?'var(--color-warning)':'var(--color-error)'}"></div></div>
        <div class="table-container">
          <table class="table"><thead><tr><th>收件人</th><th>角色</th>
            ${(d.push_methods||[]).map(m=>`<th>${methodLabels[m]||m}</th>`).join('')}
            <th>状态汇总</th>
          </tr></thead>
          <tbody>
            ${groupDeliveryByUser(d.results||[], d.push_methods||[]).map(row => `<tr>
              <td><strong>${window.escapeHtml(row.user_name)}</strong><br><span class="text-sm text-muted">${row.user_phone||''}</span></td>
              <td><span class="badge badge-sm ${row.user_role==='admin'?'badge-error':row.user_role==='teacher'?'badge-warning':'badge-info'}">${row.user_role==='admin'?'管理员':row.user_role==='teacher'?'教师':'学员'}</span></td>
              ${row.methods.map(m=>renderStatusCell(m)).join('')}
              <td>${row.allSent?'<span class="badge badge-success">全部送达</span>':row.allFailed?'<span class="badge badge-error">全部失败</span>':'<span class="badge badge-warning">部分送达</span>'}</td>
            </tr>`).join('')}
          </tbody></table>
        </div>
      `;
    } catch(e) { container.innerHTML = '<div class="empty-state"><h4>加载失败</h4></div>'; }
  };

  function renderStatusCell(m) {
    if (m.status === 'sent') {
      return '<td><span style="color:var(--color-success)">✅</span></td>';
    }
    if (m.status === 'failed') {
      const errTitle = window.escapeHtml(m.error || '');
      return '<td><span style="color:var(--color-error)" title="' + errTitle + '">❌</span></td>';
    }
    return '<td><span style="color:var(--color-text-muted)">⏳</span></td>';
  }

  function groupDeliveryByUser(results, methods) {
    const map = {};
    (results||[]).forEach(r => {
      if (!map[r.user_id]) map[r.user_id] = { user_id: r.user_id, user_name: r.user_name, user_phone: r.user_phone, user_role: r.user_role, methods: {} };
      map[r.user_id].methods[r.method] = r;
    });
    return Object.values(map).map(row => {
      const methodResults = (methods||[]).map(m => row.methods[m] || { status: 'pending', error: null });
      const allSent = methodResults.every(m => m.status === 'sent');
      const allFailed = methodResults.every(m => m.status === 'failed');
      return { ...row, methods: methodResults, allSent, allFailed };
    });
  }

  // Init compose
  if (currentTab === 'compose') initCompose();
  if (currentTab === 'history') setTimeout(() => window.loadMcHistory(), 100);
  if (currentTab === 'delivery') setTimeout(() => loadDeliveryMessages(), 100);
}
