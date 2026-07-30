// Background Service Worker for Credo Extension

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "credo-verify-selection",
    title: "Verify Selection with Credo",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "credo-verify-selection" && info.selectionText) {
    fetch("http://localhost:8000/api/v1/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text_content: info.selectionText, modality: "text" })
    }).then(res => res.json()).then(data => {
      chrome.action.setBadgeText({ text: "...", tabId: tab.id });
    }).catch(err => console.error("Credo verify context menu error:", err));
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "UPDATE_BADGE") {
    const text = `${Math.round(message.score)}`;
    const color = message.score >= 70 ? "#10b981" : (message.score >= 40 ? "#f59e0b" : "#ef4444");
    chrome.action.setBadgeText({ text, tabId: sender.tab ? sender.tab.id : undefined });
    chrome.action.setBadgeBackgroundColor({ color });
  }
});
