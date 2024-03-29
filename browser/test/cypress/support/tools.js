

Cypress.Commands.add('waitForUpdates', () => { 
  cy.wait(1000)
})



// 
Cypress.Commands.add("uploadFile",
  { prevSubject: true },
  (subject, fileName) => {
    cy.fixture(fileName).then(content => {
      const el = subject[0];
      const testFile = new File([content], fileName);
      const dataTransfer = new window.DataTransfer();

      dataTransfer.items.add(testFile);
      el.files = dataTransfer.files;
      cy.wrap(subject).trigger("change", { force: true });
    });
  }
);


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