const MENU_ID = 'ai-assistant-ask';
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: MENU_ID, title: '用 AI 助手解答', contexts: ['selection'] });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === MENU_ID && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'AI_ASSIST', query: info.selectionText || '' });
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-assistant') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) chrome.tabs.sendMessage(tabs[0].id, { type: 'AI_TOGGLE' });
    });
  }
});

