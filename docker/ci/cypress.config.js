
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
  downloadsFolder: "cypress/downloads",
  viewportWidth: 1366,
  viewportHeight: 800,
  e2e: {
    setupNodeEvents(on, config) {
      on('task', {
        testTimings (attributes) {
          console.log('Test "%s" has finished in %dms', 
            attributes.title, attributes.duration)
          // Reactivate to display timing details
          // console.table(attributes.commands)
          return null
        },
      })
    },
  }
})