////////////////
// core logic //
////////////////

const getActivityStatus = () => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(["activityStatus"], ({ activityStatus }) => {
      if (activityStatus === undefined) {
        activityStatus = false;
        resolve(activityStatus);
      } else if (activityStatus) {
        activityStatus = JSON.parse(activityStatus);
        resolve(activityStatus);
      } else {
        reject();
      }
    });
  });
};

const setActivityStatus = async (status) => {
  if (status === true) {
    await chrome.storage.local.set({ activityStatus: "true" });
  } else if (status === false) {
    await chrome.storage.local.set({ activityStatus: "false" });
  }
};

const setHandlerStatus = async (status) => {
  if (status === true) {
    await chrome.storage.local.set({ handlerReady: "true" });
  } else if (status === false) {
    await chrome.storage.local.set({ handlerReady: "false" });
  }
};

const getHandlerStatus = () => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(["activityStatus"], ({ activityStatus }) => {
      if (activityStatus === undefined) {
        activityStatus = false;
        resolve(activityStatus);
      } else if (activityStatus) {
        activityStatus = JSON.parse(activityStatus);
        resolve(activityStatus);
      } else {
        reject();
      }
    });
  });
};

const queryActiveTabId = async () => {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs.length > 0) {
        resolve(tabs[0].id);
      } else {
        reject();
      }
    });
  });
};

const getActiveTabId = async () => {
  const { activeTabId } = await chrome.storage.local.get(["activeTabId"]);
  if (activeTabId === undefined) {
    return await queryActiveTabId();
  } else if (activeTabId) {
    return JSON.parse(activeTabId);
  }
};

const setActiveTabId = async (tabId) => {
  await chrome.storage.local.set({ activeTabId: tabId });
};

const checkInjection = async (tabId) => {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { key: "check" });
    if (response.received === true) {
      return true;
    }
  } catch (err) {
    return false;
  }
};

const toggleInjection = async (id, command) => {
  try {
    await chrome.tabs.sendMessage(id, { key: command });
  } catch (err) {
    console.log(err);
  }
};

const openHandlerTab = async () => {
  const handlerUrl = chrome.runtime.getURL("./src/handler/handler.html");
  const handlerTab = await chrome.tabs.create({
    url: handlerUrl,
    active: true,
    pinned: true,
  });
  await chrome.storage.local.set({ handlerTabId: handlerTab.id });
};

const closeHandlerTab = async () => {
  try {
    await chrome.runtime.sendMessage({ key: "abort" });
  } catch (err) {
    await setActivityStatus(false);
  }
};

const injectScript = async (targetTabId) => {
  await chrome.scripting.executeScript({
    target: { tabId: targetTabId },
    files: ["./src/inject/inject.js"],
  });
};

const launchCycle = async () => {
  const targetTabId = await queryActiveTabId();
  await setActiveTabId(targetTabId);

  await openHandlerTab();
  if ((await checkInjection(targetTabId)) === false)
    await injectScript(targetTabId);
  await toggleInjection(targetTabId, "on");

  console.log("sharks🦈-on");
};

const abortCycle = async () => {
  const targetTabId = await getActiveTabId();
  await closeHandlerTab();
  await toggleInjection(targetTabId, "off");

  console.log("sharks🦈-off");
};

///////////////////////////
// chrome event listners //
///////////////////////////

chrome.action.onClicked.addListener(async (tab) => {
  const activityStatus = await getActivityStatus();
  if (activityStatus === false) launchCycle().catch((err) => {});
  if (activityStatus === true) abortCycle();
});

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.clear();
  console.log("sharks🦈-initialized");
});

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  switch (message.key) {
    case "handlerReady":
      getActiveTabId()
        .then((tabId) => {
          chrome.tabs.update(tabId, { active: true }, () => {});
        })
        .catch((err) => {
          console.log(err);
        });
      break;
    default:
      break;
  }
  return true;
});
