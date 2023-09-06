

Cypress.Commands.add('login', (host) => { 
  if (host=="local"){
      cy.visit('http://localhost/browser')
      cy.update_icon()
      cy.fillLogin('plop@plop.com','foobartest')
  } else if (host=="review"){
    cy.visit(Cypress.env('URL'))
    cy.update_icon()
    cy.fillLogin('test@vidjil.org',Cypress.env('CI_PASSWORD_TEST'))
  } else if (host=="app"){
    cy.visit('https://app.vidjil.org/')
    cy.update_icon()
    cy.fillLogin('demo@vidjil.org','demo')
  }
})


Cypress.Commands.add('fillLogin', (user, password) => { 
    cy.get('#login', { timeout: 10000 })
      .should('exist').should('be.visible')
      .type(user)
    cy.get('#password')
      .type(password)
    cy.get('#submit_login').click()
    cy.update_icon()

    cy.verifyLogin()
})


Cypress.Commands.add('verifyLogin', (host) => { 
  cy.get('body').should('not.contain', 'You can request an account')
  cy.get('body').should('contain', 'logout')
})


// LOGOUT
Cypress.Commands.add('logout', (host) => {
  cy.get('#logout_button')
    .should('exist')
  cy.intercept({
        method: 'GET', // Route all GET requests
        url: 'get_active_notifications*',
      }).as('getActivities')
  cy.get('#logout_button')
    .click()
  cy.wait(['@getActivities'])

  cy.closeDBPage()
  cy.openDBPage()
  cy.verifyLogout()
})


Cypress.Commands.add('verifyLogout', (host) => {
  cy.get('#login', { timeout: 10000 })
      .should('exist')
      .should('be.visible')
  cy.get('body').should('contain', 'You can request an account')
})
