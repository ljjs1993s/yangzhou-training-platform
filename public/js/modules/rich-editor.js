/**
 * rich-editor.js - 富文本编辑器 + 附件管理共享模块
 * 依赖: Quill (CDN), api.js (uploadFile, deleteUpload)
 */

/* ===== Quill 编辑器实例缓存 ===== */
const _quillInstances = {};

/* ===== 清理所有编辑器实例（modal 关闭时调用） ===== */
window.destroyAllRichEditors = function() {
  Object.keys(_quillInstances).forEach(key => {
    // 只清理 DOM 中已不存在的容器
    if (!document.getElementById(key)) {
      delete _quillInstances[key];
    }
  });
};

/* ===== 富文本编辑器初始化 ===== */
window.initRichEditor = function(containerId, initialContent) {
  // 如果已存在实例，先销毁
  if (_quillInstances[containerId]) {
    _quillInstances[containerId] = null;
  }

  const container = document.getElementById(containerId);
  if (!container) return null;

  const toolbarOptions = [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'align': [] }],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    ['blockquote', 'code-block'],
    ['link', 'image'],
    ['clean']
  ];

  const quill = new Quill('#' + containerId, {
    theme: 'snow',
    placeholder: '请输入内容...',
    modules: {
      toolbar: toolbarOptions
    }
  });

  // 设置初始内容
  if (initialContent) {
    quill.root.innerHTML = initialContent;
  }

  // 自定义图片上传：点击图片工具按钮时
  const toolbar = quill.getModule('toolbar');
  toolbar.addHandler('image', function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        window.showToast('图片大小不能超过 10MB', 'warning');
        return;
      }
      try {
        window.showToast('图片上传中...', 'info');
        const result = await uploadFile(file);
        const range = quill.getSelection(true);
        quill.insertEmbed(range.index, 'image', result.url);
        quill.setSelection(range.index + 1);
        window.showToast('图片已插入', 'success');
      } catch(e) {
        window.showToast('图片上传失败: ' + e.message, 'error');
      }
    };
    input.click();
  });

  _quillInstances[containerId] = quill;
  return quill;
};

/* ===== 获取富文本内容 ===== */
window.getRichEditorContent = function(containerId) {
  const quill = _quillInstances[containerId];
  if (!quill) {
    // Fallback: 读取 textarea
    const ta = document.getElementById(containerId);
    return ta ? ta.value : '';
  }
  return quill.root.innerHTML;
};

/* ===== 设置富文本内容 ===== */
window.setRichEditorContent = function(containerId, html) {
  const quill = _quillInstances[containerId];
  if (quill) {
    quill.root.innerHTML = html || '';
  }
};

/* ===== 销毁编辑器实例 ===== */
window.destroyRichEditor = function(containerId) {
  if (_quillInstances[containerId]) {
    const quill = _quillInstances[containerId];
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = '';
    delete _quillInstances[containerId];
  }
};

/* ===== 附件管理 ===== */
const _attachmentsMap = {}; // containerId -> [{ name, url, size, type }]

/* ===== 附件数量格式化 ===== */
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

/* ===== 获取文件图标 ===== */
function getFileIcon(type, name) {
  if (!type) type = '';
  const ext = (name || '').split('.').pop().toLowerCase();
  if (type.startsWith('image/') || ['jpg','jpeg','png','gif','bmp','webp','svg'].includes(ext)) return '🖼️';
  if (type.startsWith('video/') || ['mp4','avi','mov','mkv','wmv','flv'].includes(ext)) return '🎬';
  if (type.startsWith('audio/') || ['mp3','wav','ogg','flac','aac'].includes(ext)) return '🎵';
  if (type === 'application/pdf' || ext === 'pdf') return '📄';
  if (['doc','docx'].includes(ext) || type.includes('word')) return '📝';
  if (['xls','xlsx'].includes(ext) || type.includes('spreadsheet') || type.includes('excel')) return '📊';
  if (['ppt','pptx'].includes(ext) || type.includes('presentation')) return '📽️';
  if (['zip','rar','7z','tar','gz'].includes(ext) || type.includes('zip') || type.includes('rar')) return '📦';
  if (['txt','md','csv'].includes(ext)) return '📃';
  return '📎';
}

/* ===== 渲染附件列表 HTML ===== */
function renderAttachmentListHTML(containerId) {
  const attachments = _attachmentsMap[containerId] || [];
  if (!attachments.length) return '<div class="text-sm text-muted" style="padding:8px 0">暂无附件</div>';
  return '<div class="attachment-list">' + attachments.map((a, i) => {
    const icon = getFileIcon(a.type, a.name);
    return '<div class="attachment-item" data-index="' + i + '" data-container="' + containerId + '">' +
      '<span class="attachment-icon">' + icon + '</span>' +
      '<span class="attachment-name" title="' + window.escapeHtml(a.name) + '">' + window.escapeHtml(a.name) + '</span>' +
      '<span class="attachment-size">' + formatFileSize(a.size) + '</span>' +
      '<button class="btn btn-outline btn-sm attachment-delete-btn" onclick="window.removeAttachment(\'' + containerId + '\',' + i + ')" title="删除">&times;</button>' +
      '</div>';
  }).join('') + '</div>';
}

