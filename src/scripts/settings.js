export const registerSettings = function () {
  game.settings.register("8bit-movement-frankhz", "gmMode", {
    name: game.i18n.format("8BITMOVEMENT.GM-Mode_name"),
    hint: game.i18n.format("8BITMOVEMENT.GM-Mode_hint"),
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
    requiresReload: true,
  });
  game.settings.register("8bit-movement-frankhz", "autoActivate", {
    name: game.i18n.format("8BITMOVEMENT.Auto-Activate_name"),
    hint: game.i18n.format("8BITMOVEMENT.Auto-Activate_hint"),
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
  });
  game.settings.register("8bit-movement-frankhz", "settingsMode", {
    name: game.i18n.format("8BITMOVEMENT.Settings-Mode_name"),
    hint: game.i18n.format("8BITMOVEMENT.Settings-Mode_hint"),
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
    requiresReload: true,
  });
  game.settings.register("8bit-movement-frankhz", "diagonalMode", {
    name: game.i18n.format("8BITMOVEMENT.Diagonal-Mode_name"),
    hint: game.i18n.format("8BITMOVEMENT.Diagonal-Mode_hint"),
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    requiresReload: true,
  });
  game.settings.register("8bit-movement-frankhz", "warnings", {
    name: game.i18n.format("8BITMOVEMENT.Settings-Warn_name"),
    hint: game.i18n.format("8BITMOVEMENT.Settings-Warn_hint"),
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    requiresReload: true,
  });
  game.settings.register("8bit-movement-frankhz", "disableSelectionBorder", {
    name: game.i18n.format("8BITMOVEMENT.Disable-Selection-Border_name"),
    hint: game.i18n.format("8BITMOVEMENT.Disable-Selection-Border_hint"),
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    onChange: () => {
      // Re-run the state refresh so borders hide/reappear without a reload.
      for (const token of canvas?.tokens?.placeables ?? []) {
        try {
          token.renderFlags.set({ refreshState: true });
        } catch {}
      }
    },
  });
  game.settings.register("8bit-movement-frankhz", "disableRotationAnimation", {
    name: game.i18n.format("8BITMOVEMENT.Disable-Rotation-Animation_name"),
    hint: game.i18n.format("8BITMOVEMENT.Disable-Rotation-Animation_hint"),
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    requiresReload: true,
  });
};
