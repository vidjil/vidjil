Cypress.Commands.add('isDbPageVisible', () => { 
  // return cy.get('.db_div').should("be.visible")
  cy.get('.db_div').then($button => {
    if ($button.is(':visible')){
      return true
    } else {
      return false
    }
  })
})


Cypress.Commands.add('goToDBPage', () => {
  cy.isDbPageVisible().then((val) => {
    console.log( val )
    if (val == false){
      cy.get('#db_menu').trigger('mouseover')
        .contains('open list')
        .should('be.visible')
        .click()

      cy.get('.db_div')
        .should('be.visible')
    }
  })

})



Cypress.Commands.add('goToPatientPage', () => { 
  cy.goToDBPage().then(() => { 
    cy.get('#db_menu > .patient_token')
      .click()

    cy.get('.db_div')
      .should('contain', ' + new patients ')
  })
})

Cypress.Commands.add('goToRunPage', () => { 
  cy.goToDBPage().then(() => { 
    cy.get('#db_menu > .run_token')
      .click()

    cy.get('.db_div')
      .should('contain', ' + new runs ')
  })
})