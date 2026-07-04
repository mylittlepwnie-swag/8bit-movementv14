import {
  MODULE_NAME,
  imageLoader,
  initializeMovement,
  switchOutfit,
  addOutfit,
  removeOutfit,
  renameOutfit,
} from "./functions.js";

const CARDINAL_DIRECTIONS = [
  { key: "up", action: "up-image", labelKey: "8BITMOVEMENT.up" },
  { key: "down", action: "down-image", labelKey: "8BITMOVEMENT.down" },
  { key: "left", action: "left-image", labelKey: "8BITMOVEMENT.left" },
  { key: "right", action: "right-image", labelKey: "8BITMOVEMENT.right" },
];

const DIAGONAL_DIRECTIONS = [
  { key: "UL", action: "up-left-image", labelKey: "8BITMOVEMENT.up-left" },
  { key: "UR", action: "up-right-image", labelKey: "8BITMOVEMENT.up-right" },
  { key: "DL", action: "down-left-image", labelKey: "8BITMOVEMENT.down-left" },
  { key: "DR", action: "down-right-image", labelKey: "8BITMOVEMENT.down-right" },
];

function localize(key) {
  return game.i18n.format(key);
}

function getHtmlElement(application, fallbackElement) {
  const element = fallbackElement ?? application?.element;
  if (!element) return null;
  if (element instanceof HTMLElement) return element;
  if (globalThis.jQuery && element instanceof globalThis.jQuery) {
    return element[0] ?? null;
  }
  return element?.[0] ?? null;
}

function hasMovementFlags(tokenDocument) {
  return Object.hasOwn(tokenDocument.flags ?? {}, MODULE_NAME);
}

function getDirectionalImages(tokenDocument, fallbackImage) {
  const images = {};
  for (const direction of [...CARDINAL_DIRECTIONS, ...DIAGONAL_DIRECTIONS]) {
    images[direction.key] =
      tokenDocument.getFlag(MODULE_NAME, direction.key) || fallbackImage;
  }
  return images;
}

function setSheetPosition(sheet) {
  if (typeof sheet.setPosition === "function") sheet.setPosition();
}

async function clearPrototypeSettings(tokenDocument, image) {
  await game.actors.get(tokenDocument.actor.id).update({
    "prototypeToken.flags.-=8bit-movement-frankhz": null,
    "prototypeToken.texture.src": image,
    "prototypeToken.lockRotation": false,
  });

  await tokenDocument.update({
    "flags.-=8bit-movement-frankhz": null,
    "texture.src": image,
    lockRotation: false,
    rotation: 0,
  });
}

async function savePrototypeSettings(tokenDocument, images) {
  await game.actors.get(tokenDocument.actor.id).update({
    "prototypeToken.flags.8bit-movement-frankhz": {
      up: images.up,
      down: images.down,
      left: images.left,
      right: images.right,
      set: true,
    },
    "prototypeToken.texture.src": images.down,
    "prototypeToken.lockRotation": true,
  });

  await tokenDocument.setFlag(MODULE_NAME, "set", true);
}

