Cypress.Commands.add('checkSelectedSampleInBlocks', (sampleName) => { 
    cy.checkSelectedSampleInBlock("Sample information", sampleName)
    cy.checkSelectedSampleInBlock("Plot:", sampleName)
})

Cypress.Commands.add('checkSelectedSampleInBlock', (blockText, sampleName) => { 
    cy.get(".rs-block")
      .contains(blockText)
      .within(() => {
        cy.get("select option:selected")
          .should("contain", sampleName);
      });
})