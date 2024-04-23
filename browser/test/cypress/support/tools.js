

Cypress.Commands.add('waitForUpdates', () => { 
  cy.wait(1000)
})



Cypress.Commands.add("text", { prevSubject: true }, (subject, options) => {
  return subject.text();
});

Cypress.Commands.add("getTableLength", (datatable) => {
  return cy.get(datatable).find('tbody').find('tr').then(elm => elm.length)
});


Cypress.Commands.add("getFormLineLength", () => {
  return cy.get("#fieldset_container > .form_line").then(elm => elm.length)
});


Cypress.Commands.add("getExternalData", (id) => {
    return cy.get("#data_"+id)
});