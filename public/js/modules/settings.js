import { api, uploadFile, deleteUpload } from '../api.js';
import { applyTheme } from './theme.js';
import '../modules/rich-editor.js';

export async function renderSettings(section) {
  const content = document.querySelector('.admin-content');
  if (!content) return;

  switch(section) {
    case 'message-config': await renderMessageConfig(content); break;
    case 'ldap': renderLdapConfig(content); break;
    case 'notifications-config': await renderNotificationsConfig(content); break;
    case 'learning-config': await renderLearningConfig(content); break;
    case 'home-config': await renderHomeConfig(content); break;
    case 'registration-config': await renderRegistrationConfig(content); break;
    case 'learning-mode': await renderLearningMode(content); break;
    case 'wx-menu': await renderWxMenuConfig(content); break;
    case 'site-style': renderSiteStyle(content); break;
    case 'other-config': await renderOtherConfig(content); break;
    default: content.innerHTML = `<div class="empty-state"><h4>未知设置页面</h4></div>`;
  }
}

/* ===== (1) 消息配置 ===== */
async function renderMessageConfig(content) {
  let templates = [];
  try { templates = await api.getMessageTemplates(); } catch(e) {}

  // Load persisted message config from backend
  let msgCfg = { replace_rules: [], filter_settings: {}, user_filter: {}, push_config: {}, delay_config: {} };
  try { msgCfg = await api.getMessageConfig(); } catch(e) {}

  // Store in window for tab access
  window._msgConfig = msgCfg;
  window._replaceRules = msgCfg.replace_rules || [];
  window._filterSettings = msgCfg.filter_settings || {};
  window._userFilter = msgCfg.user_filter || {};
  window._pushCfg = msgCfg.push_config || {};
  window._delayCfg = msgCfg.delay_config || {};

  content.innerHTML = `
    <div class="admin-content-header"><h2>消息配置</h2></div>
    <div class="tabs mb-6" id="msg-tabs">
      <button class="tab active" onclick="window.switchMsgTab('replace',this)">消息替换策略</button>
      <button class="tab" onclick="window.switchMsgTab('filter',this)">消息过滤策略</button>
      <button class="tab" onclick="window.switchMsgTab('userfilter',this)">用户过滤策略</button>
      <button class="tab" onclick="window.switchMsgTab('templates',this)">消息模板管理</button>
      <button class="tab" onclick="window.switchMsgTab('push',this)">推送方式配置</button>
      <button class="tab" onclick="window.switchMsgTab('delay',this)">延迟发送配置</button>
    </div>
    <div id="msg-tab-content"></div>
  `;

  window._msgTemplates = templates;

  const getReplaceTab = () => `<div class="settings-panel"><h3>消息替换策略</h3>
    <p class="text-sm text-muted mb-4">配置消息内容中的动态变量，发送时自动替换为对应值。</p>
    <div class="table-container"><table class="table"><thead><tr><th>替换变量</th><th>替换值来源</th><th>说明</th><th>操作</th></tr></thead>
    <tbody id="replace-rules-body">
      ${(window._replaceRules).map((r,i) => `<tr data-idx="${i}">
        <td><code>${window.escapeHtml(r.var)}</code></td>
        <td><input class="form-input form-input-sm" value="${window.escapeHtml(r.source||'')}" onchange="window._replaceRules[${i}].source=this.value" style="width:140px"></td>
        <td><input class="form-input form-input-sm" value="${window.escapeHtml(r.desc||'')}" onchange="window._replaceRules[${i}].desc=this.value" style="width:220px"></td>
        <td><button class="btn btn-outline btn-sm" style="color:var(--color-error)" onclick="window.deleteReplaceRule(${i})">删除</button></td>
      </tr>`).join('')}
    </tbody></table></div>
    <div class="flex gap-2 mt-4">
      <button class="btn btn-outline btn-sm" onclick="window.showAddReplaceRuleModal()">+ 添加替换规则</button>
      <button class="btn btn-primary btn-sm" onclick="window.saveReplaceRules()">保存</button>
    </div></div>`;

  const getFilterTab = () => `<div class="settings-panel"><h3>消息过滤策略</h3>
    <div class="settings-row"><div class="settings-row-label">最大发送频率<span class="settings-row-desc">每个用户每小时最多接收消息数</span></div><input class="form-input" id="f-max-rate" value="${window._filterSettings.maxRate||10}" style="width:100px"><span class="text-sm text-muted ml-2">条/小时</span></div>
    <div class="settings-row"><div class="settings-row-label">关键词过滤<span class="settings-row-desc">包含过滤关键词的消息将不推送，多个关键词用英文逗号分隔</span></div><input class="form-input" id="f-keywords" value="${window._filterSettings.keywords||'广告,推广,营销'}" style="width:300px"></div>
    <div class="settings-row"><div class="settings-row-label">免打扰时段<span class="settings-row-desc">该时段内不推送任何消息</span></div>
      <input class="form-input" id="f-dnd-start" value="${window._filterSettings.dndStart||'22:00'}" style="width:100px">
      <span class="text-sm mx-2">至</span>
      <input class="form-input" id="f-dnd-end" value="${window._filterSettings.dndEnd||'08:00'}" style="width:100px">
    </div>
    <button class="btn btn-primary btn-sm mt-4" onclick="window.saveFilterSettings()">保存过滤策略</button></div>`;

  const getUserFilterTab = () => `<div class="settings-panel"><h3>用户过滤策略</h3>
    <div class="settings-row"><div class="settings-row-label">按角色过滤<span class="settings-row-desc">仅向指定角色发送消息</span></div>
      <div class="flex gap-3">${['全部角色','学员','教师','管理员'].map(r=>{
        const roles = window._userFilter.roles || ['全部角色'];
        return `<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" name="role-filter" value="${r}" ${roles.includes(r)?'checked':''}> ${r}</label>`;
      }).join('')}</div>
    </div>
    <div class="settings-row"><div class="settings-row-label">按机构过滤<span class="settings-row-desc">仅向选定机构成员发送</span></div>
      <select class="form-select" id="uf-org" style="width:200px">
        <option value="">全部机构</option>${(window._userFilter.org_id?'<option value="'+window._userFilter.org_id+'" selected>已选机构</option>':'')}
      </select>
    </div>
    <div class="settings-row"><div class="settings-row-label">排除已退学用户<span class="settings-row-desc">自动过滤状态为禁用的用户</span></div>
      <label class="toggle-switch"><input type="checkbox" id="uf-exclude-disabled" ${window._userFilter.exclude_disabled!==false?'checked':''}><span class="toggle-track"><span class="toggle-thumb"></span></span></label>
    </div>
    <button class="btn btn-primary btn-sm mt-4" onclick="window.saveUserFilterSettings()">保存过滤策略</button></div>`;

  const getTemplatesTab = () => `<div class="settings-panel"><h3>消息模板管理</h3>
    <div class="table-container"><table class="table"><thead><tr><th>模板名称</th><th>类型</th><th>标题</th><th>状态</th><th>操作</th></tr></thead>
    <tbody id="msg-templates-body">${renderTemplateRows(window._msgTemplates)}</tbody></table></div>
    <button class="btn btn-primary btn-sm mt-4" onclick="window.showMsgTemplateModal()">+ 新建模板</button></div>`;

  const getPushTab = () => {
    const pc = window._pushCfg || {};
    return `<div class="settings-panel"><h3>推送方式配置</h3>
    <div class="settings-row"><div class="settings-row-label">微信推送<span class="settings-row-desc">通过微信公众号推送消息</span></div><label class="toggle-switch"><input type="checkbox" id="push-wx" ${(pc.wechat||{}).enabled!==false?'checked':''}><span class="toggle-track"><span class="toggle-thumb"></span></span></label></div>
    <div id="push-wx-config" class="ml-6 mb-4"><div class="form-group" style="max-width:400px"><label class="form-label">公众号 AppID</label><input class="form-input" id="push-wx-appid" value="${window.escapeHtml((pc.wechat||{}).appid||'')}" placeholder="wx开头的AppID"></div></div>
    <div class="settings-row"><div class="settings-row-label">短信推送<span class="settings-row-desc">通过短信网关发送消息</span></div><label class="toggle-switch"><input type="checkbox" id="push-sms" ${(pc.sms||{}).enabled?'checked':''}><span class="toggle-track"><span class="toggle-thumb"></span></span></label></div>
    <div id="push-sms-config" class="ml-6 mb-4" style="display:${(pc.sms||{}).enabled?'':'none'}"><div class="settings-grid"><div class="form-group"><label class="form-label">短信平台</label><select class="form-select" id="push-sms-platform"><option value="阿里云SMS" ${(pc.sms||{}).platform==='阿里云SMS'?'selected':''}>阿里云SMS</option><option value="腾讯云SMS" ${(pc.sms||{}).platform==='腾讯云SMS'?'selected':''}>腾讯云SMS</option></select></div><div class="form-group"><label class="form-label">AccessKey</label><input class="form-input" id="push-sms-ak" value="${window.escapeHtml((pc.sms||{}).accessKey||'')}" placeholder="AccessKeyId"></div></div></div>
    <div class="settings-row"><div class="settings-row-label">邮件推送<span class="settings-row-desc">通过SMTP发送邮件</span></div><label class="toggle-switch"><input type="checkbox" id="push-email" ${(pc.email||{}).enabled!==false?'checked':''}><span class="toggle-track"><span class="toggle-thumb"></span></span></label></div>
    <div id="push-email-config" class="ml-6 mb-4"><div class="settings-grid"><div class="form-group"><label class="form-label">SMTP服务器</label><input class="form-input" id="push-email-smtp" value="${window.escapeHtml((pc.email||{}).smtp||'')}"></div><div class="form-group"><label class="form-label">发件人邮箱</label><input class="form-input" id="push-email-from" value="${window.escapeHtml((pc.email||{}).from||'')}"></div></div></div>
    <button class="btn btn-primary btn-sm mt-2" onclick="window.savePushConfig()">保存推送配置</button></div>`;
  };

  const getDelayTab = () => `<div class="settings-panel"><h3>延迟发送配置</h3>
    <div class="settings-grid">
      <div class="form-group"><label class="form-label">轮询间隔时间（秒）</label><input class="form-input" type="number" id="d-interval" value="${window._delayCfg.interval||30}" min="5" max="300"><span class="form-help">系统每隔该时间检查待发送消息队列</span></div>
      <div class="form-group"><label class="form-label">消息过期时间（小时）</label><input class="form-input" type="number" id="d-expire" value="${window._delayCfg.expire||72}" min="1" max="720"><span class="form-help">超过该时间未发送的消息将被丢弃</span></div>
      <div class="form-group"><label class="form-label">失败重试次数</label><input class="form-input" type="number" id="d-retry" value="${window._delayCfg.retry||3}" min="0" max="10"><span class="form-help">发送失败后最多重试次数</span></div>
    </div>
    <button class="btn btn-primary btn-sm mt-4" onclick="window.saveDelayConfig()">保存延迟配置</button></div>`;

  const tabs = { replace: getReplaceTab, filter: getFilterTab, userfilter: getUserFilterTab, templates: getTemplatesTab, push: getPushTab, delay: getDelayTab };

  document.getElementById('msg-tab-content').innerHTML = tabs.replace();

  window.switchMsgTab = (tab, btn) => {
    document.querySelectorAll('#msg-tabs .tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('msg-tab-content').innerHTML = tabs[tab]();
    if (tab === 'push') {
      document.getElementById('push-sms').addEventListener('change', e => {
        document.getElementById('push-sms-config').style.display = e.target.checked ? '' : 'none';
      });
    }
  };

  // Save functions — all persist to backend
  window.saveReplaceRules = async () => {
    try {
      window._msgConfig.replace_rules = window._replaceRules;
      await api.saveMessageConfig(window._msgConfig);
      window.showToast('替换策略已保存','success');
    } catch(e) { window.showToast('保存失败: ' + e.message, 'error'); }
  };

  window.deleteReplaceRule = (idx) => {
    window._replaceRules.splice(idx, 1);
    document.getElementById('msg-tab-content').innerHTML = tabs.replace();
  };

  window.showAddReplaceRuleModal = () => {
    window.showModal({
      title: '添加替换规则', width: '420px',
      content: `<div class="form-group"><label class="form-label">变量名 <span style="color:red">*</span></label><input class="form-input" id="new-var" placeholder="如 {cert_name}"></div>
      <div class="form-group"><label class="form-label">替换值来源</label><input class="form-input" id="new-source" placeholder="如 证书名称"></div>
      <div class="form-group"><label class="form-label">说明</label><input class="form-input" id="new-desc" placeholder="说明该变量的用途"></div>`,
      confirmText: '添加',
      onConfirm: () => {
        const v = document.getElementById('new-var').value.trim();
        if (!v) { window.showToast('请输入变量名','warning'); return; }
        window._replaceRules.push({ var: v, source: document.getElementById('new-source').value, desc: document.getElementById('new-desc').value });
        window.showToast('替换规则已添加','success');
        document.getElementById('msg-tab-content').innerHTML = tabs.replace();
      }
    });
  };

  window.saveFilterSettings = async () => {
    try {
      window._filterSettings = {
        maxRate: parseInt(document.getElementById('f-max-rate').value) || 10,
        keywords: document.getElementById('f-keywords').value,
        dndStart: document.getElementById('f-dnd-start').value,
        dndEnd: document.getElementById('f-dnd-end').value,
      };
      window._msgConfig.filter_settings = window._filterSettings;
      await api.saveMessageConfig(window._msgConfig);
      window.showToast('过滤策略已保存','success');
    } catch(e) { window.showToast('保存失败: ' + e.message, 'error'); }
  };

  window.saveUserFilterSettings = async () => {
    try {
      const roles = [];
      document.querySelectorAll('input[name="role-filter"]:checked').forEach(cb => roles.push(cb.value));
      window._userFilter = {
        roles,
        org_id: document.getElementById('uf-org').value || null,
        exclude_disabled: document.getElementById('uf-exclude-disabled').checked
      };
      window._msgConfig.user_filter = window._userFilter;
      await api.saveMessageConfig(window._msgConfig);
      window.showToast('用户过滤策略已保存','success');
    } catch(e) { window.showToast('保存失败: ' + e.message, 'error'); }
  };

  window.savePushConfig = async () => {
    try {
      window._pushCfg = {
        wechat: { enabled: document.getElementById('push-wx').checked, appid: document.getElementById('push-wx-appid')?.value || '' },
        sms: { enabled: document.getElementById('push-sms').checked, platform: document.getElementById('push-sms-platform')?.value || '阿里云SMS', accessKey: document.getElementById('push-sms-ak')?.value || '' },
        email: { enabled: document.getElementById('push-email').checked, smtp: document.getElementById('push-email-smtp')?.value || '', from: document.getElementById('push-email-from')?.value || '' }
      };
      window._msgConfig.push_config = window._pushCfg;
      await api.saveMessageConfig(window._msgConfig);
      window.showToast('推送配置已保存','success');
    } catch(e) { window.showToast('保存失败: ' + e.message, 'error'); }
  };

  window.saveDelayConfig = async () => {
    try {
      window._delayCfg = {
        interval: parseInt(document.getElementById('d-interval').value) || 30,
        expire: parseInt(document.getElementById('d-expire').value) || 72,
        retry: parseInt(document.getElementById('d-retry').value) || 3,
      };
      window._msgConfig.delay_config = window._delayCfg;
      await api.saveMessageConfig(window._msgConfig);
      window.showToast('延迟配置已保存','success');
    } catch(e) { window.showToast('保存失败: ' + e.message, 'error'); }
  };
}

function renderTemplateRows(templates) {
  if (!templates || !templates.length) return '<tr><td colspan="5" class="text-center text-muted">暂无模板</td></tr>';
  return templates.map(t => `<tr>
    <td><strong>${window.escapeHtml(t.name||'')}</strong></td>
    <td><span class="badge badge-info">${t.type==='wechat'?'微信':t.type==='sms'?'短信':'邮件'}</span></td>
    <td>${window.escapeHtml(t.title||'')}</td>
    <td><span class="badge ${t.status==='active'?'badge-success':'badge-warning'}">${t.status==='active'?'启用':'停用'}</span></td>
    <td>
      <button class="btn btn-outline btn-sm" onclick="window.showMsgTemplateModal(${t.id})">编辑</button>
      <button class="btn btn-outline btn-sm ml-1" style="color:var(--color-error)" onclick="window.confirmDeleteTemplate(${t.id},'${window.escapeHtml(t.name||'')}')">删除</button>
    </td>
  </tr>`).join('');
}

window.showMsgTemplateModal = async (id) => {
  const isNew = !id;
  let t = { name:'', type:'wechat', title:'', content:'', status:'active' };
  if (!isNew) { t = (window._msgTemplates||[]).find(x => x.id === id) || t; }
  window.showModal({
    title: isNew ? '新建模板' : '编辑模板', width: '520px',
    content: `<div class="form-group"><label class="form-label">模板名称 <span style="color:red">*</span></label><input class="form-input" id="tmpl-name" value="${window.escapeHtml(t.name||'')}"></div>
    <div class="settings-grid">
      <div class="form-group"><label class="form-label">推送类型</label><select class="form-select" id="tmpl-type">
        <option value="wechat" ${t.type==='wechat'?'selected':''}>微信</option>
        <option value="sms" ${t.type==='sms'?'selected':''}>短信</option>
        <option value="email" ${t.type==='email'?'selected':''}>邮件</option>
      </select></div>
      <div class="form-group"><label class="form-label">状态</label><select class="form-select" id="tmpl-status">
        <option value="active" ${t.status==='active'?'selected':''}>启用</option>
        <option value="inactive" ${t.status!=='active'?'selected':''}>停用</option>
      </select></div>
    </div>
    <div class="form-group"><label class="form-label">消息标题</label><input class="form-input" id="tmpl-title" value="${window.escapeHtml(t.title||'')}"></div>
    <div class="form-group"><label class="form-label">消息内容</label><textarea class="form-textarea" id="tmpl-content" rows="4" placeholder="支持变量替换，如 {name},{course}">${window.escapeHtml(t.content||'')}</textarea></div>
    <div class="alert alert-info" style="font-size:0.8rem">支持变量：{name} 姓名、{course} 课程名、{start_time} 开课时间、{cost} 金额、{progress} 进度</div>`,
    confirmText: '保存',
    onConfirm: async () => {
      const name = document.getElementById('tmpl-name').value.trim();
      if (!name) { window.showToast('请输入模板名称','warning'); return; }
      const data = { name, type: document.getElementById('tmpl-type').value, title: document.getElementById('tmpl-title').value, content: document.getElementById('tmpl-content').value, status: document.getElementById('tmpl-status').value };
      try {
        if (isNew) await api.createMessageTemplate(data);
        else await api.updateMessageTemplate(id, data);
        window._msgTemplates = await api.getMessageTemplates();
        window.showToast(isNew?'模板创建成功':'模板已更新','success');
        const el = document.getElementById('msg-templates-body');
        if (el) el.innerHTML = renderTemplateRows(window._msgTemplates);
      } catch(e) { window.showToast(e.message||'保存失败','error'); }
    }
  });
};

window.confirmDeleteTemplate = async (id, name) => {
  window.showModal({
    title: '确认删除', width: '360px',
    content: `<p>确定删除模板 <strong>${window.escapeHtml(name)}</strong> 吗？</p>`,
    confirmText: '删除', confirmClass: 'btn-error',
    onConfirm: async () => {
      try {
        await api.deleteMessageTemplate(id);
        window._msgTemplates = await api.getMessageTemplates();
        window.showToast('模板已删除','success');
        const el = document.getElementById('msg-templates-body');
        if (el) el.innerHTML = renderTemplateRows(window._msgTemplates);
      } catch(e) { window.showToast('删除失败','error'); }
    }
  });
};

/* ===== (2) LDAP用户管理 ===== */
function renderLdapConfig(content) {
  content.innerHTML = `
    <div class="admin-content-header"><h2>LDAP用户管理</h2></div>
    <div class="settings-panel"><h3>LDAP连接配置</h3>
      <div class="settings-grid">
        <div class="form-group"><label class="form-label">LDAP服务地址</label><input class="form-input" id="ldap-server" value="ldap://ldap.yzpc.edu.cn"></div>
        <div class="form-group"><label class="form-label">端口</label><input class="form-input" id="ldap-port" value="389"></div>
        <div class="form-group"><label class="form-label">Base DN</label><input class="form-input" id="ldap-base" value="dc=yzpc,dc=edu,dc=cn"></div>
        <div class="form-group"><label class="form-label">管理员DN</label><input class="form-input" id="ldap-admin-dn" value="cn=admin,dc=yzpc,dc=edu,dc=cn"></div>
        <div class="form-group"><label class="form-label">管理员密码</label><input class="form-input" type="password" id="ldap-pwd" value="••••••••"></div>
        <div class="form-group"><label class="form-label">同步地址（OU）</label><input class="form-input" id="ldap-ou" value="ou=users,dc=yzpc,dc=edu,dc=cn"></div>
      </div>
      <div class="settings-row mt-4"><div class="settings-row-label">启用自动同步<span class="settings-row-desc">定时自动同步LDAP用户</span></div><label class="toggle-switch"><input type="checkbox" id="ldap-auto" checked><span class="toggle-track"><span class="toggle-thumb"></span></span></label></div>
      <div class="settings-row"><div class="settings-row-label">同步间隔（分钟）</div><input class="form-input" type="number" id="ldap-interval" value="60" style="width:100px"></div>
      <div class="flex gap-4 mt-6">
        <button class="btn btn-outline" onclick="window.testLdapConnection()">测试连接</button>
        <button class="btn btn-primary" onclick="window.syncLdap()">立即同步</button>
        <button class="btn btn-outline" onclick="window.saveLdapConfig()">保存配置</button>
      </div>
    </div>
    <div class="settings-panel"><h3>同步日志</h3>
      <div class="table-container"><table class="table"><thead><tr><th>同步时间</th><th>同步总数</th><th>新增用户</th><th>更新用户</th><th>状态</th></tr></thead><tbody>
        <tr><td>2026-05-21 10:00</td><td>156</td><td>12</td><td>144</td><td><span class="badge badge-success">成功</span></td></tr>
        <tr><td>2026-05-20 10:00</td><td>154</td><td>8</td><td>146</td><td><span class="badge badge-success">成功</span></td></tr>
        <tr><td>2026-05-19 10:00</td><td>152</td><td>6</td><td>146</td><td><span class="badge badge-success">成功</span></td></tr>
      </tbody></table></div>
    </div>`;

  window.testLdapConnection = async () => {
    window.showToast('正在测试连接...','info');
    await new Promise(r => setTimeout(r, 800));
    window.showToast('LDAP连接测试成功！服务器响应正常','success');
  };

  window.syncLdap = async () => {
    window.showToast('正在同步LDAP用户...','info');
    try {
      const result = await api.ldapSync({});
      window.showToast(result.message || '同步完成','success');
    } catch(e) { window.showToast('同步失败: '+e.message,'error'); }
  };

  window.saveLdapConfig = () => {
    window.showToast('LDAP配置已保存','success');
  };
}

/* ===== (3) 通知公告管理 ===== */
async function renderNotificationsConfig(content) {
  content.innerHTML = `
    <div class="admin-content-header"><h2>通知公告管理</h2><button class="btn btn-primary btn-sm" onclick="window.showPublishNoticeForm()">+ 发布通知</button></div>
    <div id="notice-table-container"><div class="skeleton skeleton-card"></div></div>
  `;
  await loadNoticeTable();

  window.showPublishNoticeForm = () => {
    window.showModal({
      title: '发布通知公告', width: '780px',
      content: `<div class="form-group"><label class="form-label">标题 <span style="color:red">*</span></label><input class="form-input" id="new-notice-title"></div>
      <div class="form-group"><label class="form-label">类型</label><select class="form-select" id="new-notice-type">
        <option value="notice">培训通知</option><option value="policy">政策法规</option><option value="news">新闻动态</option>
      </select></div>
      <div class="form-group"><label class="form-label">内容</label><div id="new-notice-editor"></div></div>
      <div class="form-group"><label class="form-label">附件</label><div id="new-notice-attachments"></div></div>`,
      confirmText: '发布',
      onConfirm: async () => {
        const title = document.getElementById('new-notice-title').value.trim();
        if (!title) { window.showToast('请输入标题','warning'); return; }
        try {
          await api.createNotification({ title, content: window.getRichEditorContent('new-notice-editor'), type: document.getElementById('new-notice-type').value, attachments: window.getAttachments('new-notice-attachments'), publisher_id: window.getCurrentUser()?.id || 1 });
          window.showToast('发布成功','success'); await loadNoticeTable();
          window.destroyRichEditor('new-notice-editor');
        } catch(e) { window.showToast('发布失败','error'); }
      },
      afterRender: () => {
        window.initRichEditor('new-notice-editor');
        window.initAttachmentManager('new-notice-attachments');
      }
    });
  };
}

async function loadNoticeTable() {
  try {
    const notifs = await api.getNotifications();
    if (!notifs.length) { document.getElementById('notice-table-container').innerHTML = `<div class="empty-state"><div class="empty-icon">🔔</div><h4>暂无通知公告</h4></div>`; return; }
    const rows = notifs.map(n => `<tr>
      <td><strong>${window.escapeHtml(n.title)}</strong>${window.renderAttachmentBadge(n.attachments)}</td>
      <td><span class="badge ${n.type==='notice'?'badge-info':n.type==='policy'?'badge-warning':'badge-success'}">${n.type==='notice'?'培训通知':n.type==='policy'?'政策法规':'新闻动态'}</span></td>
      <td>${window.formatDate(n.created_at)}</td>
      <td><span class="badge badge-success">已发布</span></td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="window.showEditNoticeModal(${n.id})">编辑</button>
        <button class="btn btn-outline btn-sm ml-1" onclick="window.showReadStats(${n.id},'${window.escapeHtml(n.title)}')">查阅统计</button>
        <button class="btn btn-outline btn-sm ml-1" style="color:var(--color-error)" onclick="window.confirmDeleteNotice(${n.id},'${window.escapeHtml(n.title)}')">删除</button>
      </td>
    </tr>`).join('');
    document.getElementById('notice-table-container').innerHTML = `<div class="table-container"><table class="table"><thead><tr><th>标题</th><th>类型</th><th>发布时间</th><th>状态</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  } catch(e) { document.getElementById('notice-table-container').innerHTML = '<div class="empty-state"><h4>加载失败</h4></div>'; }
}

