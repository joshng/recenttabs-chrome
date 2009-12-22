var active = false;
var tabList = null;
var selectedIdx = 0;

$(function() {
  $(document).keydown(function(e) {
    var t = e.target;
    var tn = t.nodeName;
    if (tn == 'INPUT' || tn == 'TEXTAREA' || t.attributes.getNamedItem('contentEditable') != null) return;
    
    if (!e.ctrlKey) {
      hideMenu();
      return;
    }
    var offset = 0;
    switch (e.originalEvent.keyIdentifier) {
      case "U+0050": // p
        offset = 1;
        break;
      case "U+004E": // n
        offset = -1;
        break;
      case "Esc":
        hideMenu();
        return;
      default:
        return;
    }
    e.preventDefault();

    if (!active) {
      selectedIdx = 0;
      chrome.extension.sendRequest({action: 'list'}, function(response) {
        tabList = response.tabs;
        console.debug('List: ', tabList);
        active = true;
        showMenu();
        moveSelection(offset);
      });
    } else {
      moveSelection(offset);
    }
  });

  $(document).keyup(function(e) {
    if (active && e.originalEvent.keyIdentifier == 'Control') {
      var selectedId = tabList[selectedIdx].id;
      hideMenu();
      setTimeout(function() {
        chrome.extension.sendRequest({action: 'switch', tabId: selectedId})
      }, 1);
    }
  });
});

function moveSelection(offset) {
  $(tabIdxId(selectedIdx)).removeClass('__mrutab_hilite');
  selectedIdx = (selectedIdx + offset + tabList.length) % tabList.length;
  $(tabIdxId(selectedIdx)).addClass('__mrutab_hilite');
}

var box, menu;
function showMenu() {
  if (!menu) {
    box = $(document.body).append('<div id="__mrutab_box"><table id="__mrutab_menu"/></div>').find('#__mrutab_box');
    menu = $("#__mrutab_menu");
  }
  var rows = '';
  tabList.each(function(tab, idx) {
    var id = tabIdxId(idx, true);
    rows = '<tr id="' + id + '"><td class="__mrutab_tab_icon"><img width="16" height="16" alt=" ?" src="' + tab.favIconUrl + '"/></td><td class="__mrutab_tab_title">' + truncateMiddle(tab.title, 32) + '</td><td class="__mrutab_tab_url">' + truncateMiddle(tab.url, 48) + '</td></tr>' + rows;
  });
  menu.html(rows);
  box.hide().fadeIn('fast');
}

function hideMenu() {
  box.hide();
  active = false;
}

function truncateMiddle(string, length) {
  if (string.length > length) {
    var halfLen = (length - 1) / 2;
    return string.substring(0, halfLen) + "&hellip;" + string.substring(string.length - halfLen,string.length);
  } else {
    return string;
  }
}
function tabIdxId(idx, omitHash) {
  return (omitHash ? '' : '#') + '__mrutab_menu_' + idx ;
}
