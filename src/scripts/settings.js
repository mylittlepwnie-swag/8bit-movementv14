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
  game.settings.register("8bit-movement-frankhz", "tokenMode", {
    name: game.i18n.format("8BITMOVEMENT.Token-Mode_name"),
    hint: game.i18n.format("8BITMOVEMENT.Token-Mode_hint"),
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
    requiresReload: true,
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
