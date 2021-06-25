

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

