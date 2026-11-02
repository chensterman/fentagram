chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {})
chrome.sidePanel.setOptions({ enabled: false }).catch(() => {})

chrome.runtime.onMessage.addListener((message, sender) => {
  const tabId = sender.tab?.id
  if (tabId == null) return
  if (message?.type === 'fentagram-arm-panel') {
    chrome.sidePanel.setOptions({ tabId, path: 'panel.html', enabled: true }).catch(() => {})
    return
  }
  if (message?.type === 'fentagram-open-panel') {
    chrome.sidePanel.open({ tabId }).catch(() => {})
    return
  }
  if (message?.type === 'fentagram-profile' && message.own === true) {
    chrome.sidePanel.setOptions({ tabId, path: 'panel.html', enabled: true })
      .then(() => chrome.sidePanel.open({ tabId }))
      .catch(() => {})
    return
  }
  if (message?.type === 'fentagram-profile' && message.own === false) {
    chrome.sidePanel.close({ tabId }).catch(() => {})
    chrome.sidePanel.setOptions({ tabId, enabled: false }).catch(() => {})
  }
})