/* ===== 初始化附件管理区域 ===== */
window.initAttachmentManager = function(containerId, existingAttachments) {
  // 初始化附件数据
  _attachmentsMap[containerId] = existingAttachments ? JSON.parse(JSON.stringify(existingAttachments)) : [];

  const wrapper = document.getElementById(containerId);
  if (!wrapper) return;

  wrapper.innerHTML =
    '<div class="attachment-dropzone" id="' + containerId + '-dropzone">' +
      '<div class="dropzone-hint">' +
        '<span style="font-size:1.5rem">📎</span>' +
        '<div>点击或拖拽文件到此处上传附件</div>' +
        '<div class="text-xs text-muted">支持所有文件类型，单个最大 100MB，最多 10 个</div>' +
      '</div>' +
      '<input type="file" multiple id="' + containerId + '-file-input" style="display:none">' +
    '</div>' +
    '<div id="' + containerId + '-file-list">' + renderAttachmentListHTML(containerId) + '</div>';

  // 点击上传
  const dropzone = document.getElementById(containerId + '-dropzone');
  const fileInput = document.getElementById(containerId + '-file-input');

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', function() { fileInput.click(); });
    fileInput.addEventListener('change', function() {
      handleAttachmentFiles(containerId, Array.from(fileInput.files));
      fileInput.value = '';
    });

    // 拖拽上传
    dropzone.addEventListener('dragover', function(e) {
      e.preventDefault();
      dropzone.classList.add('dropzone-active');
    });
    dropzone.addEventListener('dragleave', function(e) {
      e.preventDefault();
      dropzone.classList.remove('dropzone-active');
    });
    dropzone.addEventListener('drop', function(e) {
      e.preventDefault();
      dropzone.classList.remove('dropzone-active');
      handleAttachmentFiles(containerId, Array.from(e.dataTransfer.files));
    });
  }
};

/* ===== 处理附件文件上传 ===== */
async function handleAttachmentFiles(containerId, files) {
  const attachments = _attachmentsMap[containerId] || [];
  const MAX_FILES = 10;
  const MAX_SIZE = 100 * 1024 * 1024; // 100MB

  if (attachments.length + files.length > MAX_FILES) {
    window.showToast('附件总数不能超过 ' + MAX_FILES + ' 个', 'warning');
    return;
  }

  for (const file of files) {
    if (file.size > MAX_SIZE) {
      window.showToast('文件 "' + file.name + '" 超过 100MB 限制', 'warning');
      continue;
    }
    try {
      window.showToast('正在上传: ' + file.name, 'info');
      const result = await uploadFile(file);
      attachments.push({
        name: file.name,
        url: result.url,
        size: file.size,
        type: file.type || ''
      });
      window.showToast(file.name + ' 上传成功', 'success');
    } catch(e) {
      window.showToast(file.name + ' 上传失败', 'error');
    }
  }

  _attachmentsMap[containerId] = attachments;

  // 刷新列表
  const listEl = document.getElementById(containerId + '-file-list');
  if (listEl) {
    listEl.innerHTML = renderAttachmentListHTML(containerId);
  }
}

/* ===== 删除附件 ===== */
window.removeAttachment = function(containerId, index) {
  const attachments = _attachmentsMap[containerId] || [];
  const removed = attachments[index];
  if (removed) {
    // 从服务器删除文件
    if (removed.url && removed.url.startsWith('/uploads/')) {
      deleteUpload(removed.url).catch(() => {});
    }
    attachments.splice(index, 1);
    _attachmentsMap[containerId] = attachments;
    const listEl = document.getElementById(containerId + '-file-list');
    if (listEl) {
      listEl.innerHTML = renderAttachmentListHTML(containerId);
    }
  }
};

/* ===== 获取附件数据 ===== */
window.getAttachments = function(containerId) {
  return _attachmentsMap[containerId] || [];
};

/* ===== 渲染附件下载列表（只读） ===== */
window.renderAttachmentDownloads = function(attachments) {
  if (!attachments || !attachments.length) return '';
  let html = '<div class="attachment-download-section">' +
    '<div class="attachment-section-title">📎 附件下载</div>' +
    '<div class="attachment-download-list">';
  attachments.forEach(a => {
    const icon = getFileIcon(a.type, a.name);
    html += '<a class="attachment-download-item" href="' + window.escapeHtml(a.url) + '" download="' + window.escapeHtml(a.name) + '" target="_blank">' +
      '<span class="attachment-icon">' + icon + '</span>' +
      '<span class="attachment-download-name">' + window.escapeHtml(a.name) + '</span>' +
      '<span class="attachment-download-size">' + formatFileSize(a.size) + '</span>' +
      '<span class="attachment-download-btn">下载</span>' +
      '</a>';
  });
  html += '</div></div>';
  return html;
};

/* ===== 附件数量 badge HTML ===== */
window.renderAttachmentBadge = function(attachments) {
  if (!attachments || !attachments.length) return '';
  return '<span class="badge badge-sm badge-info ml-1" title="' + attachments.length + ' 个附件">📎 ' + attachments.length + '</span>';
};