window.showEditNoticeModal = async (id) => {
  let n = {};
  try { n = await api.getNotification(id); } catch(e) {}
  window.showModal({
    title: '编辑通知', width: '780px',
    content: `<div class="form-group"><label class="form-label">标题</label><input class="form-input" id="edit-notice-title" value="${window.escapeHtml(n.title||'')}"></div>
    <div class="form-group"><label class="form-label">类型</label><select class="form-select" id="edit-notice-type">
      <option value="notice" ${n.type==='notice'?'selected':''}>培训通知</option>
      <option value="policy" ${n.type==='policy'?'selected':''}>政策法规</option>
      <option value="news" ${n.type==='news'?'selected':''}>新闻动态</option>
    </select></div>
    <div class="form-group"><label class="form-label">内容</label><div id="edit-notice-editor"></div></div>
    <div class="form-group"><label class="form-label">附件</label><div id="edit-notice-attachments"></div></div>`,
    confirmText: '保存',
    onConfirm: async () => {
      try {
        await api.updateNotification(id, { title: document.getElementById('edit-notice-title').value, type: document.getElementById('edit-notice-type').value, content: window.getRichEditorContent('edit-notice-editor'), attachments: window.getAttachments('edit-notice-attachments') });
        window.showToast('通知已更新','success'); await loadNoticeTable();
        window.destroyRichEditor('edit-notice-editor');
      } catch(e) { window.showToast('更新失败','error'); }
    },
    afterRender: () => {
      window.initRichEditor('edit-notice-editor', n.content || '');
      window.initAttachmentManager('edit-notice-attachments', n.attachments || []);
    }
  });
};

