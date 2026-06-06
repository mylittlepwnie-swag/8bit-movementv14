export const MODULE_NAME = "8bit-movement-frankhz";
const __8bitPersistTimers = new Map();

const DIRECTIONS = ["up", "down", "left", "right"];
const DIAGONAL_DIRECTIONS = ["UL", "UR", "DL", "DR"];
const ALL_DIRECTIONS = [...DIRECTIONS, ...DIAGONAL_DIRECTIONS];

/**
 * Get the current outfit name for a token, or null if using legacy single-image mode.
 */
function __8bit_getCurrentOutfit(tokenDoc) {
  return tokenDoc.getFlag(MODULE_NAME, "currentOutfit") ?? null;
}

/**
 * Get all directional images for the active outfit (or legacy if no outfit selected).
 */
function __8bit_getActiveOutfitImages(tokenDoc) {
  const currentOutfit = __8bit_getCurrentOutfit(tokenDoc);
  const outfits = tokenDoc.getFlag(MODULE_NAME, "outfits") ?? {};

  if (currentOutfit && outfits[currentOutfit]) {
    return outfits[currentOutfit];
  }

  // Fallback to legacy top-level images
  const images = {};
  for (const dir of ALL_DIRECTIONS) {
    images[dir] = tokenDoc.getFlag(MODULE_NAME, dir);
  }
  return images;
}

/**
 * Pre-load all textures for the given outfit to avoid blur on first use.
 * Uses Foundry's TextureLoader so images are actually fetched and decoded
 * (PIXI.Texture.from alone does not decode synchronously).
 */
async function __8bit_precacheOutfit(tokenDoc, outfitName) {
  const outfits = tokenDoc.getFlag(MODULE_NAME, "outfits") ?? {};
  const outfit = outfits[outfitName];
  if (!outfit) return;

  const loader =
    foundry.canvas?.TextureLoader?.loader ?? globalThis.TextureLoader?.loader;
  const sources = ALL_DIRECTIONS.map((dir) => outfit[dir]).filter(Boolean);

  await Promise.all(
    sources.map(async (src) => {
      try {
        if (loader?.loadTexture) {
          await loader.loadTexture(src);
        } else if (typeof loadTexture === "function") {
          await loadTexture(src);
        }
      } catch (e) {
        console.warn(`8bit-movement: failed to precache ${src}`, e);
      }
    }),
  );
}

/** Find which direction key in an image set matches a given texture src. */
function __8bit_findDirectionKey(images, src) {
  for (const dir of ALL_DIRECTIONS) {
    if (images[dir] && images[dir] === src) return dir;
  }
  return null;
}

function __8bit_forceOpaque(placeable) {
  try {
    if (!placeable) return;
    placeable.alpha = 1;
    if (placeable.icon) placeable.icon.alpha = 1;
    if (placeable.mesh) placeable.mesh.alpha = 1;
  } catch (e) {
    console.warn("8bit-movement: forceOpaque failed", e);
  }
}

/** Preview a texture on the canvas token without writing to the Token document. */
function __8bit_previewMesh(tokenId, src) {
  try {
    const pl = canvas?.tokens?.get(tokenId);
    if (!pl || !src) return;
    const tex =
      typeof PIXI !== "undefined" && PIXI.Texture
        ? PIXI.Texture.from(src)
        : null;
    if (!tex) return;
    if (pl.mesh) pl.mesh.texture = tex;
    else if (pl.icon) pl.icon.texture = tex;
    __8bit_forceOpaque(pl);
  } catch {
    // Preview failures are non-fatal; the persisted document update still runs.
  }
}

/**
 * Initialize directional image flags from the token's current texture.
 * If the filename contains a direction tag, sibling texture paths are inferred.
 * @param {string} tokenId Token ID to configure.
 */
