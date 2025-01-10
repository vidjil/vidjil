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

// Imports using ES2015 syntax:
import "./tools";
import "./login";
import "./list";
import "./commands";
import "./db_pages";
import "./user_and_group";
import "./configs_and_process";
import "./clones";
import "./menu";
import "./info";
import "./aligner";
import "./network";
import "./external";

const resizeObserverLoopErrRe = /^[^(ResizeObserver loop limit exceeded)]/;
Cypress.on("uncaught:exception", (err, runnable) => {
  // returning false here prevents Cypress from failing the test
  if (resizeObserverLoopErrRe.test(err.message)) {
    return false;
  }
  return false;
});

let commands = [];
let testAttributes;

Cypress.on("test:before:run", () => {
  commands.length = 0;
});

Cypress.on("test:after:run", (attributes) => {
  if (Cypress.env("server")) {
    /* eslint-disable no-console */
    console.log(
      'Test "%s" has finished in %dms',
      attributes.title,
      attributes.duration
    );
    // Reactivate to display timing details
    // console.table(commands)
    testAttributes = {
      title: attributes.title,
      duration: attributes.duration,
      commands: Cypress._.cloneDeep(commands),
    };
  }
});

Cypress.on("command:start", (c) => {
  if (Cypress.env("server")) {
    commands.push({
      name: c.attributes.name,
      started: +new Date(),
    });
  }
});

Cypress.on("command:end", (c) => {
  if (Cypress.env("server")) {
    const lastCommand = commands[commands.length - 1];

    if (lastCommand.name !== c.attributes.name) {
      throw new Error("Last command is wrong");
    }

    lastCommand.endedAt = +new Date();
    lastCommand.elapsed = lastCommand.endedAt - lastCommand.started;
  }
});

// sends test results to the plugins process
// using cy.task https://on.cypress.io/task
const sendTestTimings = () => {
  if (!testAttributes) {
    return;
  }

  const attr = testAttributes;
  testAttributes = null;
  cy.task("testTimings", attr);
};

beforeEach(() => {
  cy.on("window:before:load", (win) => {
    cy.spy(win.console, "log");
  });
  if (Cypress.env("server")) {
    sendTestTimings();
    cy.login(Cypress.env("host"));
    // cy.initTestDb(Cypress.env("host"));
    cy.visitpage(Cypress.env("host"));
    cy.closeFlashAll();
  }
});

before(function () {
});

const logs = {};
Cypress.on("log:added", (log) => {
  let message = log.name + " - " + log.message;
  logs[log.id] = message;
});
Cypress.on("log:changed", (log) => {
  let message = log.name + " - " + log.message;
  logs[log.id] = message;
});

after(() => {
  if (Cypress.env("server")) {
    cy.clearCookies();
    sendTestTimings();
  }
  cy.writeFile(`cypress/logs/${Cypress.spec.name}.log.json`, logs);
});