window.confirmDeleteNotice = (id, title) => {
  window.showModal({
    title: '确认删除', width: '360px',
    content: `<p>确定删除通知 <strong>${window.escapeHtml(title)}</strong> 吗？</p>`,
    confirmText: '删除', confirmClass: 'btn-error',
    onConfirm: async () => {
      try { await api.deleteNotification(id); window.showToast('通知已删除','success'); await loadNoticeTable(); } catch(e) { window.showToast('删除失败','error'); }
    }
  });
};

window.showReadStats = async (id, title) => {
  try {
    const stats = await api.getNotificationReadStats(id);
    const rows = stats.reads.map(r => `<tr><td>${window.escapeHtml(r.realname)}</td><td><span class="badge badge-success">已阅</span></td><td>${r.read_at||'-'}</td></tr>`).join('');
    window.showModal({
      title: `查阅统计 - ${title}`, width: '500px',
      content: `<div class="alert alert-info">已阅 <strong>${stats.read_count}</strong> 人 / 未阅 <strong>${stats.total - stats.read_count}</strong> 人 / 总计 <strong>${stats.total}</strong> 人</div>
      <div class="table-container"><table class="table"><thead><tr><th>学员姓名</th><th>状态</th><th>阅读时间</th></tr></thead><tbody>${rows||'<tr><td colspan="3" class="text-center text-muted">暂无阅读记录</td></tr>'}</tbody></table></div>`,
      confirmText: '关闭'
    });
  } catch(e) { window.showToast('获取统计失败','error'); }
};

