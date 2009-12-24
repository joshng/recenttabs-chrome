var MRUTabManager = (function() {
  var TabInfo = Object.newSubclass({
    update: function(tab) {
      this.tab = tab;
    },
    onSelected: function(tab) {
      this.update(tab);
      this.selectedAt = new Date().getTime();
    }
  });

  var infoById = new HashWithDefault(TabInfo.factory);

  chrome.tabs.onUpdated.addListener(function(tabId) {
    chrome.tabs.get(tabId, function(tab) {
      infoById.get(tab.id).update(tab);
    });
  });

  function onTabSelected(tab) {
    infoById.get(tab.id).onSelected(tab);
  }

  chrome.windows.getAll({populate: true}, function(windows) {
    windows.pluck('tabs').invoke('each', onTabSelected);
  });

  chrome.tabs.getSelected(null, onTabSelected);

  chrome.tabs.onSelectionChanged.addListener(function(tabId) {
    chrome.tabs.get(tabId, onTabSelected);
  });

  function removeTabId(tabId) {
    tabInfoById.unset(tabId);
  }

  chrome.tabs.onRemoved.addListener(removeTabId);

  chrome.tabs.onDetached.addListener(removeTabId);

  chrome.tabs.onAttached.addListener(function(tabId, info) {
    chrome.tabs.get(tabId, onTabSelected);
  });

  return {
    getTabsForWindowId: function(windowId) {
      return infoById.values().select(function(info) {
        return info.tab.windowId == windowId;
      }).sortBy(function(info) { return -info.selectedAt }).pluck('tab');
    }
  };
}());

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
  console.debug('Request:', request);
  switch (request.action) {
    case 'list':
      sendResponse({tabs: MRUTabManager.getTabsForWindowId(sender.tab.windowId)});
      break;
    case 'switch':
      chrome.tabs.update(request.tabId, {selected: true});
      sendResponse({});
      break;
  }
});
