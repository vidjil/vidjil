/**
 * Allow to click and wait network response from server for semgenter page testing
 * @return
 */
Cypress.Commands.add("submitSegmenterNetwork", () => {
  cy.intercept({
    method: "POST",
    url: "segmenter*",
  }).as("postSegmenter");

  cy.get("#btn_exportfasta").should("be.disabled")
    .get("#form_submit").should("be.visible").click({ force: true });

  cy.wait("@postSegmenter", { timeout: 15000 });
});