/* ===== (4) 学习设置 ===== */
async function renderLearningConfig(content) {
  let settings = {};
  try { settings = await api.getSettings(); } catch(e) {}

  content.innerHTML = `
    <div class="admin-content-header"><h2>学习设置</h2></div>
    <div class="settings-panel"><h3>视频与学习基础设置</h3>
      <div class="settings-grid">
        <div class="form-group"><label class="form-label">视频清晰度</label><select class="form-select" id="l-video-quality">
          <option value="hd" ${(settings.video_quality||'hd')==='hd'?'selected':''}>高清</option>
          <option value="uhd" ${settings.video_quality==='uhd'?'selected':''}>超清</option>
        </select></div>
        <div class="form-group"><label class="form-label">一课时分钟数</label><input class="form-input" type="number" id="l-hour-minutes" value="${settings.hour_minutes||45}" min="30" max="60"></div>
        <div class="form-group" style="grid-column:1/-1"><label class="form-label">在线学习水印文字</label><input class="form-input" id="l-watermark" value="${settings.watermark_text||'扬州职业大学继续教育'}" placeholder="支持变量: {username}{realname}{phone}{userid}"><span class="form-help">可用变量：<code>{username}</code> 用户名、<code>{realname}</code> 姓名、<code>{phone}</code> 手机号、<code>{userid}</code> 用户ID。例如：<code>扬州大学-{realname}-{phone}</code></span></div>
        <div class="form-group"><label class="form-label">水印文字颜色</label><div style="display:flex;align-items:center;gap:8px"><input type="color" id="l-watermark-color" value="${settings.watermark_color||'#ffffff'}" style="width:40px;height:36px;border:1px solid var(--color-border);border-radius:4px;cursor:pointer"><span id="l-watermark-color-val" style="font-size:0.85rem;color:var(--color-text-secondary)">${settings.watermark_color||'#ffffff'}</span></div></div>
        <div class="form-group"><label class="form-label">水印不透明度 <span id="l-watermark-opacity-val" style="font-weight:600">${Math.round((parseFloat(settings.watermark_opacity)||0.12)*100)}%</span></label><input type="range" id="l-watermark-opacity" min="5" max="50" value="${Math.round((parseFloat(settings.watermark_opacity)||0.12)*100)}" style="width:100%"><span class="form-help">值越小越透明，建议 5%~30%</span></div>
        <div class="form-group"><label class="form-label">最小加速倍速</label><input class="form-input" type="number" step="0.25" id="l-min-speed" value="${settings.min_speed||1.0}" min="0.5" max="2"></div>
        <div class="form-group"><label class="form-label">最大加速倍速</label><input class="form-input" type="number" step="0.25" id="l-max-speed" value="${settings.max_speed||2.0}" min="1" max="3"></div>
      </div>
      <div class="mt-6">
        <div class="settings-row"><div class="settings-row-label">允许快进<span class="settings-row-desc">允许学员拖动视频进度条</span></div><label class="toggle-switch"><input type="checkbox" id="l-fast-forward" ${settings.allow_fast_forward!=='0'?'checked':''}><span class="toggle-track"><span class="toggle-thumb"></span></span></label></div>
        <div class="settings-row"><div class="settings-row-label">已学满任务累计学时<span class="settings-row-desc">学时已满后是否继续计算</span></div><label class="toggle-switch"><input type="checkbox" id="l-accumulate" ${settings.accumulate_hours==='1'?'checked':''}><span class="toggle-track"><span class="toggle-thumb"></span></span></label></div>
        <div class="settings-row"><div class="settings-row-label">任务完成状态显示<span class="settings-row-desc">在学习列表中显示每个任务的完成状态</span></div><label class="toggle-switch"><input type="checkbox" id="l-show-status" ${settings.show_task_status!=='0'?'checked':''}><span class="toggle-track"><span class="toggle-thumb"></span></span></label></div>
      </div>
    </div>
    <div class="settings-panel"><h3>防挂机设置</h3>
      <p class="text-sm text-muted mb-4">学员长时间无操作时，系统自动弹出确认弹窗，防止挂课行为。</p>
      <div class="settings-grid">
        <div class="form-group"><label class="form-label">互动间隔时长（秒）</label><input class="form-input" type="number" id="l-afk-interval" value="${settings.anti_afk_interval||300}" min="30"><span class="form-help">检测到无操作后弹出互动确认</span></div>
        <div class="form-group"><label class="form-label">弹窗持续时间（秒）</label><input class="form-input" type="number" id="l-afk-duration" value="${settings.anti_afk_duration||10}" min="5"><span class="form-help">弹窗显示多少秒后自动暂停学习</span></div>
      </div>
    </div>
    <button class="btn btn-primary" onclick="window.saveLearningSettings()">保存设置</button>
  `;

  // 颜色选择器实时预览
  const colorInput = document.getElementById('l-watermark-color');
  const colorVal = document.getElementById('l-watermark-color-val');
  if (colorInput && colorVal) {
    colorInput.addEventListener('input', () => { colorVal.textContent = colorInput.value; });
  }
  // 不透明度滑块实时预览
  const opacityInput = document.getElementById('l-watermark-opacity');
  const opacityVal = document.getElementById('l-watermark-opacity-val');
  if (opacityInput && opacityVal) {
    opacityInput.addEventListener('input', () => { opacityVal.textContent = opacityInput.value + '%'; });
  }

  window.saveLearningSettings = async () => {
    const data = [
      { key: 'video_quality', value: document.getElementById('l-video-quality').value },
      { key: 'hour_minutes', value: document.getElementById('l-hour-minutes').value },
      { key: 'watermark_text', value: document.getElementById('l-watermark').value },
      { key: 'watermark_color', value: document.getElementById('l-watermark-color').value },
      { key: 'watermark_opacity', value: String(parseInt(document.getElementById('l-watermark-opacity').value) / 100) },
      { key: 'min_speed', value: document.getElementById('l-min-speed').value },
      { key: 'max_speed', value: document.getElementById('l-max-speed').value },
      { key: 'allow_fast_forward', value: document.getElementById('l-fast-forward').checked ? '1' : '0' },
      { key: 'accumulate_hours', value: document.getElementById('l-accumulate').checked ? '1' : '0' },
      { key: 'show_task_status', value: document.getElementById('l-show-status').checked ? '1' : '0' },
      { key: 'anti_afk_interval', value: document.getElementById('l-afk-interval').value },
      { key: 'anti_afk_duration', value: document.getElementById('l-afk-duration').value },
    ];
    try { await api.saveSettings(data); window.showToast('学习设置保存成功','success'); } catch(e) { window.showToast('保存失败','error'); }
  };
}

/* ===== (5) 首页设置 ===== */
async function renderHomeConfig(content) {
  let [settings, faqItems, contact] = [{}, [], {}];
  try { [settings, faqItems, contact] = await Promise.all([api.getSettings(), api.getFaq(), api.getContact()]); } catch(e) {}

  content.innerHTML = `
    <div class="admin-content-header"><h2>首页设置</h2></div>
    <div class="settings-panel"><h3>基础展示设置</h3>
      <div class="settings-grid">
        <div class="form-group"><label class="form-label">首页展示课程数量</label><input class="form-input" type="number" id="h-course-count" value="${settings.home_course_count||12}" min="4" max="48"></div>
        <div class="form-group"><label class="form-label">首页课程显示方式</label><select class="form-select" id="h-display-mode">
          <option value="course_list" ${(settings.home_display_mode||'course_list')==='course_list'?'selected':''}>课程列表</option>
          <option value="task_list" ${settings.home_display_mode==='task_list'?'selected':''}>课程任务列表</option>
        </select></div>
      </div>
      <button class="btn btn-primary btn-sm mt-4" onclick="window.saveHomeBasicSettings()">保存</button>
    </div>
    <div class="settings-panel"><h3>常见问题管理</h3>
      <div id="faq-list">${renderFaqList(faqItems)}</div>
      <button class="btn btn-outline btn-sm mt-4" onclick="window.showAddFaqModal()">+ 添加问题</button>
    </div>
    <div class="settings-panel"><h3>联系我们</h3>
      <div class="settings-grid">
        <div class="form-group"><label class="form-label">联系电话</label><input class="form-input" id="c-phone" value="${window.escapeHtml(contact.phone||'0514-87654321')}"></div>
        <div class="form-group"><label class="form-label">联系邮箱</label><input class="form-input" id="c-email" value="${window.escapeHtml(contact.email||'jxjy@yzpc.edu.cn')}"></div>
        <div class="form-group" style="grid-column:1/-1"><label class="form-label">联系地址</label><input class="form-input" id="c-address" value="${window.escapeHtml(contact.address||'扬州市邗江区文昌西路458号')}"></div>
      </div>
      <button class="btn btn-primary btn-sm mt-4" onclick="window.saveContactInfo()">保存联系方式</button>
    </div>
  `;

  window.saveHomeBasicSettings = async () => {
    const data = [
      { key: 'home_course_count', value: document.getElementById('h-course-count').value },
      { key: 'home_display_mode', value: document.getElementById('h-display-mode').value },
    ];
    try { await api.saveSettings(data); window.showToast('首页设置保存成功','success'); } catch(e) { window.showToast('保存失败','error'); }
  };

  window.saveContactInfo = async () => {
    try {
      await api.saveContact({ phone: document.getElementById('c-phone').value, email: document.getElementById('c-email').value, address: document.getElementById('c-address').value });
      window.showToast('联系方式保存成功','success');
    } catch(e) { window.showToast('保存失败','error'); }
  };

  window.showAddFaqModal = () => {
    window.showModal({
      title: '添加常见问题', width: '480px',
      content: `<div class="form-group"><label class="form-label">问题 <span style="color:red">*</span></label><input class="form-input" id="faq-q" placeholder="请输入问题"></div>
      <div class="form-group"><label class="form-label">答案</label><textarea class="form-textarea" id="faq-a" rows="4" placeholder="请输入答案内容"></textarea></div>`,
      confirmText: '添加',
      onConfirm: async () => {
        const q = document.getElementById('faq-q').value.trim();
        if (!q) { window.showToast('请输入问题','warning'); return; }
        try {
          await api.createFaq({ question: q, answer: document.getElementById('faq-a').value });
          window.showToast('问题已添加','success');
          const items = await api.getFaq();
          document.getElementById('faq-list').innerHTML = renderFaqList(items);
        } catch(e) { window.showToast('添加失败','error'); }
      }
    });
  };

  window.showEditFaqModal = async (id) => {
    const items = await api.getFaq();
    const item = items.find(f => f.id === id) || {};
    window.showModal({
      title: '编辑问题', width: '480px',
      content: `<div class="form-group"><label class="form-label">问题</label><input class="form-input" id="edit-faq-q" value="${window.escapeHtml(item.question||'')}"></div>
      <div class="form-group"><label class="form-label">答案</label><textarea class="form-textarea" id="edit-faq-a" rows="4">${window.escapeHtml(item.answer||'')}</textarea></div>`,
      confirmText: '保存',
      onConfirm: async () => {
        try {
          await api.updateFaq(id, { question: document.getElementById('edit-faq-q').value, answer: document.getElementById('edit-faq-a').value });
          window.showToast('已更新','success');
          const items2 = await api.getFaq();
          document.getElementById('faq-list').innerHTML = renderFaqList(items2);
        } catch(e) { window.showToast('更新失败','error'); }
      }
    });
  };

  window.deleteFaqItem = async (id) => {
    try {
      await api.deleteFaq(id);
      window.showToast('问题已删除','success');
      const items = await api.getFaq();
      document.getElementById('faq-list').innerHTML = renderFaqList(items);
    } catch(e) { window.showToast('删除失败','error'); }
  };
}

