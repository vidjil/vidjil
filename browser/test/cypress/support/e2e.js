// ***********************************************************
// This example support/index.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './tools'
import './login'
import './list'
import './commands'
import './db_pages'
import './user_and_group'
import './configs_and_process'
import './clones'
import './menu'
import './info'
import './aligner'
import './network'
import './external'


const resizeObserverLoopErrRe = /^[^(ResizeObserver loop limit exceeded)]/
Cypress.on('uncaught:exception', (err, runnable) => {
    // returning false here prevents Cypress from failing the test
    if (resizeObserverLoopErrRe.test(err.message)) { return false }
    return false
})

beforeEach(() => {
  cy.on("window:before:load", (win) => {
    cy.spy(win.console, "log");
  })
})

before(function() {
  // runs once before all tests in the block
    cy.initDatabase(Cypress.env('host'))
})


const logs = {}
Cypress.on('log:added', (log) => {
  let message = log.name + ' - ' + log.message;
  logs[log.id] = message
})
Cypress.on('log:changed', (log) => {
  let message = log.name + ' - ' + log.message
  logs[log.id] = message
})

after(() => {
  cy.writeFile(`cypress/logs/${Cypress.spec.name}.log.json`, logs)

