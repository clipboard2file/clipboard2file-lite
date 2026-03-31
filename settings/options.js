import { options, groups, getAllSettings, getSetting } from "./settings.js";

const main = document.querySelector("main");
const settings = await getAllSettings();
const firefoxTipContextMenu = createFirefoxTipContextMenu();
const FIREFOX_TIP_CONTEXT_MENU_CURSOR_INSET_X = 2;
const FIREFOX_TIP_CONTEXT_MENU_CURSOR_INSET_Y = 2;

if (!settings.hideFirefoxTip) {
  renderFirefoxTip();
}

const ungroupedOptions = options.filter(o => !o.groupId && !o.hidden);
if (ungroupedOptions.length > 0) {
  renderSettingsGroup(null, ungroupedOptions);
}

for (const groupDef of groups) {
  const groupOptions = options.filter(
    o => o.groupId === groupDef.id && !o.hidden
  );
  if (groupOptions.length > 0) {
    renderSettingsGroup(groupDef, groupOptions);
  }
}

await refreshUI();
chrome.storage.local.onChanged.addListener(refreshUI);

function renderFirefoxTip() {
  const card = document.createElement("section");
  card.className = "tip-card";
  card.id = "firefoxTip";
  card.addEventListener("contextmenu", showFirefoxTipContextMenu);

  const logo = document.createElement("img");
  logo.className = "tip-card-logo";
  logo.src =
    "../icons/firefox.png";

  const body = document.createElement("div");
  body.className = "tip-card-body";

  const title = document.createElement("p");
  title.className = "tip-card-title";
  title.textContent = "Tip: Clipboard2File works better in Firefox";

  const actions = document.createElement("div");
  actions.className = "tip-card-actions";

  const firefoxButton = document.createElement("a");
  firefoxButton.className = "setting-save-btn tip-card-link";
  firefoxButton.href = "https://www.getfirefox.com/";
  firefoxButton.target = "_blank";
  firefoxButton.rel = "noreferrer";
  firefoxButton.textContent = "Get Firefox";

  actions.appendChild(firefoxButton);
  body.append(title, actions);
  card.append(logo, body);
  main.appendChild(card);
}

async function hideFirefoxTip() {
  await chrome.storage.local.set({ hideFirefoxTip: true });
  document.getElementById("firefoxTip")?.remove();
  firefoxTipContextMenu.hidePopover();
}

function showFirefoxTipContextMenu(event) {
  event.preventDefault();
  event.stopPropagation();

  firefoxTipContextMenu.style.left =
    `${event.clientX - FIREFOX_TIP_CONTEXT_MENU_CURSOR_INSET_X}px`;
  firefoxTipContextMenu.style.top =
    `${event.clientY - FIREFOX_TIP_CONTEXT_MENU_CURSOR_INSET_Y}px`;
  firefoxTipContextMenu.showPopover();
}

function createFirefoxTipContextMenu() {
  const menu = document.createElement("div");
  menu.className = "context-menu";
  menu.popover = "auto";

  const hideButton = document.createElement("button");
  hideButton.type = "button";
  hideButton.className = "context-menu-action";
  hideButton.textContent = "Hide tip";
  hideButton.addEventListener("click", hideFirefoxTip);

  menu.appendChild(hideButton);
  document.body.appendChild(menu);
  return menu;
}

function renderSettingsGroup(groupDef, items) {
  const groupEl = document.createElement("div");
  groupEl.className = "settings-group";

  if (groupDef) {
    const hasToggle = !!groupDef.toggleKey;
    const header = document.createElement(hasToggle ? "label" : "div");
    header.className = "settings-group-header";

    const title = document.createElement(hasToggle ? "span" : "h3");
    title.className = "settings-group-title";
    title.textContent = chrome.i18n.getMessage(groupDef.l10nLabel);
    header.appendChild(title);

    if (hasToggle) {
      const toggle = document.createElement("input");
      toggle.type = "checkbox";
      toggle.id = groupDef.toggleKey;
      toggle.className = "setting-section-toggle";
      toggle.checked = settings[groupDef.toggleKey];

      toggle.addEventListener("change", async e => {
        await chrome.storage.local.set({
          [groupDef.toggleKey]: e.target.checked,
        });
      });
      header.appendChild(toggle);
    }
    groupEl.appendChild(header);
  }

  const content = document.createElement("div");
  content.className = "settings-group-content";

  if (groupDef && groupDef.toggleKey) {
    content.toggleAttribute("inert", !settings[groupDef.toggleKey]);
  }

  for (const item of items) {
    const row = document.createElement("div");
    row.className = "setting-entry";
    row.id = `row-${item.key}`;

    createWidget(row, item, settings);

    if (item.condition) {
      const parentValue = settings[item.condition.key];
      row.toggleAttribute("hidden", parentValue !== item.condition.value);
    }
    content.appendChild(row);
  }

  groupEl.appendChild(content);
  main.appendChild(groupEl);
}