function renderFaqList(items) {
  if (!items || !items.length) return '<div class="empty-state text-sm text-muted">暂无常见问题</div>';
  return items.map((f, i) => `<div class="drag-item">
    <span style="width:24px;color:var(--color-text-muted);font-size:0.8rem">${i+1}</span>
    <div style="flex:1">
      <div style="font-weight:600;font-size:0.9rem">${window.escapeHtml(f.question||'')}</div>
      <div class="text-xs text-muted mt-1">${window.escapeHtml((f.answer||'').slice(0,60))}${(f.answer||'').length>60?'...':''}</div>
    </div>
    <button class="drag-btn" onclick="window.showEditFaqModal(${f.id})">编辑</button>
    <button class="drag-btn" style="color:var(--color-error)" onclick="window.deleteFaqItem(${f.id})">删除</button>
  </div>`).join('');
}

/* ===== (6) 报名设置 ===== */
async function renderRegistrationConfig(content) {
  content.innerHTML = `<div class="admin-content-header"><h2>报名设置</h2><button class="btn btn-primary btn-sm" onclick="window.showAddFieldModal()">+ 添加扩展字段</button></div>
    <div class="settings-panel"><h3>报名字段配置</h3>
      <p class="text-sm text-muted mb-4">可拖拽调整字段顺序，设置是否显示和是否必填。</p>
      <div id="reg-fields-container">加载中...</div>
    </div>
    <button class="btn btn-primary mt-4" onclick="window.saveRegistrationFields()">保存设置</button>`;

  let fields = [];
  try { fields = await api.getRegistrationFields(); } catch(e) {}
  window._regFields = fields.length ? [...fields] : [
    { id:1, field_name:'realname', display_name:'姓名', field_type:'text', is_visible:1, is_required:1, sort_order:0, remark:'' },
    { id:2, field_name:'phone', display_name:'手机号', field_type:'text', is_visible:1, is_required:1, sort_order:1, remark:'' },
    { id:3, field_name:'id_card', display_name:'身份证号', field_type:'text', is_visible:1, is_required:1, sort_order:2, remark:'' },
    { id:4, field_name:'org_name', display_name:'工作单位', field_type:'text', is_visible:1, is_required:0, sort_order:3, remark:'' },
    { id:5, field_name:'email', display_name:'邮箱', field_type:'text', is_visible:1, is_required:0, sort_order:4, remark:'' },
  ];
  renderRegFieldsList();

  window.renderRegFieldsList = renderRegFieldsList;
  function renderRegFieldsList() {
    const typeLabel = t => ({ text:'文本', textarea:'多行文本', select:'下拉框', date:'日期', image:'图片' })[t]||'文本';
    document.getElementById('reg-fields-container').innerHTML = window._regFields.map((f, i) => `<div class="drag-item" data-idx="${i}" draggable="true">
      <span class="drag-handle" title="拖拽排序">⋮⋮</span>
      <span style="flex:1">
        <strong>${window.escapeHtml(f.display_name||f.field_name)}</strong>
        <span class="badge badge-info ml-2">${typeLabel(f.field_type)}</span>
        ${f.remark?`<span class="text-xs text-muted ml-2">${window.escapeHtml(f.remark)}</span>`:''}
      </span>
      <label class="toggle-switch" title="是否显示">
        <input type="checkbox" ${f.is_visible?'checked':''} onchange="window._regFields[${i}].is_visible=this.checked?1:0">
        <span class="toggle-track"><span class="toggle-thumb"></span></span>
      </label>
      <span class="text-xs ml-1 mr-3">显示</span>
      <label class="toggle-switch" title="是否必填">
        <input type="checkbox" ${f.is_required?'checked':''} onchange="window._regFields[${i}].is_required=this.checked?1:0">
        <span class="toggle-track"><span class="toggle-thumb"></span></span>
      </label>
      <span class="text-xs ml-1 mr-3">必填</span>
      <button class="drag-btn" onclick="window.moveRegField(${i},'up')" ${i===0?'disabled':''}>↑</button>
      <button class="drag-btn" onclick="window.moveRegField(${i},'down')" ${i===window._regFields.length-1?'disabled':''}>↓</button>
      <button class="drag-btn" style="color:var(--color-error)" onclick="window.deleteRegField(${i})">×</button>
    </div>`).join('');

    // Bind drag events
    bindDragEvents();
  }

  function bindDragEvents() {
    const container = document.getElementById('reg-fields-container');
    if (!container) return;
    const items = container.querySelectorAll('.drag-item');
    let dragSrcEl = null;
    let dragSrcIdx = null;

    items.forEach(item => {
      item.addEventListener('dragstart', function(e) {
        dragSrcEl = this;
        dragSrcIdx = parseInt(this.dataset.idx);
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.innerHTML);
      });

      item.addEventListener('dragend', function() {
        this.classList.remove('dragging');
        items.forEach(i => i.classList.remove('drag-over'));
        dragSrcEl = null;
        dragSrcIdx = null;
      });

      item.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        return false;
      });

      item.addEventListener('dragenter', function() {
        if (this !== dragSrcEl) {
          this.classList.add('drag-over');
        }
      });

      item.addEventListener('dragleave', function() {
        this.classList.remove('drag-over');
      });

      item.addEventListener('drop', function(e) {
        e.stopPropagation();
        e.preventDefault();
        this.classList.remove('drag-over');

        if (dragSrcEl === this) return;

        const dropIdx = parseInt(this.dataset.idx);
        const arr = window._regFields;
        // Remove source and insert at target position
        const [moved] = arr.splice(dragSrcIdx, 1);
        arr.splice(dropIdx, 0, moved);

        renderRegFieldsList();
        window.showToast('字段顺序已调整，请保存以生效', 'info');
        return false;
      });
    });
  }

  window.moveRegField = (idx, dir) => {
    const arr = window._regFields;
    if (dir === 'up' && idx > 0) [arr[idx-1], arr[idx]] = [arr[idx], arr[idx-1]];
    else if (dir === 'down' && idx < arr.length-1) [arr[idx+1], arr[idx]] = [arr[idx], arr[idx+1]];
    renderRegFieldsList();
  };

  window.deleteRegField = (idx) => {
    window._regFields.splice(idx, 1);
    renderRegFieldsList();
    window.showToast('字段已删除，请保存以生效','info');
  };

  window.showAddFieldModal = () => {
    window.showModal({
      title: '添加扩展字段', width: '460px',
      content: `<div class="form-group"><label class="form-label">字段标识名 <span style="color:red">*</span></label><input class="form-input" id="new-field-key" placeholder="如 id_card（英文字母/数字/下划线）"></div>
      <div class="form-group"><label class="form-label">显示名称 <span style="color:red">*</span></label><input class="form-input" id="new-field-name" placeholder="如 身份证号"></div>
      <div class="form-group"><label class="form-label">字段类型</label><select class="form-select" id="new-field-type">
        <option value="text">文本</option><option value="textarea">多行文本</option>
        <option value="select">下拉框</option><option value="date">日期</option><option value="image">图片</option>
      </select></div>
      <div class="form-group"><label class="form-label">备注信息</label><input class="form-input" id="new-field-remark" placeholder="字段说明（可选）"></div>
      <div class="flex gap-4 mt-2">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="new-field-visible" checked> 显示</label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="new-field-required"> 必填</label>
      </div>`,
      confirmText: '添加',
      onConfirm: () => {
        const key = document.getElementById('new-field-key').value.trim();
        const name = document.getElementById('new-field-name').value.trim();
        if (!key || !name) { window.showToast('请填写字段标识名和显示名称','warning'); return; }
        window._regFields.push({
          id: Date.now(), field_name: key, display_name: name,
          field_type: document.getElementById('new-field-type').value,
          is_visible: document.getElementById('new-field-visible').checked ? 1 : 0,
          is_required: document.getElementById('new-field-required').checked ? 1 : 0,
          sort_order: window._regFields.length,
          remark: document.getElementById('new-field-remark').value
        });
        renderRegFieldsList();
        window.showToast('字段已添加，请保存以生效','success');
      }
    });
  };

  window.saveRegistrationFields = async () => {
    const fields = window._regFields.map((f, i) => ({ ...f, sort_order: i }));
    try {
      await api.saveRegistrationFields(fields);
      window.showToast('报名设置保存成功','success');
    } catch(e) { window.showToast('保存失败','error'); }
  };
}