export async function initializeMovement(tokenId) {
  const diagonalMode = game.settings.get(MODULE_NAME, "diagonalMode");
  const token = canvas.tokens.get(tokenId);
  const imagePath = token.document.texture.src.substring(
    token.document.texture.src.lastIndexOf("/") + 1,
    token.document.texture.src.lastIndexOf("."),
  );
  let directions = [
    "up",
    "down",
    "left",
    "right",
    "UP",
    "DOWN",
    "LEFT",
    "RIGHT",
  ];
  const hasDirection = directions.find((d) => imagePath.includes(d));
  const isLowerCase = directions.indexOf(hasDirection) < 4;
  directions = isLowerCase
    ? directions
    : directions.map((d) => d.toUpperCase());
  if (diagonalMode)
    directions = directions.concat(
      isLowerCase ? ["ul", "ur", "dl", "dr"] : ["UL", "UR", "DL", "DR"],
    );

  const outfitImages = {};
  if (!hasDirection) {
    for (const dir of ALL_DIRECTIONS) {
      outfitImages[dir] = token.document.texture.src;
    }
  } else {
    outfitImages.up = token.document.texture.src.replace(hasDirection, directions[0]);
    outfitImages.down = token.document.texture.src.replace(hasDirection, directions[1]);
    outfitImages.left = token.document.texture.src.replace(hasDirection, directions[2]);
    outfitImages.right = token.document.texture.src.replace(hasDirection, directions[3]);
    if (diagonalMode) {
      outfitImages.UL = token.document.texture.src.replace(hasDirection, directions[8]);
      outfitImages.UR = token.document.texture.src.replace(hasDirection, directions[9]);
      outfitImages.DL = token.document.texture.src.replace(hasDirection, directions[10]);
      outfitImages.DR = token.document.texture.src.replace(hasDirection, directions[11]);
    }
  }

  // Store as the "Default" outfit and set it as current
  await token.document.update({
    [`flags.${MODULE_NAME}.outfits`]: { Default: outfitImages },
    [`flags.${MODULE_NAME}.currentOutfit`]: "Default",
    lockRotation: true,
    rotation: 1,
  });

  await __8bit_precacheOutfit(token.document, "Default");
}

/**
 * Switch to a different outfit and precache its textures.
 * @param {string} tokenId Token ID.
 * @param {string} outfitName Outfit name to switch to.
 */
export async function switchOutfit(tokenId, outfitName) {
  const token = canvas.tokens.get(tokenId);
  if (!token) return;

  const doc = token.document;
  const outfits = doc.getFlag(MODULE_NAME, "outfits") ?? {};
  const newOutfit = outfits[outfitName];
  if (!newOutfit) return;

  // Preserve the token's current facing: find which direction it is showing in
  // the previously-active outfit, then use that same direction in the new one.
  const prevImages = __8bit_getActiveOutfitImages(doc);
  const facing = __8bit_findDirectionKey(prevImages, doc.texture.src) ?? "down";
  const newSrc = newOutfit[facing] || newOutfit.down;

  // Preload first so the swap is instant and sharp (no first-use blur).
  await __8bit_precacheOutfit(doc, outfitName);

  // Update the flag AND the displayed texture together so the sprite refreshes
  // immediately instead of only on the next move.
  await doc.update(
    {
      [`flags.${MODULE_NAME}.currentOutfit`]: outfitName,
      ...(newSrc ? { "texture.src": newSrc } : {}),
    },
    { animate: false },
  );
}

/**
 * Create a new outfit with empty direction images.
 * @param {string} tokenId Token ID.
 * @param {string} outfitName New outfit name.
 */
export async function addOutfit(tokenId, outfitName) {
  const token = canvas.tokens.get(tokenId);
  if (!token) return;

  const outfits = token.document.getFlag(MODULE_NAME, "outfits") ?? {};
  if (outfits[outfitName]) return; // Already exists

  const newOutfit = {};
  for (const dir of ALL_DIRECTIONS) {
    newOutfit[dir] = "";
  }
  outfits[outfitName] = newOutfit;

  await token.document.setFlag(MODULE_NAME, "outfits", outfits);
}

/**
 * Remove an outfit.
 * @param {string} tokenId Token ID.
 * @param {string} outfitName Outfit to remove.
 */
export async function removeOutfit(tokenId, outfitName) {
  const token = canvas.tokens.get(tokenId);
  if (!token) return;

  const outfits = token.document.getFlag(MODULE_NAME, "outfits") ?? {};
  delete outfits[outfitName];

  // If we were on this outfit, switch to the first remaining one
  const current = token.document.getFlag(MODULE_NAME, "currentOutfit");
  if (current === outfitName) {
    const remaining = Object.keys(outfits)[0] ?? null;
    await token.document.setFlag(MODULE_NAME, "currentOutfit", remaining);
  }

  await token.document.setFlag(MODULE_NAME, "outfits", outfits);
}

