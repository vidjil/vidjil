

Cypress.Commands.add('login', (host) => { 
  if (host=="local"){
      cy.visit('https://localhost/browser')
      cy.waitForUpdates()
      // log in
      cy.get('#auth_user_email')
        .type('plop@plop.com')
      cy.get('#auth_user_password')
        .type('foobartest')
      cy.get('#submit_record__row > .w2p_fw > input').click()
      cy.waitForUpdates()
  } else if (host=="review"){
    cy.visit('https://localhost/browser')
    cy.waitForUpdates()
    // log in
    cy.get('#auth_user_email')
      .type('test@vidjil.org')
    cy.get('#auth_user_password')
      .type(Cypress.env('CI_PASSWORD_TEST'))
    cy.get('#submit_record__row > .w2p_fw > input').click()
    cy.waitForUpdates()
  } else if (host=="app"){
    cy.visit('https://app.vidjil.org/')
    cy.waitForUpdates()
    
    // log in
    cy.get('#auth_user_email')
      .type('demo@vidjil.org')
    cy.get('#auth_user_password')
      .type('demo')
      // .type('demo')
    cy.get('#submit_record__row > .w2p_fw > input').click()
    cy.waitForUpdates()
  }
  cy.verifyLogin()
})


Cypress.Commands.add('verifyLogin', (host) => { 
  cy.get('body').should('not.contain', 'You can request an account')
  cy.get('body').should('contain', 'logout')
})
