(function () {
  const DEFAULT_BASE = 'http://localhost:3000'; // 替换为你的线上地址

  function getBaseUrl() {
    return new Promise((resolve) => {
      chrome.storage.sync.get({ baseUrl: DEFAULT_BASE }, (data) => resolve(data.baseUrl || DEFAULT_BASE));
    });
  }

  function ensureStyles() {
    if (document.getElementById('ai-assistant-style')) return;
    const style = document.createElement('style');
    style.id = 'ai-assistant-style';
    style.textContent = `
      .ai-assist-fab{position:fixed;right:18px;bottom:18px;z-index:2147483000;background:#111;color:#fff;
        border-radius:999px;padding:10px 14px;font:12px/1 system-ui;box-shadow:0 6px 20px rgba(0,0,0,.25);cursor:pointer;opacity:.9}
      .ai-assist-fab:hover{opacity:1}
      .ai-assist-panel{position:fixed;right:18px;bottom:70px;width:min(520px,92vw);height:min(70vh,560px);
        border-radius:16px;overflow:hidden;z-index:2147483001;box-shadow:0 12px 40px rgba(0,0,0,.35);backdrop-filter:saturate(1.1) blur(6px)}
      .ai-assist-iframe{width:100%;height:100%;border:0;background:#000}
    `;
    document.documentElement.appendChild(style);
  }

  let panel = null;
  function openPanel(query) {
    ensureStyles();
    if (panel) panel.remove();
    panel = document.createElement('div');
    panel.className = 'ai-assist-panel';
    const iframe = document.createElement('iframe');
    iframe.className = 'ai-assist-iframe';
    getBaseUrl().then((BASE) => {
      const q = query || window.getSelection().toString();
      iframe.src = BASE.replace(/\/$/, '') + '/ask' + (q ? ('?q=' + encodeURIComponent(q)) : '');
      panel.appendChild(iframe);
      document.documentElement.appendChild(panel);
    });
  }

  function toggle() {
    if (panel) { panel.remove(); panel = null; }
    else openPanel();
  }

  // 悬浮按钮（可选，可在选项中关闭）
  chrome.storage.sync.get({ showFab: false }, (cfg) => {
    if (!cfg.showFab) return;
    const fab = document.createElement('button');
    fab.className = 'ai-assist-fab';
    fab.textContent = 'AI';
    fab.title = 'AI 助手（Alt+K 打开/关闭）';
    fab.addEventListener('click', () => openPanel());
    document.documentElement.appendChild(fab);
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel) { panel.remove(); panel = null; }
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === 'AI_ASSIST') openPanel(msg.query || '');
    if (msg?.type === 'AI_TOGGLE') toggle();
  });
})();