/**
 * Rename an outfit.
 * @param {string} tokenId Token ID.
 * @param {string} oldName Current outfit name.
 * @param {string} newName New outfit name.
 */
export async function renameOutfit(tokenId, oldName, newName) {
  const token = canvas.tokens.get(tokenId);
  if (!token) return;

  const outfits = token.document.getFlag(MODULE_NAME, "outfits") ?? {};
  if (!outfits[oldName] || outfits[newName]) return; // Invalid state

  outfits[newName] = outfits[oldName];
  delete outfits[oldName];

  // If we were on this outfit, update the current
  const current = token.document.getFlag(MODULE_NAME, "currentOutfit");
  if (current === oldName) {
    await token.document.setFlag(MODULE_NAME, "currentOutfit", newName);
  }

  await token.document.setFlag(MODULE_NAME, "outfits", outfits);
}

/**
 * Update a specific direction image in an outfit.
 * @param {string} tokenId Token ID.
 * @param {string} outfitName Outfit name.
 * @param {string} direction Direction key (up, down, etc.).
 * @param {string} imagePath New image path.
 */
export async function updateOutfitImage(tokenId, outfitName, direction, imagePath) {
  const token = canvas.tokens.get(tokenId);
  if (!token) return;

  const outfits = token.document.getFlag(MODULE_NAME, "outfits") ?? {};
  if (!outfits[outfitName]) return;

  outfits[outfitName][direction] = imagePath;
  await token.document.setFlag(MODULE_NAME, "outfits", outfits);

  // Precache if this is the active outfit
  if (token.document.getFlag(MODULE_NAME, "currentOutfit") === outfitName) {
    await __8bit_precacheOutfit(token.document, outfitName);
  }
}

// Warm the texture cache for every token's active outfit when a scene loads,
// so the first outfit switch / movement is already sharp.
Hooks.on("canvasReady", () => {
  for (const placeable of canvas.tokens?.placeables ?? []) {
    const outfitName = placeable.document.getFlag(MODULE_NAME, "currentOutfit");
    if (outfitName) __8bit_precacheOutfit(placeable.document, outfitName);
  }
});

/**
 * Open an image/video picker and save the selected path to a directional flag.
 * @param {string} tokenId Token ID to configure.
 * @param {object} sheet Token HUD or Token Config sheet to re-render.
 * @param {string} direction Directional flag key to update.
 * @param {string} outfitName Optional outfit name; if provided, updates the outfit instead of legacy flags.
 */
export async function imageLoader(tokenId, sheet, direction, outfitName) {
  const token = canvas.tokens.get(tokenId);
  // v13 namespaced FilePicker and v14 removed the deprecated global, so resolve
  // the implementation from the new location and fall back to the global on v12.
  const FilePickerImpl =
    foundry.applications?.apps?.FilePicker?.implementation ??
    globalThis.FilePicker;
  const pickedFile = await new FilePickerImpl({
    type: "imagevideo",
    callback: async (path) => {
      if (outfitName) {
        await updateOutfitImage(tokenId, outfitName, direction, path);
      } else {
        await token.document.setFlag(MODULE_NAME, direction, path);
      }
      sheet.render();
    },
  });
  pickedFile.browse();
}

/**
 * Register token update listeners that preview and persist directional textures.
 */
