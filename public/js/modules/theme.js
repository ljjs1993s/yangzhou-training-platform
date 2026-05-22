import { api } from '../api.js';

/* ========================================================================
   theme.js — 全局主题应用模块
   负责：从 API 加载网站风格设置 → 修改 CSS 变量 → 应用到全局
   ======================================================================== */

/* --- 6 套预设主题色映射表 --- */
const THEME_MAP = {
  '默认蓝': {
    '--color-primary':        '#1E4D8C',
    '--color-primary-light':  '#2B6CB0',
    '--color-primary-dark':   '#153E6B',
    '--color-primary-bg':     '#EBF0F7',
    '--color-accent':         '#C8842A',
    '--color-accent-light':   '#E8A84C',
    '--color-accent-dark':    '#A0651E',
  },
  '海洋蓝': {
    '--color-primary':        '#0D6E8C',
    '--color-primary-light':  '#128DA8',
    '--color-primary-dark':   '#0A556B',
    '--color-primary-bg':     '#E6F4F8',
    '--color-accent':         '#E8A84C',
    '--color-accent-light':   '#F0C07A',
    '--color-accent-dark':    '#C08030',
  },
  '森林绿': {
    '--color-primary':        '#2D6A4F',
    '--color-primary-light':  '#40916C',
    '--color-primary-dark':   '#1B4332',
    '--color-primary-bg':     '#E8F5EE',
    '--color-accent':         '#D4782A',
    '--color-accent-light':   '#E8984C',
    '--color-accent-dark':    '#B06020',
  },
  '暖阳橙': {
    '--color-primary':        '#D4782A',
    '--color-primary-light':  '#E8984C',
    '--color-primary-dark':   '#A05A1E',
    '--color-primary-bg':     '#FEF3E8',
    '--color-accent':         '#2D6A4F',
    '--color-accent-light':   '#40916C',
    '--color-accent-dark':    '#1B4332',
  },
  '典雅紫': {
    '--color-primary':        '#5B2C6F',
    '--color-primary-light':  '#7B3F91',
    '--color-primary-dark':   '#3E1D4D',
    '--color-primary-bg':     '#F3EAF7',
    '--color-accent':         '#C8842A',
    '--color-accent-light':   '#E8A84C',
    '--color-accent-dark':    '#A0651E',
  },
  '暗夜黑': {
    '--color-primary':        '#1A1A2E',
    '--color-primary-light':  '#2D2D4A',
    '--color-primary-dark':   '#0F0F1A',
    '--color-primary-bg':     '#EAEAF0',
    '--color-accent':         '#E94560',
    '--color-accent-light':   '#F06080',
    '--color-accent-dark':    '#C03050',
  },
};

/**
 * 将设置应用到全局 CSS 变量
 * @param {Object} settings - { site_theme, header_bg_color, btn_bg_color, ... }
 */
export function applyTheme(settings) {
  const root = document.documentElement;

  // 1. 应用预设主题色
  const themeName = settings.site_theme || '默认蓝';
  const preset = THEME_MAP[themeName];
  if (preset) {
    Object.entries(preset).forEach(([prop, value]) => {
      root.style.setProperty(prop, value);
    });
  }

  // 2. 应用自定义颜色（覆盖预设）
  // 自定义颜色为空时使用预设主题色，非空时用自定义值覆盖

  const presetBg = preset ? preset['--color-primary'] : '#1E4D8C';
  const presetAccent = preset ? preset['--color-accent'] : '#C8842A';
  const presetAccentLight = preset ? preset['--color-accent-light'] : '#E8A84C';

  // 2a. 头部背景颜色 → 控制 header 背景 + hero 渐变
  const headerBg = (settings.header_bg_color || '').trim();
  if (headerBg) {
    root.style.setProperty('--header-bg-color', headerBg);
    root.style.setProperty('--color-primary-dark', darkenColor(headerBg, 20));
    root.style.setProperty('--color-primary-light', lightenColor(headerBg, 20));
    root.style.setProperty('--color-primary-bg', lightenColor(headerBg, 85));
  } else {
    root.style.setProperty('--header-bg-color', presetBg);
  }
  // 2b. 头部文字颜色
  const headerText = (settings.header_text_color || '').trim();
  if (headerText) {
    root.style.setProperty('--header-text-color', headerText);
  } else {
    root.style.setProperty('--header-text-color', '#ffffff');
  }
  // 2c. 按钮背景色 → 控制 .btn-primary 和 .btn-accent 的背景
  const btnBg = (settings.btn_bg_color || '').trim();
  if (btnBg) {
    root.style.setProperty('--color-primary', btnBg);
    root.style.setProperty('--color-accent', btnBg);
  } else {
    root.style.setProperty('--color-primary', presetBg);
    root.style.setProperty('--color-accent', presetAccent);
  }
  // 2d. 按钮悬停背景色
  const btnHover = (settings.btn_hover_color || '').trim();
  if (btnHover) {
    root.style.setProperty('--btn-hover-color', btnHover);
  } else {
    root.style.setProperty('--btn-hover-color', lightenColor(presetAccent, 15));
  }
  // 2e. 头部分割线颜色
  const headerLine = (settings.header_line_color || '').trim();
  if (headerLine) {
    root.style.setProperty('--header-line-color', headerLine);
  } else {
    root.style.setProperty('--header-line-color', 'rgba(255,255,255,0.15)');
  }

  // 3. 应用网页模板
  if (settings.site_template) {
    applyTemplateClass(settings.site_template);
  }

  // 4. 更新 Hero 区域 — 渐变背景已通过 CSS 变量自动生效
  // 5. 更新页面标题
  if (settings.site_name) {
    document.title = settings.site_name;
  }

  // 6. 缓存设置到全局供其他模块使用
  window._siteSettings = settings;
}

/**
 * 从 API 加载设置并应用主题（异步）
 */
export async function initTheme() {
  try {
    const settings = await api.getSettings();
    if (settings && Object.keys(settings).length > 0) {
      applyTheme(settings);
    }
  } catch (e) {
    console.warn('initTheme: failed to load settings, using defaults', e);
  }
}

/**
 * 获取预设主题映射表（供 settings.js 使用）
 */
export function getThemeMap() {
  return THEME_MAP;
}

/**
 * 应用模板 CSS class 到 portal-main 元素
 */
function applyTemplateClass(templateName) {
  const portalMain = document.querySelector('.portal-main');
  if (!portalMain) return;
  portalMain.classList.remove('portal-classic', 'portal-modern', 'portal-minimal');
  const map = {
    '经典布局': 'portal-classic',
    '现代卡片': 'portal-modern',
    '简约列表': 'portal-minimal',
  };
  const cls = map[templateName] || 'portal-classic';
  portalMain.classList.add(cls);
}

/* ===== 颜色工具函数 ===== */

function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return { r, g, b };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => {
    const hex = Math.max(0, Math.min(255, Math.round(v))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function darkenColor(hex, percent) {
  const { r, g, b } = hexToRgb(hex);
  const factor = 1 - percent / 100;
  return rgbToHex(r * factor, g * factor, b * factor);
}

function lightenColor(hex, percent) {
  const { r, g, b } = hexToRgb(hex);
  const factor = percent / 100;
  return rgbToHex(
    r + (255 - r) * factor,
    g + (255 - g) * factor,
    b + (255 - b) * factor
  );
}
