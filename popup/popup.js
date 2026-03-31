import { getAllSettings } from "../settings/settings.js";

async function getCurrentWindowId() {
  const currentWindow = await chrome.windows.getCurrent();
  return currentWindow?.id;
}

document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    e.preventDefault();
    chrome.runtime.sendMessage({ type: "cancel", windowId });
    window.close();
  }
});

document.addEventListener("pointerdown", e => {
  if (e.target === document.body) {
    chrome.runtime.sendMessage({ type: "cancel", windowId });
    window.close();
  }
});

const windowId = await getCurrentWindowId();
const popupPort =
  windowId === undefined
    ? null
    : chrome.runtime.connect({ name: `popup-${windowId}` });

window.addEventListener(
  "pagehide",
  () => {
    popupPort?.disconnect();
  },
  { once: true }
);

const [init, settings] = await Promise.all([
  chrome.runtime.sendMessage({ type: "initPopup", windowId }),
  getAllSettings(),
]);

if (!init) {
  location.replace(chrome.runtime.getURL("./settings/options.html"));
} else {
  const {
    clipboardBlobData,
    clipboardBlobMimeType,
    clipboardType,
  } = init;

  // Reconstruct blob from byte array data
  const clipboardBlob = new Blob([new Uint8Array(clipboardBlobData)], {
    type: clipboardBlobMimeType,
  });

  const popup = document.getElementById("popup");
  const filenameContainer = document.getElementById("filenameContainer");
  const filenameInput = document.getElementById("filename");
  const formatToggle = document.getElementById("formatToggle");
  const floatingFormatToggle = document.getElementById("floatingFormatToggle");
  const preview = document.getElementById("preview");
  const imagePreview = document.getElementById("imagePreview");
  const textPreview = document.getElementById("textPreview");
  const showAllFiles = document.getElementById("showAllFiles");

  const originalBlob = clipboardBlob;
  const jpegQuality = settings.jpegQuality / 100;
  const textExtension = settings.textExtension;

  let currentBlob = clipboardBlob;
  let currentFormat = settings.defaultFileType;
  let lastSelection = null;

  const computeInitialBaseName = () => {
    const isText = clipboardType === "text";
    const mode = isText
      ? settings.defaultFilenameText
      : settings.defaultFilenameImage;

    if (mode === "unix") {
      return String(Temporal.Now.instant().epochMilliseconds);
    }

    if (mode === "custom") {
      const customValue = isText
        ? settings.customFilenameText
        : settings.customFilenameImage;
      return customValue || (isText ? "text" : "image");
    }

    return (isText ? "" : "img-") + getFormattedDate();
  };

  const defaultFilenameBase = computeInitialBaseName();

  const computeFinalFilename = () => {
    const input = filenameInput.textContent.trim();
    const baseName = input.length > 0 ? input : defaultFilenameBase;

    if (clipboardType === "text") {
      return input.length === 0 ? `${baseName}.${textExtension}` : baseName;
    }

    const ext = currentFormat === "jpeg" ? ".jpg" : ".png";
    return baseName.replace(/\.(png|jpg|jpeg)$/i, "") + ext;
  };

  const updatePreview = () => {
    if (clipboardType === "text") {
      imagePreview.hidden = true;
      textPreview.hidden = false;

      currentBlob.text().then(text => {
        textPreview.textContent = text;
      });

      return;
    }

    if (clipboardType === "image") {
      textPreview.hidden = true;
      imagePreview.hidden = false;

      if (imagePreview.src) {
        URL.revokeObjectURL(imagePreview.src);
      }
      imagePreview.src = URL.createObjectURL(currentBlob);
    }
  };

  const setFileType = async (type, saveToStorage = false) => {
    if (clipboardType === "text") {
      updatePreview();
      return;
    }

    if (clipboardType === "image") {
      popup.dataset.format = type;
      currentFormat = type;

      if (type === "jpeg") {
        currentBlob = await convertToJpeg(originalBlob, jpegQuality);
      } else {
        currentBlob = originalBlob;
      }

      updatePreview();

      if (saveToStorage) {
        chrome.storage.local.set({ defaultFileType: type });
      }
    }
  };

  const updateEmptyState = () => {
    filenameInput.classList.toggle("empty", filenameInput.textContent === "");
  };

  const selectBaseName = element => {
    if (!element.firstChild) return;
    const range = document.createRange();

    if (clipboardType === "text") {
      const text = element.textContent;
      const lastDot = text.lastIndexOf(".");
      if (lastDot > 0 && element.firstChild.nodeType === Node.TEXT_NODE) {
        range.setStart(element.firstChild, 0);
        range.setEnd(element.firstChild, lastDot);
      } else {
        range.selectNodeContents(element);
      }
    } else if (clipboardType === "image") {
      range.selectNodeContents(element);
    }

    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  };

  if (clipboardType === "text") {
    const full = `${defaultFilenameBase}.${textExtension}`;
    filenameInput.textContent = full;
    filenameInput.dataset.placeholder = full;
  } else if (clipboardType === "image") {
    filenameInput.textContent = defaultFilenameBase;
    filenameInput.dataset.placeholder = defaultFilenameBase;
  }

  const showFilenameBox =
    clipboardType === "text"
      ? settings.showFilenameBoxText
      : settings.showFilenameBoxImage;

  if (showFilenameBox) {
    filenameContainer.hidden = false;
  }

  if (settings.showFormatToggleButton && clipboardType === "image") {
    if (showFilenameBox) {
      formatToggle.hidden = false;
    } else {
      floatingFormatToggle.hidden = false;
    }
  }

  showAllFiles.textContent = chrome.i18n.getMessage("showAllFiles");

  filenameInput.addEventListener("input", updateEmptyState);

  filenameInput.addEventListener("beforeinput", event => {
    const { inputType } = event;

    if (inputType === "insertParagraph" || inputType === "insertLineBreak") {
      event.preventDefault();
    }
  });

  filenameInput.addEventListener("paste", event => {
    event.preventDefault();
    const text = event.clipboardData.getData("text").replace(/[\r\n]+/g, " ");
    document.execCommand("insertText", false, text);
  });

  updateEmptyState();

  await setFileType(settings.defaultFileType, false);

  document.addEventListener("selectionchange", () => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (filenameInput.contains(range.commonAncestorContainer)) {
        lastSelection = {
          anchorNode: selection.anchorNode,
          anchorOffset: selection.anchorOffset,
          focusNode: selection.focusNode,
          focusOffset: selection.focusOffset,
        };
      }
    }
  });

  const restoreSelection = () => {
    if (!lastSelection) {
      return;
    }

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.setBaseAndExtent(
      lastSelection.anchorNode,
      lastSelection.anchorOffset,
      lastSelection.focusNode,
      lastSelection.focusOffset
    );
  };

  window.addEventListener("blur", e => {
    if (e.target === window && document.activeElement === filenameInput) {
      restoreSelection();
    }
  });

  filenameInput.addEventListener("focus", restoreSelection);

  filenameContainer.addEventListener("click", e => {
    if (e.target !== formatToggle) {
      filenameInput.focus();
    }
  });

  const handleEnter = e => {
    if (e.key === "Enter") {
      e.preventDefault();
      preview.click();
    }
  };

  filenameInput.addEventListener("keydown", handleEnter);
  textPreview.addEventListener("keydown", handleEnter);

  const handleFormatToggle = async e => {
    e.preventDefault();
    // In Chrome, filter out real mouse clicks to avoid double-fire from
    // both mousedown and click handlers
    if (e.button === 2 || (e.type === "click" && e.pointerType === "mouse")) {
      return;
    }

    const newType = currentFormat === "jpeg" ? "png" : "jpeg";
    await setFileType(newType, true);
  };

  if (clipboardType === "image") {
    formatToggle.addEventListener("mousedown", handleFormatToggle);
    floatingFormatToggle.addEventListener("mousedown", handleFormatToggle);
    formatToggle.addEventListener("click", handleFormatToggle);
    floatingFormatToggle.addEventListener("click", handleFormatToggle);
  }

  preview.addEventListener(
    "click",
    async () => {
      const filename = computeFinalFilename();
      const buffer = await currentBlob.arrayBuffer();

      chrome.runtime.sendMessage({
        type: "files",
        windowId,
        blobData: Array.from(new Uint8Array(buffer)),
        blobMimeType: currentBlob.type,
        fileName: filename,
        isFromClipboard: true,
      });
      window.close();
    },
    { once: true }
  );

  showAllFiles.addEventListener(
    "click",
    async () => {
      popup.style.opacity = "0";
      await chrome.runtime.sendMessage({
        type: "showPicker",
        windowId,
      });
      window.close();
    },
    { once: true }
  );

  if (showFilenameBox) {
    filenameInput.focus();
    selectBaseName(filenameInput);
  } else {
    window.focus();
  }

  if (clipboardType === "image") {
    try {
      await imagePreview.decode();
    } catch (error) {
      console.error(error);
    }
  }
}
function getFormattedDate() {
  const now = Temporal.Now.plainDateTimeISO();
  const p = n => String(n).padStart(2, "0");
  return (
    `${now.year}-${p(now.month)}-${p(now.day)}-` +
    `${p(now.hour)}-${p(now.minute)}-${p(now.second)}`
  );
}

async function convertToJpeg(blob, quality) {
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("bitmaprenderer", { alpha: false });
  ctx.transferFromImageBitmap(bitmap);
  return await canvas.convertToBlob({
    type: "image/jpeg",
    quality: quality,
  });
}