export async function createConfigButtons(sheet, element) {
  if (!game.settings.get(MODULE_NAME, "settingsMode")) return;
  if (game.settings.get(MODULE_NAME, "gmMode") && !game.user.isGM) return;

  const root = getHtmlElement(sheet, element);
  const token = sheet.document ?? sheet.object;
  // The prototype token setup edits a PrototypeToken data model, not a placed
  // TokenDocument; accept both so the appearance-tab controls work in either.
  const isPrototype =
    foundry.data?.PrototypeToken && token instanceof foundry.data.PrototypeToken;
  if (!root || !token || (!isPrototype && token.documentName !== "Token")) return;

  const appearanceTab =
    root.querySelector('.tab[data-tab="appearance"]') ??
    root.querySelector('[data-tab="appearance"]');
  if (!appearanceTab || appearanceTab.querySelector(".movement-fieldset")) {
    return;
  }

  const fallbackImage = token.texture?.src ?? token.actor?.img ?? "";
  const images = getDirectionalImages(token, fallbackImage);

  const fieldset = document.createElement("fieldset");
  fieldset.className = "movement-fieldset";

  const legend = document.createElement("legend");
  legend.className = "movement-legend";
  legend.textContent = "8bit Movement";
  fieldset.append(legend);
  appearanceTab.append(fieldset);

  const createFormGroup = (labelText, inputId) => {
    const group = document.createElement("div");
    group.className = "form-group movement-form-group";

    const label = document.createElement("label");
    label.textContent = labelText;
    if (inputId) label.htmlFor = inputId;

    const fields = document.createElement("div");
    fields.className = "form-fields";

    group.append(label, fields);
    fieldset.append(group);
    return fields;
  };

  const createActionButton = (
    className,
    title,
    iconClass,
    text,
    onClick,
    type = "button",
    buttonClass = "movement-settings movement-action-button",
  ) => {
    const button = document.createElement("button");
    button.type = type;
    button.className = `${buttonClass} ${className}`.trim();
    button.title = title;
    button.setAttribute("aria-label", title);
    const icon = document.createElement("i");
    icon.className = iconClass;
    icon.setAttribute("inert", "");
    const label = document.createElement("span");
    label.textContent = text;
    button.append(icon, label);
    button.addEventListener("click", onClick);
    return button;
  };

  const createCheckboxGroup = (labelText, inputId, checked, onChange) => {
    const fields = createFormGroup(labelText, inputId);
    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = inputId;
    input.checked = checked;
    input.addEventListener("change", onChange);
    fields.append(input);
    return input;
  };

  const createImagePickerField = (id, title, src, direction, outfitName = null) => {
    const wrapper = document.createElement("div");
    wrapper.className = "movement-image-field";
    const inputId = `${id}-path`;

    const picker = document.createElement("file-picker");
    picker.setAttribute("type", "imagevideo");
    picker.setAttribute("name", `${MODULE_NAME}.${direction}`);
    picker.setAttribute("value", src);
    picker.id = `${id}-picker`;

    const input = document.createElement("input");
    input.className = "image";
    input.type = "text";
    input.id = inputId;
    input.placeholder = "path/to/file.ext";
    input.value = src;
    input.readOnly = true;

    const browseButton = document.createElement("button");
    browseButton.className = "fa-solid fa-file-import fa-fw icon";
    browseButton.type = "button";
    browseButton.dataset.tooltip = "FILES.BrowseTooltip";
    browseButton.setAttribute(
      "aria-label",
      game.i18n.localize("FILES.BrowseTooltip"),
    );
    browseButton.tabIndex = -1;
    browseButton.addEventListener("click", async () => {
      await imageLoader(token, sheet, direction, outfitName);
    });

    picker.append(input, browseButton);

    const previewButton = document.createElement("button");
    previewButton.type = "button";
    previewButton.id = id;
    previewButton.className = "movement-settings movement-preview-button";
    previewButton.title = title;
    previewButton.setAttribute("aria-label", title);
    const previewImage = document.createElement("img");
    previewImage.src = src;
    previewImage.alt = title;
    previewButton.append(previewImage);
    previewButton.addEventListener("click", async () => {
      await imageLoader(token, sheet, direction, outfitName);
    });

    wrapper.append(picker, previewButton);
    return wrapper;
  };

  const uniquePrefix = sheet.options?.uniqueId ?? token.uuid ?? token.id;

  const addImagePickerGroup = (direction) => {
    createFormGroup(
      localize(direction.labelKey),
      `${uniquePrefix}-${direction.action}-path`,
    ).append(
      createImagePickerField(
        `${uniquePrefix}-${direction.action}`,
        localize(direction.labelKey),
        images[direction.key],
        direction.key,
      ),
    );
  };

  if (!hasMovementFlags(token)) {
    createFormGroup(localize("8BITMOVEMENT.activate_label")).append(
      createActionButton(
        "activate",
        localize("8BITMOVEMENT.activate"),
        "far fa-plus-square",
        "Activate",
        async () => {
          await initializeMovement(token);
          sheet.render();
        },
      ),
    );

    setSheetPosition(sheet);
    return;
  }

  createCheckboxGroup(
    localize("8BITMOVEMENT.lock"),
    `${uniquePrefix}-locked`,
    !!token.getFlag(MODULE_NAME, "locked"),
    async (event) => {
      await token.setFlag(MODULE_NAME, "locked", event.currentTarget.checked);
      sheet.render();
    },
  );

  if (token.getFlag(MODULE_NAME, "locked")) {
    setSheetPosition(sheet);
    return;
  }

  // Outfit management UI
  const outfits = token.getFlag(MODULE_NAME, "outfits") ?? {};
  const currentOutfit = token.getFlag(MODULE_NAME, "currentOutfit");
  const outfitList = Object.keys(outfits);

  if (outfitList.length > 0) {
    // Outfit selector
    const outfitSelectGroup = createFormGroup("Active Outfit");
    const outfitSelectContainer = document.createElement("div");
    outfitSelectContainer.style.cssText = "display: flex; gap: 8px;";

    const outfitSelect = document.createElement("select");
    outfitSelect.style.cssText = "flex: 1;";
    for (const outfit of outfitList) {
      const option = document.createElement("option");
      option.value = outfit;
      option.textContent = outfit;
      option.selected = outfit === currentOutfit;
      outfitSelect.append(option);
    }
    outfitSelect.addEventListener("change", async (e) => {
      await switchOutfit(token, e.target.value);
      sheet.render();
    });
    outfitSelectContainer.append(outfitSelect);

    // Add outfit button
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "button";
    addButton.textContent = "+";
    addButton.style.cssText = "width: 32px;";
    addButton.addEventListener("click", async () => {
      let newName = "Outfit";
      let counter = 1;
      while (outfits[`${newName} ${counter}`]) counter++;
      newName = `${newName} ${counter}`;

      const name = await Dialog.confirm({
        title: "New Outfit",
        content: `<input type="text" id="outfit-name-input" value="${newName}" style="width: 100%; margin: 8px 0;">`,
        yes: async () => {
          const input = document.getElementById("outfit-name-input");
          const finalName = input?.value.trim() || newName;
          await addOutfit(token, finalName);
          sheet.render();
        },
      });
    });
    outfitSelectContainer.append(addButton);
    outfitSelectGroup.append(outfitSelectContainer);

    // Show images for current outfit
    if (currentOutfit && outfits[currentOutfit]) {
      const outfitImages = outfits[currentOutfit];
      for (const direction of CARDINAL_DIRECTIONS) {
        const src = outfitImages[direction.key] || "";
        createFormGroup(
          localize(direction.labelKey),
          `${uniquePrefix}-${direction.action}-path`,
        ).append(
          createImagePickerField(
            `${uniquePrefix}-${direction.action}`,
            localize(direction.labelKey),
            src,
            direction.key,
            currentOutfit,
          ),
        );
      }

      if (game.settings.get(MODULE_NAME, "diagonalMode")) {
        for (const direction of DIAGONAL_DIRECTIONS) {
          const src = outfitImages[direction.key] || "";
          createFormGroup(
            localize(direction.labelKey),
            `${uniquePrefix}-${direction.action}-path`,
          ).append(
            createImagePickerField(
              `${uniquePrefix}-${direction.action}`,
              localize(direction.labelKey),
              src,
              direction.key,
              currentOutfit,
            ),
          );
        }
      }

      // Outfit actions (rename, delete current outfit if not the only one)
      const outfitActions = document.createElement("div");
      outfitActions.className = "movement-actions";
      outfitActions.style.cssText = "margin-top: 12px; border-top: 1px solid #ccc; padding-top: 12px;";

      if (outfitList.length > 1) {
        const deleteBtn = createActionButton(
          "delete-outfit",
          "Delete this outfit",
          "fa-solid fa-trash",
          "Delete Outfit",
          async () => {
            const confirmed = await Dialog.confirm({
              title: "Delete Outfit",
              content: `Delete outfit "${currentOutfit}"?`,
              yes: async () => {
                await removeOutfit(token, currentOutfit);
                sheet.render();
              },
            });
          },
          "button",
          "button",
        );
        outfitActions.append(deleteBtn);
      }

      const renameBtn = createActionButton(
        "rename-outfit",
        "Rename this outfit",
        "fa-solid fa-pen",
        "Rename",
        async () => {
          const newName = await Dialog.prompt({
            title: "Rename Outfit",
            content: `Enter new name for "${currentOutfit}":`,
            label: "Outfit Name",
            callback: (html) => html.querySelector("input[type='text']")?.value || "",
            rejectClose: true,
          });
          if (newName && newName.trim()) {
            await renameOutfit(token, currentOutfit, newName.trim());
            sheet.render();
          }
        },
        "button",
        "button",
      );
      outfitActions.append(renameBtn);
      fieldset.append(outfitActions);
    }
  } else {
    // Fallback: if no outfits yet, show legacy images
    for (const direction of CARDINAL_DIRECTIONS) addImagePickerGroup(direction);

    if (game.settings.get(MODULE_NAME, "diagonalMode")) {
      for (const direction of DIAGONAL_DIRECTIONS) {
        addImagePickerGroup(direction);
      }
    }
  }

  const actions = document.createElement("div");
  actions.className = "movement-actions";
  fieldset.append(actions);

  actions.append(
    token.getFlag(MODULE_NAME, "set")
      ? createActionButton(
          "remove",
          localize("8BITMOVEMENT.delete"),
          "fa-solid fa-trash",
          localize("8BITMOVEMENT.delete"),
          async () => {
            await clearPrototypeSettings(token, images.down);
            sheet.render();
          },
          "button",
          "button",
        )
      : createActionButton(
          "save",
          localize("8BITMOVEMENT.save"),
          "fa-solid fa-floppy-disk",
          localize("8BITMOVEMENT.save"),
          async (event) => {
            event.preventDefault();
            await savePrototypeSettings(token, images);
            sheet.render();
          },
          "submit",
          "button",
        ),
  );

  setSheetPosition(sheet);
}
