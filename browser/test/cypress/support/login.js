Cypress.Commands.add('login', (host) => { 

  cy.intercept({
    method: "GET",
    url: "get_active_notifications*",
  }).as("getActivities");

  cy.intercept({
    method: "POST",
    url: "**/sample_set/all*",
  }).as("postAllSampleSets");
  
  cy.session(['login'], () => {
    if (host=="local"){
      cy.visit('http://localhost')
      cy.wait("@getActivities");
      cy.fillLogin('plop@plop.com','foobartest')
    } else if (host=="review"){
      cy.visit(Cypress.env('URL'))
      cy.wait("@getActivities");
      cy.fillLogin('test@vidjil.org',Cypress.env('CI_PASSWORD_TEST'))
    } else if (host=="app"){
      cy.visit('https://app.vidjil.org/')
      cy.wait("@getActivities");
      cy.fillLogin('demo@vidjil.org','demo')
    }
    cy.close_tips()
  })
})


Cypress.Commands.add('visitpage', (host) => { 
  if (host=="local"){
    cy.setBrowser('http://localhost')
    cy.wait("@getActivities");
  } else if (host=="review"){
    cy.setBrowser(Cypress.env('URL'))
    cy.wait("@getActivities");
  }
  cy.get('[data-cy="db_page_patient"]', { timeout: 10000 })
    .should('exist').should('be.visible')
  cy.close_tips()
})

Cypress.Commands.add('fillLogin', (user, password) => { 
  cy.get('[data-cy="db_div"]', { timeout: 10000 })
    .should("be.visible")
  cy.close_tips()

  cy.document().then(($document) => {
    const documentResult = $document.querySelector('#logout_button')
    if (documentResult) {
      cy.log("CHECK - already logged")
      cy.logout()
    } else {
      cy.log("CHECK - not logged")
    }
  })

  cy.get('#login', { timeout: 10000 })
    .type(user)
  cy.get('#password')
    .type(password)
  cy.get('#submit_login').click()
  cy.wait("@getActivities");

  cy.verifyLogin()
})


Cypress.Commands.add('verifyLogin', () => { 
  cy.get('body').should('not.contain', 'You can request an account')
  cy.get('body').should('contain', 'logout')
})


// LOGOUT
Cypress.Commands.add('logout', (host) => {
  cy.get('#logout_button')
    .should('exist')
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
