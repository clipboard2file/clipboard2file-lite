const NONCE = Array.from(crypto.getRandomValues(new Uint8Array(16)), b =>
  b.toString(16).padStart(2, "0")
).join("");

document.documentElement.dataset.c2fNonce = NONCE;

const SESSION_EVENT = `${NONCE}:session`;
const COMMAND_EVENT = `${NONCE}:command`;

function dispatchMainWorldCommand(detail) {
  document.dispatchEvent(
    new CustomEvent(COMMAND_EVENT, {
      detail,
    })
  );
}

document.addEventListener(SESSION_EVENT, event => {
  const { elementId } = event.detail ?? {};
  if (typeof elementId !== "string") {
    return;
  }

  handleInputSession(elementId);
});

function handleInputSession(elementId) {
  const port = chrome.runtime.connect({ name: "input" });

  const listener = message => {
    if (message.type === "showPicker") {
      try {
        dispatchMainWorldCommand({
          type: "showPicker",
          elementId,
        });
      } finally {
        port.disconnect();
      }
      return;
    }

    if (message.type === "files") {
      dispatchMainWorldCommand({
        type: "files",
        elementId,
        blobData: message.blobData,
        blobMimeType: message.blobMimeType,
        fileName: message.fileName,
      });
      port.disconnect();
    }

    if (message.type === "cancel") {
      dispatchMainWorldCommand({
        type: "cancel",
        elementId,
      });
      port.disconnect();
    }
  };

  const cleanup = () => {
    dispatchMainWorldCommand({
      type: "dispose",
      elementId,
    });
    port.onMessage.removeListener(listener);
    port.onDisconnect.removeListener(cleanup);
  };

  port.onMessage.addListener(listener);
  port.onDisconnect.addListener(cleanup);

  port.postMessage({
    type: "inputClicked",
    elementId,
  });
}