export async function addListener() {
  Hooks.on("refreshToken", (pl) => {
    try {
      const next = pl?.document?.getFlag(MODULE_NAME, "__nextTexture");
      if (next) __8bit_previewMesh(pl.id, next);
    } catch {}
  });
  const diagonalMode = game.settings.get(MODULE_NAME, "diagonalMode");
  Hooks.on("preUpdateToken", function changeImage(token, change) {
    if (!token.flags[MODULE_NAME]) return;

    const activeImages = __8bit_getActiveOutfitImages(token);
    if (
      !activeImages.up &&
      !activeImages.down &&
      !activeImages.right &&
      !activeImages.left
    ) {
      if (!game.settings.get(MODULE_NAME, "warnings"))
        ui.notifications.warn(
          game.i18n.localize("8BITMOVEMENT.Warn.No_Images"),
        );
      return;
    }

    const move =
      foundry.utils.hasProperty(change, "x") ||
      foundry.utils.hasProperty(change, "y");
    const rotation = foundry.utils.hasProperty(change, "rotation");
    if (move) {
      let direction = "";
      if (diagonalMode) {
        if (
          !activeImages.UL &&
          !activeImages.UR &&
          !activeImages.DL &&
          !activeImages.DR
        ) {
          if (!game.settings.get(MODULE_NAME, "warnings"))
            ui.notifications.warn(
              game.i18n.localize("8BITMOVEMENT.Warn.No_Images_Diagonal"),
            );
          return;
        }
        if (token.x === change.x && token.y === change.y) return;
        if (token.x > change.x && token.y === change.y) direction = "left";
        if (token.x < change.x && token.y === change.y) direction = "right";
        if (token.y > change.y && token.x === change.x) direction = "up";
        if (token.y < change.y && token.x === change.x) direction = "down";
        if (token.x > change.x && token.y > change.y) direction = "up-left";
        if (token.x < change.x && token.y > change.y) direction = "up-right";
        if (token.x > change.x && token.y < change.y) direction = "down-left";
        if (token.x < change.x && token.y < change.y) direction = "down-right";
      } else {
        if (token.x > change.x) direction = "left";
        if (token.x < change.x) direction = "right";
        if (token.y > change.y) direction = "up";
        if (token.y < change.y) direction = "down";
      }

      const directionMap = {
        up: "up",
        down: "down",
        left: "left",
        right: "right",
        "up-left": "UL",
        "up-right": "UR",
        "down-left": "DL",
        "down-right": "DR",
      };
      const imageKey = directionMap[direction];
      if (imageKey && activeImages[imageKey]) {
        if (token.texture.src === activeImages[imageKey]) return;
        foundry.utils.setProperty(
          change,
          "flags.8bit-movement-frankhz.__nextTexture",
          activeImages[imageKey],
        );
        __8bit_previewMesh(token.id, activeImages[imageKey]);
      }
    } else if (rotation) {
      const rotationMap = {
        0: "down",
        90: "left",
        180: "up",
        270: "right",
      };
      const rotKey = foundry.utils.getProperty(change, "rotation");
      const imageKey = rotationMap[rotKey];
      if (imageKey && activeImages[imageKey]) {
        if (token.texture.src === activeImages[imageKey]) return;
        foundry.utils.setProperty(
          change,
          "flags.8bit-movement-frankhz.__nextTexture",
          activeImages[imageKey],
        );
        __8bit_previewMesh(token.id, activeImages[imageKey]);
      }
    }
  });
}

// Persist previewed textures after movement begins so animated token movement stays smooth.
Hooks.on("updateToken", async (doc, changes) => {
  try {
    const token = canvas?.tokens?.get(doc.id);
    if (!token) return;

    // Transient flag set by preUpdateToken.
    const next =
      (changes?.flags &&
        changes.flags["8bit-movement-frankhz"] &&
        changes.flags["8bit-movement-frankhz"].__nextTexture) ||
      doc.getFlag("8bit-movement-frankhz", "__nextTexture");

    // Debounce persistence until movement settles to avoid jumps on drawn paths.
    if (next || "x" in changes || "y" in changes) {
      const prev = __8bitPersistTimers.get(doc.id);
      if (prev) clearTimeout(prev);
      const handle = setTimeout(async () => {
        try {
          const pending = doc.getFlag("8bit-movement-frankhz", "__nextTexture");
          if (pending) {
            await doc.update(
              {
                "texture.src": pending,
                "flags.8bit-movement-frankhz.-=__nextTexture": null,
              },
              { animate: false },
            );
          }
          const tk = canvas?.tokens?.get(doc.id);
          if (tk) {
            const kicks = [0, 48, 120, 240];
            for (const t of kicks) setTimeout(() => __8bit_forceOpaque(tk), t);
          }
        } catch {}
        __8bitPersistTimers.delete(doc.id);
      }, 800);
      __8bitPersistTimers.set(doc.id, handle);
    }

    // Keep opacity solid during movement and texture swaps.
    const movedNow = "x" in changes || "y" in changes;
    const swapped = !!next || (changes?.texture && "src" in changes.texture);
    if (movedNow || swapped) {
      const kicks = [0, 48, 120, 240];
      for (const t of kicks) setTimeout(() => __8bit_forceOpaque(token), t);
    }
  } catch (e) {
    console.warn("8bit-movement: post-update handler failed", e);
  }
});
