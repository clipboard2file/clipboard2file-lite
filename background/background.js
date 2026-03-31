import { getSetting } from "../settings/settings.js";

const sessions = new Map();

async function ensureOffscreen() {
  if (await chrome.offscreen.hasDocument()) {
    return;
  }

  await chrome.offscreen.createDocument({
    url: "offscreen/offscreen.html",
    reasons: ["CLIPBOARD"],
    justification: "Read/write clipboard",
  });
}

async function readClipboard() {
  await ensureOffscreen();
  return chrome.runtime.sendMessage({ type: "readClipboard" });
}

chrome.runtime.onMessage.addListener(async (message, sender) => {
  const windowId = message.windowId || sender.tab?.windowId;
  const session = windowId ? sessions.get(windowId) : null;

  if (message.type === "initPopup") {
    return session ? { ...session.data } : null;
  }

  if (!windowId) {
    return;
  }

  if (!session) {
    return;
  }

  switch (message.type) {
    case "files": {
      session.inputPort.postMessage({
        type: "files",
        blobData: message.blobData,
        blobMimeType: message.blobMimeType,
        fileName: message.fileName,
      });

      if (message.isFromClipboard) {
        const setting =
          session.data.clipboardType === "text"
            ? "clearOnPasteText"
            : "clearOnPasteImage";

        if (await getSetting(setting)) {
          await ensureOffscreen();
          chrome.runtime.sendMessage({ type: "clearClipboard" });
        }
      }
      cleanupSession(windowId);
      break;
    }
    case "showPicker": {
      session.inputPort.postMessage({ type: "showPicker" });
      break;
    }
    case "cancel": {
      session.inputPort.postMessage({ type: "cancel" });
      cleanupSession(windowId);
      break;
    }
  }
});

chrome.runtime.onConnect.addListener(port => {
  const isPopupPort = port.name.startsWith("popup-");
  const popupWindowId = Number(port.name.replace("popup-", ""));
  const windowId = port.sender.tab?.windowId ?? popupWindowId;

  if (!windowId) {
    return;
  }

  const addDisconnectListener = messageListener => {
    const listener = () => {
      port.onDisconnect.removeListener(listener);

      if (messageListener) {
        port.onMessage.removeListener(messageListener);
      }

      cleanupSession(windowId);
    };
    port.onDisconnect.addListener(listener);
  };

  switch (isPopupPort ? "popup" : port.name) {
    case "input": {
      const listener = async message => {
        if (message.type === "inputClicked") {
          const clipResult = await readClipboard();

          let blob = null;
          let blobType = null;

          if (
            clipResult?.blobType === "image" &&
            (await getSetting("enableImagePaste"))
          ) {
            blob = clipResult;
            blobType = "image";
          }

          if (!blob && clipResult?.blobType === "text") {
            if (await getSetting("enableTextPaste")) {
              blob = clipResult;
              blobType = "text";
            }
          }

          if (sessions.has(windowId)) {
            cleanupSession(windowId);
          }

          if (!blob) {
            port.postMessage({ type: "showPicker" });
            port.disconnect();
            return;
          }

          const context = {
            inputPort: port,
            windowId: port.sender.tab.windowId,
            data: {
              clipboardBlobData: blob.blobData,
              clipboardBlobMimeType: blob.blobMimeType,
              clipboardType: blobType,
            },
          };

          sessions.set(windowId, context);

          chrome.action
            .openPopup({ windowId: port.sender.tab.windowId })
            .catch(() => {});
        }
      };

      port.onMessage.addListener(listener);
      addDisconnectListener(listener);
      break;
    }
    case "popup": {
      const activeSession = sessions.get(windowId);

      if (!activeSession) {
        port.disconnect();
        return;
      }

      activeSession.popupPort = port;
      addDisconnectListener();
      break;
    }
  }
});

function cleanupSession(windowId) {
  const active = sessions.get(windowId);

  if (active) {
    sessions.delete(windowId);
    active.inputPort.disconnect();
    active.popupPort?.disconnect();
  }
}

chrome.runtime.onUpdateAvailable.addListener(() => {});
