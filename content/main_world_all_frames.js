{
  const NONCE = document.documentElement.dataset.c2fNonce;

  delete document.documentElement.dataset.c2fNonce;

  const preventedByPage = new WeakSet();
  const preventedByExtension = new WeakSet();
  const inputElements = new Map();

  const SESSION_EVENT = `${NONCE}:session`;
  const COMMAND_EVENT = `${NONCE}:command`;

  const MouseEventCtor = MouseEvent;
  const CustomEventCtor = CustomEvent;
  const EventCtor = Event;
  const EventTargetCtor = EventTarget;
  const HTMLElementCtor = HTMLElement;
  const PointerEventCtor = PointerEvent;
  const TypeErrorCtor = TypeError;
  const ShadowRootCtor = ShadowRoot;
  const HTMLInputElementCtor = HTMLInputElement;
  const BlobCtor = Blob;
  const Uint8ArrayCtor = Uint8Array;
  const FileCtor = File;
  const DataTransferCtor = DataTransfer;

  const documentRef = document;
  const navigatorRef = navigator;
  const cryptoRef = crypto;
  const nativeSetTimeout = setTimeout;
  const apply = Reflect.apply;

  const isConnectedDesc = Object.getOwnPropertyDescriptor(
    Node.prototype,
    "isConnected"
  );
  const eventTargetAccessor = Object.getOwnPropertyDescriptor(
    Event.prototype,
    "target"
  );
  const eventTypeAccessor = Object.getOwnPropertyDescriptor(
    Event.prototype,
    "type"
  );
  const eventCancelableAccessor = Object.getOwnPropertyDescriptor(
    Event.prototype,
    "cancelable"
  );
  const eventComposedAccessor = Object.getOwnPropertyDescriptor(
    Event.prototype,
    "composed"
  );
  const disabledAccessor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "disabled"
  );
  const filesAccessor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "files"
  );
  const dataTransferItemsAccessor = Object.getOwnPropertyDescriptor(
    DataTransfer.prototype,
    "items"
  );
  const dataTransferFilesAccessor = Object.getOwnPropertyDescriptor(
    DataTransfer.prototype,
    "files"
  );
  const navUserActivationAccessor = Object.getOwnPropertyDescriptor(
    Navigator.prototype,
    "userActivation"
  );
  const uaIsActiveAccessor = Object.getOwnPropertyDescriptor(
    UserActivation.prototype,
    "isActive"
  );

  const nativePreventDefault = Event.prototype.preventDefault;
  const defaultPreventedDesc = Object.getOwnPropertyDescriptor(
    Event.prototype,
    "defaultPrevented"
  );
  const returnValueDesc = Object.getOwnPropertyDescriptor(
    Event.prototype,
    "returnValue"
  );
  const nativeDispatchEvent = EventTarget.prototype.dispatchEvent;
  const nativeClick = HTMLElement.prototype.click;
  const nativeShowPicker = HTMLInputElement.prototype.showPicker;
  const nativeFunctionToString = Function.prototype.toString;
  const nativeMatches = Element.prototype.matches;
  const nativeGetRootNode = Node.prototype.getRootNode;
  const nativeComposedPath = Event.prototype.composedPath;
  const nativeDataTransferItemListAdd = DataTransferItemList.prototype.add;
  const nativeWeakSetAdd = WeakSet.prototype.add;
  const nativeWeakSetHas = WeakSet.prototype.has;
  const nativeMapGet = Map.prototype.get;
  const nativeMapSet = Map.prototype.set;
  const nativeMapDelete = Map.prototype.delete;
  const nativeRandomUUID = Crypto.prototype.randomUUID;

  function matches(element, selector) {
    return apply(nativeMatches, element, [selector]);
  }

  function getRootNode(node) {
    return apply(nativeGetRootNode, node, []);
  }

  function composedPath(event) {
    return apply(nativeComposedPath, event, []);
  }

  function addToWeakSet(set, value) {
    return apply(nativeWeakSetAdd, set, [value]);
  }

  function weakSetHas(set, value) {
    return apply(nativeWeakSetHas, set, [value]);
  }

  function mapGet(map, key) {
    return apply(nativeMapGet, map, [key]);
  }

  function mapSet(map, key, value) {
    return apply(nativeMapSet, map, [key, value]);
  }

  function mapDelete(map, key) {
    return apply(nativeMapDelete, map, [key]);
  }

  function randomUUID(cryptoObject) {
    return apply(nativeRandomUUID, cryptoObject, []);
  }

  function functionToString(fn) {
    return apply(nativeFunctionToString, fn, []);
  }

  function getAccessorValue(descriptor, thisArg) {
    return apply(descriptor.get, thisArg, []);
  }

  function setAccessorValue(descriptor, thisArg, value) {
    return apply(descriptor.set, thisArg, [value]);
  }

  function getEventTarget(e) {
    return getAccessorValue(eventTargetAccessor, e);
  }

  function getEventType(e) {
    return getAccessorValue(eventTypeAccessor, e);
  }

  function isCancelable(e) {
    return getAccessorValue(eventCancelableAccessor, e);
  }

  function isComposed(e) {
    return getAccessorValue(eventComposedAccessor, e);
  }

  function isConnected(node) {
    return getAccessorValue(isConnectedDesc, node);
  }

  function isDisabled(el) {
    return getAccessorValue(disabledAccessor, el);
  }

  function setFiles(el, files) {
    return setAccessorValue(filesAccessor, el, files);
  }

  function getDataTransferItems(dataTransfer) {
    return getAccessorValue(dataTransferItemsAccessor, dataTransfer);
  }

  function getDataTransferFiles(dataTransfer) {
    return getAccessorValue(dataTransferFilesAccessor, dataTransfer);
  }

  function addDataTransferItem(itemList, item) {
    return apply(nativeDataTransferItemListAdd, itemList, [item]);
  }

  function isUserActive() {
    const ua = getAccessorValue(navUserActivationAccessor, navigatorRef);
    return getAccessorValue(uaIsActiveAccessor, ua);
  }

  function isFileInput(el) {
    return matches(el, "[type=file]:not([webkitdirectory])");
  }

  function safeInstanceOf(value, ctor) {
    try {
      return value instanceof ctor;
    } catch {
      return false;
    }
  }

  function tryOrNull(check) {
    try {
      return check();
    } catch {
      return null;
    }
  }

  function safeUserActive() {
    return tryOrNull(() => isUserActive()) === true;
  }

  function safeCancelable(event) {
    return tryOrNull(() => isCancelable(event)) === true;
  }

  function safeDetachedOrNonComposedFileInput(input, event) {
    return (
      tryOrNull(() => !isConnected(input)) === true ||
      tryOrNull(
        () => !isComposed(event) && getRootNode(input) instanceof ShadowRootCtor
      ) === true
    );
  }

  function isInterceptableFileInput(el) {
    return (
      safeInstanceOf(el, HTMLInputElementCtor) &&
      tryOrNull(() => !isDisabled(el) && isFileInput(el)) === true
    );
  }

  function isInterceptableClickEvent(event) {
    return (
      safeInstanceOf(event, MouseEventCtor) &&
      tryOrNull(() => getEventType(event) === "click") === true
    );
  }

  function getInterceptedFileInput(event) {
    if (!isInterceptableClickEvent(event)) {
      return null;
    }

    return tryOrNull(() => {
      const path = composedPath(event);
      const eventTarget = getEventTarget(event);

      return (
        getFileInputFromPath(path) ??
        (safeInstanceOf(eventTarget, HTMLInputElementCtor) &&
        isFileInput(eventTarget)
          ? eventTarget
          : null)
      );
    });
  }

  function sanitizeAndRethrow(error, stackStartFn) {
    Error.captureStackTrace(error, stackStartFn);
    throw error;
  }

  function getFileInputFromPath(path) {
    for (const node of path) {
      if (safeInstanceOf(node, HTMLInputElementCtor) && isFileInput(node)) {
        return node;
      }
    }

    return null;
  }

  function preventDefaultNative(event) {
    return apply(nativePreventDefault, event, []);
  }

  function dispatchNativeEvent(target, event) {
    return apply(nativeDispatchEvent, target, [event]);
  }

  function clickNative(element) {
    return apply(nativeClick, element, []);
  }

  function showPickerNative(input) {
    return apply(nativeShowPicker, input, []);
  }


  function createElementId() {
    return randomUUID(cryptoRef);
  }

  function cleanupInputElement(elementId) {
    mapDelete(inputElements, elementId);
  }

  function startInputSession(input) {
    const elementId = createElementId();
    mapSet(inputElements, elementId, input);

    dispatchNativeEvent(
      documentRef,
      new CustomEventCtor(SESSION_EVENT, {
        detail: {
          elementId,
        },
      })
    );
  }

  function applyFilesToInput(input, blobData, blobMimeType, fileName) {
    const blob = new BlobCtor([new Uint8ArrayCtor(blobData)], {
      type: blobMimeType,
    });
    const file = new FileCtor([blob], fileName, {
      type: blobMimeType,
    });
    const dt = new DataTransferCtor();
    addDataTransferItem(getDataTransferItems(dt), file);
    setFiles(input, getDataTransferFiles(dt));

    nativeSetTimeout(() => {
      dispatchNativeEvent(
        input,
        new EventCtor("input", { bubbles: true, composed: true })
      );
      dispatchNativeEvent(
        input,
        new EventCtor("change", { bubbles: true, composed: false })
      );
    }, 0);
  }

  function dispatchCancelEvent(input) {
    nativeSetTimeout(() => {
      dispatchNativeEvent(
        input,
        new EventCtor("cancel", { bubbles: true, composed: false })
      );
    }, 0);
  }

  documentRef.addEventListener(COMMAND_EVENT, event => {
    const { elementId, type, blobData, blobMimeType, fileName } =
      event.detail ?? {};

    if (typeof elementId !== "string") {
      return;
    }

    const input = mapGet(inputElements, elementId);
    if (!input) {
      return;
    }

    switch (type) {
      case "showPicker":
        cleanupInputElement(elementId);
        showPickerNative(input);
        break;
      case "files":
        if (Array.isArray(blobData) && typeof fileName === "string") {
          cleanupInputElement(elementId);
          applyFilesToInput(input, blobData, blobMimeType, fileName);
        }
        break;
      case "cancel":
        cleanupInputElement(elementId);
        dispatchCancelEvent(input);
        break;
      case "dispose":
        cleanupInputElement(elementId);
        break;
    }
  });

  window.addEventListener(
    "click",
    event => {
      const target = getInterceptedFileInput(event);

      if (target && safeUserActive() && !weakSetHas(preventedByPage, event)) {
        startInputSession(target);
        addToWeakSet(preventedByExtension, event);
        preventDefaultNative(event);
      }
    },
    { capture: true }
  );

  const overrides = {
    preventDefault() {
      try {
        preventDefaultNative(this);
        addToWeakSet(preventedByPage, this);
      } catch (error) {
        sanitizeAndRethrow(error, overrides.preventDefault);
      }
    },

    get defaultPrevented() {
      try {
        const val = getAccessorValue(defaultPreventedDesc, this);

        if (isCancelable(this)) {
          if (weakSetHas(preventedByPage, this)) {
            return true;
          }
          if (weakSetHas(preventedByExtension, this)) {
            return false;
          }
        }

        return val;
      } catch (error) {
        sanitizeAndRethrow(error, defaultPreventedOverrideDesc.get);
      }
    },

    get returnValue() {
      try {
        const val = getAccessorValue(returnValueDesc, this);

        if (isCancelable(this)) {
          if (weakSetHas(preventedByPage, this)) {
            return false;
          }
          if (weakSetHas(preventedByExtension, this)) {
            return true;
          }
        }

        return val;
      } catch (error) {
        sanitizeAndRethrow(error, returnValueOverrideDesc.get);
      }
    },

    set returnValue(value) {
      try {
        const result = setAccessorValue(returnValueDesc, this, value);

        if (!value) {
          addToWeakSet(preventedByPage, this);
        }

        return result;
      } catch (error) {
        sanitizeAndRethrow(error, returnValueOverrideDesc.set);
      }
    },

    dispatchEvent(event) {
      try {
        if (
          isInterceptableClickEvent(event) &&
          isInterceptableFileInput(this) &&
          safeUserActive()
        ) {
          if (!safeCancelable(event)) {
            startInputSession(this);
            return true;
          }

          if (safeDetachedOrNonComposedFileInput(this, event)) {
            startInputSession(this);
            addToWeakSet(preventedByExtension, event);
            preventDefaultNative(event);
          }

          const dispatched = dispatchNativeEvent(this, event);

          if (
            weakSetHas(preventedByExtension, event) &&
            !weakSetHas(preventedByPage, event)
          ) {
            return true;
          }

          return dispatched;
        }

        return dispatchNativeEvent(this, event);
      } catch (error) {
        sanitizeAndRethrow(error, overrides.dispatchEvent);
      }
    },

    click() {
      try {
        if (
          isInterceptableFileInput(this) &&
          tryOrNull(() => !isConnected(this) && isUserActive()) === true
        ) {
          const event = new PointerEventCtor("click", {
            bubbles: true,
            composed: true,
            cancelable: true,
          });

          startInputSession(this);

          addToWeakSet(preventedByExtension, event);
          preventDefaultNative(event);
          dispatchNativeEvent(this, event);
          return;
        }

        return clickNative(this);
      } catch (error) {
        sanitizeAndRethrow(error, overrides.click);
      }
    },

    showPicker() {
      try {
        if (isInterceptableFileInput(this) && safeUserActive()) {
          startInputSession(this);
          return;
        }

        return showPickerNative(this);
      } catch (error) {
        sanitizeAndRethrow(error, overrides.showPicker);
      }
    },

    toString() {
      try {
        if (this === overrides.preventDefault) {
          return functionToString(nativePreventDefault);
        }
        if (this === defaultPreventedOverrideDesc.get) {
          return functionToString(defaultPreventedDesc.get);
        }
        if (this === returnValueOverrideDesc.get) {
          return functionToString(returnValueDesc.get);
        }
        if (this === returnValueOverrideDesc.set) {
          return functionToString(returnValueDesc.set);
        }
        if (this === overrides.dispatchEvent) {
          return functionToString(nativeDispatchEvent);
        }
        if (this === overrides.click) {
          return functionToString(nativeClick);
        }
        if (this === overrides.showPicker) {
          return functionToString(nativeShowPicker);
        }
        if (this === overrides.toString) {
          return functionToString(nativeFunctionToString);
        }

        return functionToString(this);
      } catch (error) {
        sanitizeAndRethrow(error, overrides.toString);
      }
    },
  };

  const defaultPreventedOverrideDesc = Object.getOwnPropertyDescriptor(
    overrides,
    "defaultPrevented"
  );
  const returnValueOverrideDesc = Object.getOwnPropertyDescriptor(
    overrides,
    "returnValue"
  );

  Object.defineProperty(Event.prototype, "preventDefault", {
    value: overrides.preventDefault,
    writable: true,
    enumerable: false,
    configurable: true,
  });

  Object.defineProperty(Event.prototype, "defaultPrevented", {
    get: defaultPreventedOverrideDesc.get,
    enumerable: false,
    configurable: true,
  });

  Object.defineProperty(Event.prototype, "returnValue", {
    get: returnValueOverrideDesc.get,
    set: returnValueOverrideDesc.set,
    enumerable: false,
    configurable: true,
  });

  Object.defineProperty(EventTarget.prototype, "dispatchEvent", {
    value: overrides.dispatchEvent,
    writable: true,
    enumerable: false,
    configurable: true,
  });

  Object.defineProperty(HTMLElement.prototype, "click", {
    value: overrides.click,
    writable: true,
    enumerable: false,
    configurable: true,
  });

  Object.defineProperty(HTMLInputElement.prototype, "showPicker", {
    value: overrides.showPicker,
    writable: true,
    enumerable: false,
    configurable: true,
  });

  Object.defineProperty(Function.prototype, "toString", {
    value: overrides.toString,
    writable: true,
    enumerable: false,
    configurable: true,
  });
}
