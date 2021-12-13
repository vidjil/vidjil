

Cypress.Commands.add('login', (host) => { 
  if (host=="local"){
      cy.visit('http://localhost/browser')
      cy.update_icon()
      // log in
      cy.get('#auth_user_email', { timeout: 10000 })
        .should('exist')
        .should('be.visible')
        .type('plop@plop.com')
      cy.get('#auth_user_password')
        .type('foobartest')
      cy.get('#submit_record__row > .w2p_fw > input').click()
      cy.update_icon()
  } else if (host=="review"){
    cy.visit(Cypress.env('URL'))
    cy.update_icon()
    // log in
    cy.get('#auth_user_email', { timeout: 10000 })
      .should('exist')
      .should('be.visible')
      .type('test@vidjil.org')
    cy.get('#auth_user_password')
      .type(Cypress.env('CI_PASSWORD_TEST'))
    cy.get('#submit_record__row > .w2p_fw > input').click()
    cy.update_icon()
  } else if (host=="app"){
    cy.visit('https://app.vidjil.org/')
    cy.update_icon()
    
    // log in
    cy.get('#auth_user_email', { timeout: 10000 })
      .should('exist')
      .should('be.visible')
      .type('demo@vidjil.org')
    cy.get('#auth_user_password')
      .type('demo')
      // .type('demo')
    cy.get('#submit_record__row > .w2p_fw > input').click()
    cy.update_icon()
  }
  cy.verifyLogin()
})


Cypress.Commands.add('verifyLogin', (host) => { 
  cy.get('body').should('not.contain', 'You can request an account')
  cy.get('body').should('contain', 'logout')
})
