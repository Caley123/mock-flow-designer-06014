/**
 * Políticas Trusted Types — cargar antes que la app y Google Analytics.
 */
(function initTrustedTypes() {
  if (!window.trustedTypes || !trustedTypes.createPolicy) return;

  const passthrough = {
    createHTML: (input) => input,
    createScriptURL: (input) => input,
    createScript: (input) => input,
  };

  if (!trustedTypes.defaultPolicy) {
    trustedTypes.createPolicy('default', passthrough);
  }

  try {
    trustedTypes.createPolicy('goog#html', passthrough);
  } catch {
    /* ya existe */
  }
})();
