import { registerSettings } from "./settings.js";
import { addListener, initializeMovement, MODULE_NAME } from "./functions.js";
import { createConfigButtons } from "./ui.js";

Hooks.on("init", () => {
  registerSettings();
});

Hooks.on("ready", async function () {
  if (game.settings.get("8bit-movement-frankhz", "disableRotationAnimation")) {
    if (!globalThis.libWrapper) {
      console.warn(
        "8bit-movement: libWrapper is not active; rotation animation wrapper was not registered.",
      );
    } else {
      try {
        const wrapperId = libWrapper.register(
          "8bit-movement-frankhz",
          "Token.prototype.animate",
          function (wrapped, ...args) {
            const [attributes, options = {}] = args;

            if (
              attributes.hasOwnProperty("texture") &&
              attributes.hasOwnProperty("rotation")
            ) {
              options.duration = 0;
            }

            return wrapped(attributes, options);
          },
          "WRAPPER",
        );

        console.log(
          `8bit-movement: registered Token.prototype.animate wrapper with libWrapper (${wrapperId}).`,
        );
      } catch (error) {
        console.error(
          "8bit-movement: failed to register Token.prototype.animate wrapper with libWrapper.",
          error,
        );
      }
    }
  }

  addListener();
});

// Activate the 8bit walk style automatically when a token is placed, so the
// per-token setup no longer has to be triggered by hand. Only the client that
// created the token performs the update, so it runs exactly once.
Hooks.on("createToken", async function (tokenDocument, options, userId) {
  if (userId !== game.user.id) return;
  if (!game.settings.get(MODULE_NAME, "autoActivate")) return;
  if (Object.hasOwn(tokenDocument.flags ?? {}, MODULE_NAME)) return;
  await initializeMovement(tokenDocument);
});

Hooks.on("renderTokenConfig", async function (sheet, element) {
  createConfigButtons(sheet, element);
});

// v13+ opens prototype token setup in a separate PrototypeTokenConfig app, which
// fires its own render hook rather than renderTokenConfig.
Hooks.on("renderPrototypeTokenConfig", async function (sheet, element) {
  createConfigButtons(sheet, element);
});
