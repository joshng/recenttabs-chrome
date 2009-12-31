var MRUTabManager = (function() {
  var TabInfo = Object.newSubclass({
    update: function(tab) {
      this.tab = tab;
    },
    onSelected: function(tab) {
      this.update(tab);
      this.selectedAt = new Date().getTime();
      console.debug('selected: ', tab.title, tab);
    }
  });

  var tabInfoById = new HashWithDefault(TabInfo.factory);

  chrome.tabs.onUpdated.addListener(function(tabId) {
    chrome.tabs.get(tabId, function(tab) {
      tabInfoById.get(tab.id).update(tab);
    });
  });

  function onTabSelected(tab) {
    tabInfoById.get(tab.id).onSelected(tab);
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

  return {
    getTabsForWindowId: function(windowId) {
      return tabInfoById.values().select(function(info) {
        return info.tab.windowId == windowId;
      }).sortBy(function(info) { return -info.selectedAt }).pluck('tab');
    }
  };
}());

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
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
