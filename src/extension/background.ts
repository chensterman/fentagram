chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {})
// Keep the panel available from the toolbar on any tab; disabling it made the extension look broken in review.
chrome.sidePanel.setOptions({ path: 'panel.html', enabled: true }).catch(() => {})

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
  }
})
