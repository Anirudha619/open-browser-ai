// Opik configuration utility
// Checks if Opik is enabled via environment variable

function isOpikEnabled() {
  return !!(process.env.OPIK_API_KEY || process.env.COMET_API_KEY);
}

function getOpikConfig() {
  return {
    enabled: isOpikEnabled(),
    apiKey: process.env.OPIK_API_KEY || process.env.COMET_API_KEY,
    workspace: process.env.OPIK_WORKSPACE,
    project: process.env.OPIK_PROJECT_NAME
  };
}

module.exports = {
  isOpikEnabled,
  getOpikConfig
};