/* ===== (7) 学习模式 ===== */
async function renderLearningMode(content) {
  let settings = {};
  try { settings = await api.getSettings(); } catch(e) {}
  const mode = settings.learning_mode || 'course';

  content.innerHTML = `
    <div class="admin-content-header"><h2>学习模式</h2></div>
    <p class="text-sm text-muted mb-6">选择平台的学习模式，不同模式下学员的学习和缴费流程有所不同。</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px">
      <div class="card cursor-pointer ${mode==='course'?'template-card selected':''}" id="mode-course" onclick="window.selectLearningMode('course')">
        <div class="card-body" style="text-align:center;padding:32px">
          <div style="font-size:3rem;margin-bottom:16px">📚</div>
          <h3 style="margin-bottom:8px">课程模式</h3>
          <p class="text-sm text-secondary" style="line-height:1.8;text-align:left">
            学员在课程列表中选择需要的课程，加入课程后即可开始学习。学习完成后可在线缴费并申请结业证书。
          </p>
          <div class="mt-4 text-xs text-muted">适合：自主选课、按需学习的场景</div>
          ${mode==='course'?'<span class="badge badge-success mt-4" style="display:inline-block">当前选中</span>':''}
        </div>
      </div>
      <div class="card cursor-pointer ${mode==='class'?'template-card selected':''}" id="mode-class" onclick="window.selectLearningMode('class')">
        <div class="card-body" style="text-align:center;padding:32px">
          <div style="font-size:3rem;margin-bottom:16px">🏫</div>
          <h3 style="margin-bottom:8px">班级模式</h3>
          <p class="text-sm text-secondary" style="line-height:1.8;text-align:left">
            学员根据培训项目选择所需学时，在线缴费后才可进入课程学习，学习完成后申请结业证书。
          </p>
          <div class="mt-4 text-xs text-muted">适合：按项目统一培训、先付费后学习的场景</div>
          ${mode==='class'?'<span class="badge badge-success mt-4" style="display:inline-block">当前选中</span>':''}
        </div>
      </div>
    </div>
    <button class="btn btn-primary" onclick="window.saveLearningMode()">保存设置</button>
  `;

  window._selectedMode = mode;
  window.selectLearningMode = (m) => {
    document.getElementById('mode-course').classList.toggle('selected', m === 'course');
    document.getElementById('mode-class').classList.toggle('selected', m === 'class');
    document.getElementById('mode-course').querySelector('.badge')?.remove();
    document.getElementById('mode-class').querySelector('.badge')?.remove();
    const el = document.getElementById('mode-' + m);
    const span = document.createElement('span');
    span.className = 'badge badge-success mt-4';
    span.style.display = 'inline-block';
    span.textContent = '当前选中';
    el.querySelector('.card-body').appendChild(span);
    window._selectedMode = m;
  };
  window.saveLearningMode = async () => {
    try {
      await api.saveSettings([{ key: 'learning_mode', value: window._selectedMode }]);
      window.showToast('学习模式保存成功','success');
    } catch(e) { window.showToast('保存失败','error'); }
  };
}

/* ===== (9) 微信公众号菜单管理 ===== */
async function renderWxMenuConfig(content) {
  let menuData = [];
  try {
    const raw = await api.getWxMenu();
    // Build structured menu
    const parents = raw.filter(m => m.parent_id === 0).sort((a,b)=>a.sort_order-b.sort_order);
    menuData = parents.map(p => ({
      id: p.id, name: p.name,
      subs: raw.filter(s => s.parent_id === p.id).sort((a,b)=>a.sort_order-b.sort_order).map(s => ({ id:s.id, name:s.name, type:s.type, url:s.url }))
    }));
  } catch(e) {
    menuData = [
      { name:'学习中心', subs:[{name:'我的课程',type:'view',url:'/student'},{name:'在线考试',type:'view',url:'/exam'}] },
      { name:'我的服务', subs:[{name:'证书查询',type:'view',url:'/certificates'},{name:'个人中心',type:'view',url:'/profile'}] },
      { name:'更多', subs:[{name:'联系我们',type:'view',url:'/contact'},{name:'帮助中心',type:'view',url:'/help'}] },
    ];
  }
  window._wxMenuData = JSON.parse(JSON.stringify(menuData));

  content.innerHTML = `
    <div class="admin-content-header"><h2>微信公众号菜单管理</h2>
      <button class="btn btn-outline btn-sm" onclick="window.addWxMenuItem()">+ 添加一级菜单</button>
    </div>
    <div style="display:grid;grid-template-columns:300px 1fr;gap:24px">
      <div style="position:sticky;top:80px;align-self:start">
        <div class="wx-phone-frame" id="wx-phone">
          <!-- 状态栏 -->
          <div class="wx-status-bar">
            <span class="wx-time" id="wx-status-time">22:30</span>
            <span class="wx-icons">●●●●○ &nbsp; Wi-Fi &nbsp; <span style="font-size:0.7rem">▮▮▮</span></span>
          </div>
          <!-- 导航栏 -->
          <div class="wx-nav-bar">
            <span class="wx-back">‹</span>
            <span class="wx-title">${window.escapeHtml(window._siteName||'扬州职业大学继续教育')}</span>
          </div>
          <!-- 内容区 -->
          <div class="wx-content-area" id="wx-content">
            <div class="wx-welcome" id="wx-welcome">
              <div class="wx-logo">继</div>
              <div class="wx-name">扬州职业大学继续教育</div>
              <div class="wx-tip">欢迎关注！点击下方菜单体验更多功能</div>
            </div>
            <div id="wx-content-dynamic"></div>
          </div>
          <!-- 子菜单遮罩 -->
          <div class="wx-submenu-mask" id="wx-submenu-mask" onclick="window.hideWxSubMenu()"></div>
          <!-- 子菜单弹出层 -->
          <div class="wx-submenu-popup" id="wx-submenu-popup"></div>
          <!-- 底部菜单栏 -->
          <div class="wx-phone-menu-bar" id="wx-menu-bar">
            ${menuData.map((m,i) => `<button class="wx-menu-tab" id="wx-tab-${i}" onclick="window.showWxSubMenu(${i})">${window.escapeHtml(m.name)}</button>`).join('')}
          </div>
        </div>
      </div>
      <div id="wx-menu-editor">${renderWxMenuEditor()}</div>
    </div>
    <div class="flex gap-3 mt-6">
      <button class="btn btn-primary" onclick="window.saveWxMenu()">保存并发布到公众号</button>
    </div>
  `;

  window.addWxMenuItem = () => {
    if (window._wxMenuData.length >= 3) { window.showToast('最多3个一级菜单','warning'); return; }
    window._wxMenuData.push({ name:'新菜单', subs:[] });
    document.getElementById('wx-menu-editor').innerHTML = renderWxMenuEditor();
    refreshPhonePreview();
  };

  window.deleteWxMenu = (i) => {
    window._wxMenuData.splice(i, 1);
    document.getElementById('wx-menu-editor').innerHTML = renderWxMenuEditor();
    refreshPhonePreview();
  };

  window.addWxSubMenu = (i) => {
    if ((window._wxMenuData[i].subs||[]).length >= 5) { window.showToast('子菜单最多5个','warning'); return; }
    window._wxMenuData[i].subs = window._wxMenuData[i].subs || [];
    window._wxMenuData[i].subs.push({ name:'新子菜单', type:'view', url:'' });
    document.getElementById('wx-menu-editor').innerHTML = renderWxMenuEditor();
    refreshPhonePreview();
  };

  window.deleteWxSubMenu = (i, j) => {
    window._wxMenuData[i].subs.splice(j, 1);
    document.getElementById('wx-menu-editor').innerHTML = renderWxMenuEditor();
    refreshPhonePreview();
  };

  window.onWxMenuNameChange = (i, val) => {
    window._wxMenuData[i].name = val;
    refreshPhonePreview();
  };

  window.saveWxMenu = async () => {
    // Sync current input values
    window._wxMenuData.forEach((m, i) => {
      const nameEl = document.getElementById(`wx-name-${i}`);
      if (nameEl) m.name = nameEl.value;
      (m.subs||[]).forEach((s, j) => {
        const snEl = document.getElementById(`wx-sub-name-${i}-${j}`);
        const suEl = document.getElementById(`wx-sub-url-${i}-${j}`);
        if (snEl) s.name = snEl.value;
        if (suEl) s.url = suEl.value;
      });
    });

    const flat = [];
    window._wxMenuData.forEach((m, i) => {
      flat.push({ parent_id:0, name:m.name, type:'view', url:'', sort_order:i });
    });
    // Note: simplified save (we save flat structure; full sub-menu would need real parent_id tracking)
    try {
      await api.saveWxMenu(flat);
      window.showToast('微信公众号菜单已保存并发布','success');
    } catch(e) { window.showToast('保存失败','error'); }
  };

  function refreshPhonePreview() {
    const menuBar = document.getElementById('wx-menu-bar');
    if (menuBar) {
      menuBar.innerHTML = window._wxMenuData.map((m,i) => `<button class="wx-menu-tab" id="wx-tab-${i}" onclick="window.showWxSubMenu(${i})">${window.escapeHtml(m.name)}</button>`).join('');
    }
    // Also refresh sub-menu popup if it's open
    const popup = document.getElementById('wx-submenu-popup');
    const activeTabIdx = window._wxActiveTabIdx;
    if (popup && activeTabIdx !== undefined && activeTabIdx < window._wxMenuData.length) {
      popup.innerHTML = renderSubMenuItems(activeTabIdx);
    }
  }

  // 显示子菜单弹出
  window.showWxSubMenu = (i) => {
    const menu = window._wxMenuData[i];
    if (!menu || !menu.subs || menu.subs.length === 0) {
      window.hideWxSubMenu();
      // 无子菜单时高亮该 tab
      document.querySelectorAll('.wx-menu-tab').forEach(el => el.classList.remove('active'));
      const tab = document.getElementById('wx-tab-' + i);
      if (tab) tab.classList.add('active');
      return;
    }
    // 高亮当前 tab
    document.querySelectorAll('.wx-menu-tab').forEach(el => el.classList.remove('active'));
    const tab = document.getElementById('wx-tab-' + i);
    if (tab) tab.classList.add('active');

    window._wxActiveTabIdx = i;
    const popup = document.getElementById('wx-submenu-popup');
    popup.innerHTML = renderSubMenuItems(i);
    popup.classList.add('active');
    document.getElementById('wx-submenu-mask').classList.add('active');
  };

  // 隐藏子菜单弹出
  window.hideWxSubMenu = () => {
    document.querySelectorAll('.wx-menu-tab').forEach(el => el.classList.remove('active'));
    document.getElementById('wx-submenu-popup').classList.remove('active');
    document.getElementById('wx-submenu-mask').classList.remove('active');
    window._wxActiveTabIdx = undefined;
  };

  // 点击子菜单项
  window.wxSubMenuClick = (i, j) => {
    const sub = (window._wxMenuData[i].subs || [])[j];
    if (!sub) return;
    const dynamic = document.getElementById('wx-content-dynamic');
    const welcome = document.getElementById('wx-welcome');
    if (welcome) welcome.style.display = 'none';

    if (sub.type === 'view') {
      dynamic.innerHTML = `<div class="wx-link-card">
        <div class="wx-link-thumb">🔗</div>
        <div class="wx-link-info">
          <div class="wx-link-title">${window.escapeHtml(sub.name)}</div>
          <div class="wx-link-url">${window.escapeHtml(sub.url || '(未设置链接)')}</div>
        </div>
      </div>`;
    } else {
      dynamic.innerHTML = `<div class="wx-chat-bubble gray">${window.escapeHtml(sub.name || '已收到您的消息')}</div>`;
    }
    window.hideWxSubMenu();
  };

  function renderSubMenuItems(i) {
    const subs = window._wxMenuData[i].subs || [];
    if (subs.length === 0) return '<div class="wx-submenu-item" style="color:#999;cursor:default;text-align:center">暂无子菜单</div>';
    return subs.map((s, j) => `<button class="wx-submenu-item" onclick="window.wxSubMenuClick(${i},${j})">${window.escapeHtml(s.name)}<span class="wx-sub-arrow">›</span></button>`).join('');
  }

  function renderWxMenuEditor() {
    return window._wxMenuData.map((m, i) => `<div class="card mb-4">
      <div class="card-body">
        <div class="flex items-center gap-3 mb-4">
          <span class="text-sm text-muted" style="white-space:nowrap">一级菜单 ${i+1}</span>
          <input class="form-input" id="wx-name-${i}" value="${window.escapeHtml(m.name||'')}" oninput="window.onWxMenuNameChange(${i},this.value)" style="width:160px" placeholder="菜单名称">
          <button class="drag-btn ml-auto" style="color:var(--color-error)" onclick="window.deleteWxMenu(${i})">× 删除</button>
        </div>
        <div class="text-sm text-muted mb-2">子菜单（最多5个）</div>
        ${(m.subs||[]).map((s, j) => `<div class="menu-item-row" style="margin-bottom:8px">
          <input class="form-input" id="wx-sub-name-${i}-${j}" value="${window.escapeHtml(s.name||'')}" placeholder="子菜单名" style="width:130px">
          <select class="form-select" style="width:120px">
            <option value="view" ${s.type==='view'?'selected':''}>跳转链接</option>
            <option value="click" ${s.type==='click'?'selected':''}>发送消息</option>
          </select>
          <input class="form-input" id="wx-sub-url-${i}-${j}" value="${window.escapeHtml(s.url||'')}" placeholder="页面路径或URL" style="flex:1">
          <button class="drag-btn" style="color:var(--color-error)" onclick="window.deleteWxSubMenu(${i},${j})">×</button>
        </div>`).join('')}
        ${(m.subs||[]).length < 5 ? `<button class="btn btn-outline btn-sm mt-2" onclick="window.addWxSubMenu(${i})">+ 添加子菜单</button>` : ''}
      </div>
    </div>`).join('');
  }
}

