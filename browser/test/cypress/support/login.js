

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
    cy.get('#auth_user_email', { timeout: 10000 })
      .should('exist').should('be.visible')
      .type(user)
    cy.get('#auth_user_password')
      .type(password)
    cy.get('#submit_record__row > .w2p_fw > input').click()
    cy.update_icon()

    cy.verifyLogin()
})


Cypress.Commands.add('verifyLogin', (host) => { 
  cy.get('body').should('not.contain', 'You can request an account')
  cy.get('body').should('contain', 'logout')
})