function createWidget(container, item, settings) {
  switch (item.type) {
    case "checkbox":
      createCheckbox(container, item, settings);
      break;
    case "select":
      createSelect(container, item, settings);
      break;
    case "range":
      createRange(container, item, settings);
      break;
    case "customInputWithButton":
      createCustomInput(container, item, settings);
      break;
  }
}

function createCheckbox(container, item, settings) {
  const label = document.createElement("label");
  label.className = "setting-label";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.id = item.key;
  input.className = "setting-checkbox";
  input.checked = settings[item.key];

  input.addEventListener("change", async e => {
    await chrome.storage.local.set({ [item.key]: e.target.checked });
  });

  const span = document.createElement("span");
  span.textContent = chrome.i18n.getMessage(item.l10nLabel) || item.key;

  label.append(input, span);
  container.append(label);
}

function createSelect(container, item, settings) {
  container.classList.add("inline-layout");

  const label = document.createElement("label");
  label.className = "setting-label";
  label.textContent = chrome.i18n.getMessage(item.l10nLabel) || item.key;
  label.htmlFor = item.key;

  const select = document.createElement("select");
  select.id = item.key;

  item.options.forEach(opt => {
    const option = document.createElement("option");
    option.value = opt.value;
    option.textContent = opt.l10nId
      ? chrome.i18n.getMessage(opt.l10nId)
      : opt.text;
    select.appendChild(option);
  });

  select.value = settings[item.key];
  select.addEventListener("change", async e => {
    const newValue = e.target.value;
    if (item.linkedInput && newValue === "custom") {
      const row = document.getElementById(`row-${item.linkedInput}`);
      if (row) {
        row.toggleAttribute("hidden", false);
        const inputEl = document.getElementById(item.linkedInput);
        if (inputEl) inputEl.focus();
      }

      const inputOption = options.find(o => o.key === item.linkedInput);
      const savedText = inputOption ? await getSetting(inputOption.key) : "";

      if (savedText && savedText.trim().length > 0) {
        await chrome.storage.local.set({ [item.key]: newValue });
      }
    } else {
      await chrome.storage.local.set({ [item.key]: newValue });
    }
  });

  container.append(label, select);
}

function createRange(container, item, settings) {
  const header = document.createElement("div");
  header.className = "setting-range-header";

  const label = document.createElement("label");
  label.className = "setting-label";
  label.textContent = chrome.i18n.getMessage(item.l10nLabel) || item.key;
  label.htmlFor = item.key;

  const valueDisplay = document.createElement("span");
  valueDisplay.className = "setting-range-value";
  valueDisplay.id = `range-val-${item.key}`;

  header.append(label, valueDisplay);

  const controls = document.createElement("div");
  controls.className = "setting-range-controls";

  const input = document.createElement("input");
  input.type = "range";
  input.id = item.key;
  input.min = item.min;
  input.max = item.max;
  input.step = item.step;
  input.value = settings[item.key];
  valueDisplay.textContent = settings[item.key] + (item.unit || "");

  const datalistId = `ticks-${item.key}`;
  const datalist = document.createElement("datalist");
  datalist.id = datalistId;
  const range = item.max - item.min;
  const tickStep = range > 0 ? range / 5 : 10;
  for (let i = item.min; i <= item.max; i += tickStep) {
    const option = document.createElement("option");
    option.value = i;
    datalist.appendChild(option);
  }
  input.setAttribute("list", datalistId);

  input.addEventListener("input", async e => {
    const val = parseInt(e.target.value, 10);
    valueDisplay.textContent = val + (item.unit || "");
    await chrome.storage.local.set({ [item.key]: val });
  });

  controls.append(input, datalist);
  container.append(header, controls);
}