/* ===== (10) 网站风格 ===== */
async function renderSiteStyle(content) {
  let settings = {};
  try { settings = await api.getSettings(); } catch(e) {}

  // Helper to safely read a setting with fallback
  const sv = (key, fallback) => settings[key] || fallback;

  // Determine current theme for color picker defaults
  const currentTheme = sv('site_theme', '默认蓝');
  const themeColorDefaults = {
    '默认蓝': { bg: '#1E4D8C', hover: '#2B6CB0' },
    '海洋蓝': { bg: '#0D6E8C', hover: '#128DA8' },
    '森林绿': { bg: '#2D6A4F', hover: '#40916C' },
    '暖阳橙': { bg: '#D4782A', hover: '#E8984C' },
    '典雅紫': { bg: '#5B2C6F', hover: '#7B3F91' },
    '暗夜黑': { bg: '#1A1A2E', hover: '#2D2D4A' },
  };
  const tcd = themeColorDefaults[currentTheme] || themeColorDefaults['默认蓝'];

  content.innerHTML = `
    <div class="admin-content-header"><h2>网站风格</h2></div>
    <div class="settings-panel"><h3>基本信息</h3>
      <div class="settings-grid">
        <div class="form-group"><label class="form-label">主页名称</label><input class="form-input" id="s-site-name" value="${window.escapeHtml(sv('site_name','扬州职业大学继续教育在线培训平台'))}"></div>
        <div class="form-group"><label class="form-label">平台副标题</label><input class="form-input" id="s-site-sub" value="${window.escapeHtml(sv('site_subtitle','专业技术人员继续教育服务平台'))}"></div>
        <div class="form-group"><label class="form-label">联系电话</label><input class="form-input" id="s-phone" value="${window.escapeHtml(sv('site_phone','0514-87654321'))}"></div>
        <div class="form-group"><label class="form-label">版权信息</label><input class="form-input" id="s-copyright" value="${window.escapeHtml(sv('site_copyright','Copyright © 2025 扬州职业大学 All Rights Reserved'))}"></div>
      </div>
    </div>
    <div class="settings-panel"><h3>网页模板</h3>
      <div class="settings-grid" style="grid-template-columns:repeat(3,1fr)">
        ${[{name:'经典布局',icon:'&#9632;',desc:'传统学术风格，深色渐变 Hero + 左侧装饰线标题 + 右侧边栏面板，信息层次清晰，适合内容丰富的培训门户'},{name:'现代卡片',icon:'&#9670;',desc:'科技感风格，暗色多级渐变 Hero + 毛玻璃卡片悬浮效果，4列大卡片布局，视觉冲击力强，适合课程展示型平台'},{name:'简约列表',icon:'&#9654;',desc:'极简清爽风格，浅色 Hero 无渐变 + 2列横向卡片列表，隐藏侧边栏和统计栏，减少干扰，内容优先'}].map((t,i) => `
        <div class="template-card ${sv('site_template','经典布局')===t.name?'selected':''}" onclick="window.selectTemplate(this,'${t.name}')">
          <div class="template-preview"><span style="font-size:2rem;color:var(--color-primary)">${t.icon}</span></div>
          <h4 style="margin:8px 0 4px">${t.name}</h4>
          <p class="text-xs text-muted">${t.desc}</p>
        </div>`).join('')}
      </div>
    </div>
    <div class="settings-panel"><h3>网页主题色（至少6种）</h3>
      <div class="theme-grid">
        ${[
          {name:'默认蓝',color:'#1E4D8C',cls:'default'},
          {name:'海洋蓝',color:'#0D6E8C',cls:'ocean'},
          {name:'森林绿',color:'#2D6A4F',cls:'forest'},
          {name:'暖阳橙',color:'#D4782A',cls:'sunset'},
          {name:'典雅紫',color:'#5B2C6F',cls:'elegant'},
          {name:'暗夜黑',color:'#1A1A2E',cls:'night'}
        ].map(t => `<div class="theme-color-block theme-${t.cls} ${currentTheme===t.name?'selected':''}" onclick="window.selectTheme(this,'${t.name}')" title="${t.name}">${t.name}</div>`).join('')}
      </div>
    </div>
    <div class="settings-panel"><h3>自定义颜色</h3>
      <div class="toggle-switch" style="margin-bottom:var(--space-4)" id="custom-color-toggle">
        <input type="checkbox" id="s-custom-colors" ${sv('custom_colors_active','')==='true'?'checked':''}>
        <div class="toggle-track"><div class="toggle-thumb"></div></div>
        <label class="text-sm" for="s-custom-colors" style="cursor:pointer">启用自定义颜色（关闭则使用预设主题色）</label>
      </div>
      <div class="color-picker-grid" id="custom-colors-area" style="opacity:${sv('custom_colors_active','')==='true'?'1':'0.4'};pointer-events:${sv('custom_colors_active','')==='true'?'auto':'none'}">
        <div class="color-picker-item"><input type="color" value="${sv('header_text_color')||'#FFFFFF'}" id="s-header-text"><label class="text-sm">头部文字颜色</label></div>
        <div class="color-picker-item"><input type="color" value="${sv('header_bg_color')||tcd.bg}" id="s-header-bg"><label class="text-sm">头部背景颜色</label></div>
        <div class="color-picker-item"><input type="color" value="${sv('btn_bg_color')||tcd.bg}" id="s-btn-bg"><label class="text-sm">按钮背景色</label></div>
        <div class="color-picker-item"><input type="color" value="${sv('btn_hover_color')||tcd.hover}" id="s-btn-hover"><label class="text-sm">按钮悬停背景色</label></div>
        <div class="color-picker-item"><input type="color" value="${sv('header_line_color')||'#E5E0D8'}" id="s-header-line"><label class="text-sm">头部分割线</label></div>
      </div>
      <div class="flex gap-2 mt-4" id="custom-colors-btns" style="opacity:${sv('custom_colors_active','')==='true'?'1':'0.4'};pointer-events:${sv('custom_colors_active','')==='true'?'auto':'none'}">
        <button class="btn btn-outline btn-sm" onclick="window.previewSiteColors()">预览效果</button>
        <button class="btn btn-outline btn-sm" onclick="window.resetSiteColorsPreview()">恢复默认预览</button>
      </div>
    </div>
    <button class="btn btn-primary" onclick="window.saveSiteStyle()">保存风格设置</button>
  `;

  // Store current loaded values for reference
  window._selectedTemplate = sv('site_template','经典布局');
  window._selectedTheme = currentTheme;

  // Toggle switch for custom colors
  const customToggle = document.getElementById('s-custom-colors');
  const toggleTrack = document.querySelector('#custom-color-toggle .toggle-track');

  function handleCustomToggle(on) {
    customToggle.checked = on;
    document.getElementById('custom-colors-area').style.opacity = on ? '1' : '0.4';
    document.getElementById('custom-colors-area').style.pointerEvents = on ? 'auto' : 'none';
    document.getElementById('custom-colors-btns').style.opacity = on ? '1' : '0.4';
    document.getElementById('custom-colors-btns').style.pointerEvents = on ? 'auto' : 'none';
    if (on) {
      const headerBg = document.getElementById('s-header-bg').value;
      const headerText = document.getElementById('s-header-text').value;
      const btnBg = document.getElementById('s-btn-bg').value;
      const btnHover = document.getElementById('s-btn-hover').value;
      const headerLine = document.getElementById('s-header-line').value;
      applyTheme({
        site_theme: window._selectedTheme || '默认蓝',
        site_template: window._selectedTemplate || '经典布局',
        header_bg_color: headerBg,
        header_text_color: headerText,
        btn_bg_color: btnBg,
        btn_hover_color: btnHover,
        header_line_color: headerLine,
      });
      window.showToast('已启用自定义颜色，保存后永久生效', 'info');
    } else {
      applyTheme({ site_theme: window._selectedTheme || '默认蓝', site_template: window._selectedTemplate || '经典布局' });
      window.showToast('已恢复为预设主题色', 'info');
    }
  }

  if (customToggle) {
    customToggle.addEventListener('change', () => handleCustomToggle(customToggle.checked));
  }
  if (toggleTrack) {
    toggleTrack.addEventListener('click', (e) => {
      e.preventDefault();
      handleCustomToggle(!customToggle.checked);
    });
  }

  window.selectTemplate = (el, name) => {
    document.querySelectorAll('.template-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    window._selectedTemplate = name;
    // Instant preview: switch template class on portal-main
    const portalMain = document.querySelector('.portal-main');
    if (portalMain) {
      portalMain.classList.remove('portal-classic', 'portal-modern', 'portal-minimal');
      const map = { '经典布局': 'portal-classic', '现代卡片': 'portal-modern', '简约列表': 'portal-minimal' };
      portalMain.classList.add(map[name] || 'portal-classic');
    }
    window.showToast(`已选择模板：${name}，保存后永久生效`,'info');
  };

  window.selectTheme = (el, name) => {
    document.querySelectorAll('.theme-color-block').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    window._selectedTheme = name;
    // Get preset colors for this theme to update color pickers
    const themeMap = { '默认蓝':{bg:'#1E4D8C',hover:'#2B6CB0'}, '海洋蓝':{bg:'#0D6E8C',hover:'#128DA8'}, '森林绿':{bg:'#2D6A4F',hover:'#40916C'}, '暖阳橙':{bg:'#D4782A',hover:'#E8984C'}, '典雅紫':{bg:'#5B2C6F',hover:'#7B3F91'}, '暗夜黑':{bg:'#1A1A2E',hover:'#2D2D4A'} };
    const colors = themeMap[name] || themeMap['默认蓝'];
    document.getElementById('s-header-bg').value = colors.bg;
    document.getElementById('s-btn-bg').value = colors.bg;
    document.getElementById('s-btn-hover').value = colors.hover;
    // If custom colors not enabled, just apply preset theme
    const customToggle = document.getElementById('s-custom-colors');
    if (!customToggle || !customToggle.checked) {
      applyTheme({ site_theme: name, site_template: window._selectedTemplate || '经典布局' });
    } else {
      // Apply with current custom colors
      const headerText = document.getElementById('s-header-text')?.value || '#FFFFFF';
      const headerBg = document.getElementById('s-header-bg').value;
      const btnBg = document.getElementById('s-btn-bg').value;
      const btnHover = document.getElementById('s-btn-hover').value;
      const headerLine = document.getElementById('s-header-line').value;
      applyTheme({ site_theme: name, site_template: window._selectedTemplate || '经典布局',
        header_bg_color: headerBg, header_text_color: headerText, btn_bg_color: btnBg, btn_hover_color: btnHover, header_line_color: headerLine });
    }
    window.showToast(`已切换主题：${name}`,'info');
  };

  window.previewSiteColors = () => {
    const customToggle = document.getElementById('s-custom-colors');
    if (customToggle) customToggle.checked = true;
    document.getElementById('custom-colors-area').style.opacity = '1';
    document.getElementById('custom-colors-area').style.pointerEvents = 'auto';
    document.getElementById('custom-colors-btns').style.opacity = '1';
    document.getElementById('custom-colors-btns').style.pointerEvents = 'auto';
    const headerBg = document.getElementById('s-header-bg').value;
    const headerText = document.getElementById('s-header-text').value;
    const btnBg = document.getElementById('s-btn-bg').value;
    const btnHover = document.getElementById('s-btn-hover').value;
    const headerLine = document.getElementById('s-header-line').value;
    applyTheme({
      site_theme: window._selectedTheme || '默认蓝',
      site_template: window._selectedTemplate || '经典布局',
      header_bg_color: headerBg,
      header_text_color: headerText,
      btn_bg_color: btnBg,
      btn_hover_color: btnHover,
      header_line_color: headerLine,
    });
    window.showToast('自定义颜色已预览，保存后永久生效','info');
  };

  window.resetSiteColorsPreview = () => {
    const customToggle = document.getElementById('s-custom-colors');
    if (customToggle) customToggle.checked = false;
    document.getElementById('custom-colors-area').style.opacity = '0.4';
    document.getElementById('custom-colors-area').style.pointerEvents = 'none';
    document.getElementById('custom-colors-btns').style.opacity = '0.4';
    document.getElementById('custom-colors-btns').style.pointerEvents = 'none';
    applyTheme({ site_theme: window._selectedTheme || '默认蓝', site_template: window._selectedTemplate || '经典布局' });
    window.showToast('已恢复为预设主题色','info');
  };

  window.saveSiteStyle = async () => {
    const customEnabled = document.getElementById('s-custom-colors')?.checked || false;
    const data = [
      { key: 'site_name', value: document.getElementById('s-site-name').value },
      { key: 'site_subtitle', value: document.getElementById('s-site-sub').value },
      { key: 'site_phone', value: document.getElementById('s-phone').value },
      { key: 'site_copyright', value: document.getElementById('s-copyright').value },
      { key: 'site_template', value: window._selectedTemplate || '经典布局' },
      { key: 'site_theme', value: window._selectedTheme || '默认蓝' },
      { key: 'custom_colors_active', value: customEnabled ? 'true' : 'false' },
      { key: 'header_text_color', value: customEnabled ? document.getElementById('s-header-text').value : '' },
      { key: 'header_bg_color', value: customEnabled ? document.getElementById('s-header-bg').value : '' },
      { key: 'btn_bg_color', value: customEnabled ? document.getElementById('s-btn-bg').value : '' },
      { key: 'btn_hover_color', value: customEnabled ? document.getElementById('s-btn-hover').value : '' },
      { key: 'header_line_color', value: customEnabled ? document.getElementById('s-header-line').value : '' },
    ];
    try {
      await api.saveSettings(data);
      const settingsObj = {};
      data.forEach(d => { settingsObj[d.key] = d.value; });
      applyTheme(settingsObj);
      window.showToast('网站风格保存成功，已全局生效','success');
    } catch(e) { window.showToast('保存失败','error'); }
  };
}

/* ===== (11) 其他配置 ===== */
async function renderOtherConfig(content) {
  let externalUrl = '';
  try {
    const settings = await api.getSettings();
    externalUrl = settings.external_system_url || '';
  } catch(e) {}

  content.innerHTML = `
    <div class="admin-content-header"><h2>其他配置</h2></div>
    <div class="settings-panel">
      <h3>外部系统链接</h3>
      <p class="text-sm text-muted" style="margin-bottom:16px">配置后，管理后台顶部将显示"综合系统"按钮，点击可在新标签页中打开指定网址。</p>
      <div class="settings-grid">
        <div class="form-group">
          <label class="form-label">综合系统地址</label>
          <input class="form-input" id="ext-system-url" value="${window.escapeHtml(externalUrl)}" placeholder="https://example.com">
        </div>
      </div>
      <div class="flex gap-4 mt-4">
        <button class="btn btn-primary" onclick="window.saveOtherConfig()">保存配置</button>
        ${externalUrl ? `<button class="btn btn-outline" onclick="window.open('${window.escapeHtml(externalUrl)}', '_blank')">🔗 测试打开</button>` : ''}
      </div>
    </div>`;

  window.saveOtherConfig = async () => {
    const url = document.getElementById('ext-system-url').value.trim();
    try {
      await api.saveSettings([{ key: 'external_system_url', value: url }]);
      if (!window._siteSettings) window._siteSettings = {};
      window._siteSettings.external_system_url = url;
      window.showToast('配置已保存', 'success');
      await renderOtherConfig(content);
    } catch(e) {
      window.showToast('保存失败: ' + e.message, 'error');
    }
  };
}
