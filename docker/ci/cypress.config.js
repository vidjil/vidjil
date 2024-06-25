
const { defineConfig } = require('cypress')

module.exports = defineConfig({
  reporter: 'junit',
  reporterOptions: {
    mochaFile: 'cypress/reports/test-cypress-[hash].xml',
    toConsole: true,
  },
  video: false,
  pageLoadTimeout: 120000,
  chromeWebSecurity: false,
  viewportWidth: 1366,
  viewportHeight: 800,
  e2e: {
  }
})