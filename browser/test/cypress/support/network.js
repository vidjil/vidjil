

/**
 * Allow to click and wait network response from server for semgenter page testing
 * @return
 */
Cypress.Commands.add('submitSegmenterNetwork', () => {
    cy.intercept({
        method: 'POST',
        url: '/vidjil/segmenter*',
        hostname: 'db.vidjil.org',
      }).as('getActivities')

    cy.wait(500)
    cy.get('#form_submit')
      .should("be.visible")
      .click({force: true})
      .should('be.disabled')

    cy.wait(['@getActivities'], {timeout: 15000})
    cy.update_icon(100)
})
