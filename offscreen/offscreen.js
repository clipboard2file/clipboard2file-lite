chrome.runtime.onMessage.addListener(message => {
  if (message.type === "readClipboard") {
    return readClipboard();
  }

  if (message.type === "clearClipboard") {
    const ta = document.getElementById("textTarget");
    ta.value = "";
    ta.select();
    document.execCommand("copy");
    return true;
  }
});

async function readClipboard() {
  return new Promise(resolve => {
    const target = document.getElementById("target");
    target.innerHTML = "";
    target.focus();

    target.addEventListener(
      "paste",
      e => {
        e.preventDefault();

        const items = e.clipboardData.items;
        let imageFile = null;
        let textContent = null;

        for (const item of items) {
          if (item.type === "image/png" && !imageFile) {
            imageFile = item.getAsFile();
          }
          if (item.type === "text/plain" && textContent === null) {
            textContent = e.clipboardData.getData("text/plain");
          }
        }

        if (imageFile) {
          imageFile.arrayBuffer().then(buffer => {
            resolve({
              blobData: Array.from(new Uint8Array(buffer)),
              blobMimeType: "image/png",
              blobType: "image",
            });
          });
          return;
        }

        if (textContent && textContent.length > 0) {
          const blob = new Blob([textContent], { type: "text/plain" });
          blob.arrayBuffer().then(buffer => {
            resolve({
              blobData: Array.from(new Uint8Array(buffer)),
              blobMimeType: "text/plain",
              blobType: "text",
            });
          });
          return;
        }

        resolve({ blobData: null, blobType: null });
      },
      { once: true }
    );

    document.execCommand("paste");
  });
}