function createCustomInput(container, item, settings) {
  const label = document.createElement("label");
  label.className = "setting-label";
  label.textContent = chrome.i18n.getMessage(item.l10nLabel) || item.key;
  label.htmlFor = item.key;

  const inputGroup = document.createElement("div");
  inputGroup.className = "setting-composite-input";

  const inputWrapper = document.createElement("div");
  inputWrapper.className = "setting-text-input-wrap";

  const input = document.createElement("input");
  input.type = "text";
  input.id = item.key;
  input.placeholder = item.placeholderL10n
    ? chrome.i18n.getMessage(item.placeholderL10n)
    : settings[item.key] || item.default;
  input.autocomplete = "off";
  input.spellcheck = false;
  input.value = settings[item.key] || "";
  input.dataset.savedValue = settings[item.key] || "";

  const hint = document.createElement("span");
  hint.id = `ext-${item.key}`;
  hint.className = "file-extension";

  const button = document.createElement("button");
  button.textContent = chrome.i18n.getMessage(item.buttonL10n);
  button.className = "setting-save-btn";
  button.id = `btn-${item.key}`;

  button.toggleAttribute("disabled", true);

  const saveInput = async () => {
    let val = input.value.trim();
    if (item.key === "customFilenameImage")
      val = val.replace(/\.(png|jpg|jpeg)$/i, "");
    else if (item.key === "textExtension") val = val.replace(/^\./, "");

    val = val.trim();

    const parentOption = options.find(o => o.linkedInput === item.key);

    if (val === "" && !parentOption && item.default) {
      val = item.default;
    }

    if (input.value !== val) input.value = val;

    await chrome.storage.local.set({ [item.key]: val });

    if (parentOption) {
      if (val.length > 0) {
        await chrome.storage.local.set({ [parentOption.key]: "custom" });
      } else {
        await chrome.storage.local.set({
          [parentOption.key]: parentOption.default,
        });
      }
    }

    button.toggleAttribute("disabled", true);
    input.blur();
  };

  input.addEventListener("input", e => {
    const currentSaved = input.dataset.savedValue || "";
    button.toggleAttribute("disabled", e.target.value.trim() === currentSaved);
  });

  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveInput();
    }
  });
  button.addEventListener("click", saveInput);

  inputWrapper.append(input, hint);
  inputGroup.append(inputWrapper, button);
  container.append(label, inputGroup);
}

async function refreshUI() {
  const settings = await getAllSettings();

  for (const groupDef of groups) {
    if (groupDef.toggleKey) {
      const el = document.getElementById(groupDef.toggleKey);
      if (el) {
        if (el.checked !== settings[groupDef.toggleKey]) {
          el.checked = settings[groupDef.toggleKey];
        }

        const content = el
          .closest(".settings-group")
          .querySelector(".settings-group-content");
        if (content) {
          content.toggleAttribute("inert", !el.checked);
        }
      }
    }
  }

  for (const item of options) {
    if (item.hidden) continue;
    updateWidgetValue(item, settings);
  }

  for (const item of options) {
    if (item.hidden) continue;
    const row = document.getElementById(`row-${item.key}`);
    if (row && item.condition) {
      const parentValue = settings[item.condition.key];
      row.toggleAttribute("hidden", parentValue !== item.condition.value);
    }
  }

  const extSpanImage = document.getElementById("ext-customFilenameImage");
  if (extSpanImage) {
    extSpanImage.textContent =
      settings["defaultFileType"] === "jpeg" ? ".jpg" : ".png";
  }
  const extSpanText = document.getElementById("ext-customFilenameText");
  if (extSpanText) {
    const ext = settings["textExtension"] || "txt";
    extSpanText.textContent = `.${ext}`;
  }
}

function updateWidgetValue(item, settings) {
  const el = document.getElementById(item.key);
  if (!el) return;
  const value = settings[item.key];

  switch (item.type) {
    case "checkbox":
      if (el.checked !== value) el.checked = value;
      break;
    case "select":
      if (el.value !== value) el.value = value;
      break;
    case "range":
      if (document.activeElement !== el) el.value = value;
      const rangeLabel = document.getElementById(`range-val-${item.key}`);
      if (rangeLabel) rangeLabel.textContent = value + (item.unit || "");
      break;
    case "customInputWithButton":
      if (!item.placeholderL10n) el.placeholder = value || item.default;
      if (document.activeElement !== el) el.value = value || "";
      el.dataset.savedValue = value || "";

      const btn = document.getElementById(`btn-${item.key}`);
      if (btn) {
        const currentText = String(el.value).trim();
        const savedText = String(value || "").trim();
        btn.toggleAttribute("disabled", currentText === savedText);
      }
      break;
  }
}
