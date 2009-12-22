var MRUTabManager = (function() {
  var MRUList = Array.newSubclass({
    insert: function(item) {
      this.remove(item);
      this.unshift(item);
    }
  });

  var TabWrapper = Object.newSubclass();

  Object.extend(TabWrapper, {
    byId: new HashWithDefault(TabWrapper.factory),
    get: function(tab) {
      var wrapper = TabWrapper.byId.get(tab.id);
      wrapper.tab = tab;
      return wrapper;
    },
    remove: function(tabId) {
      return this.byId.unset(tabId);
    }
  });

  chrome.tabs.onUpdated.addListener(function(tabId) {
    chrome.tabs.get(tabId, function(tab) {
      TabWrapper.get(tab);
    });
  });

  var mruListsByWindowId = new HashWithDefault(MRUList.factory);

  function onTabSelected(tab) {
    mruListsByWindowId.get(tab.windowId).insert(TabWrapper.get(tab))
  }

  chrome.windows.getAll({populate: true}, function(windows) {
    windows.pluck('tabs').invoke('each', onTabSelected);
  });

  chrome.tabs.getSelected(null, onTabSelected);

  chrome.tabs.onSelectionChanged.addListener(function(tabId) {
    chrome.tabs.get(tabId, onTabSelected);
  });


  function removeTabId(tabId) {
    var wrapper = TabWrapper.byId.get(tabId);
    if (!wrapper) return;
    mruListsByWindowId.get(wrapper.tab.windowId).remove(wrapper);
  }

  chrome.tabs.onRemoved.addListener(removeTabId);

  chrome.tabs.onDetached.addListener(removeTabId);

  chrome.tabs.onAttached.addListener(function(tabId, info) {
    chrome.tabs.get(tabId, onTabSelected);
  });

  return {
    getTabsForWindowId: function(windowId) {
      return mruListsByWindowId.get(windowId).pluck('tab');
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
