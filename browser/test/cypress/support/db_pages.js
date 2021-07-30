Cypress.Commands.add('initDatabase', (host) => {
  // init database if button is present at opening of page
  if (host=="local"){
    if (Cypress.env('initiated_database') === false){ // allow to bypass waiting

      cy.visit('http://localhost/browser')
      cy.get('#db_content > h2', { timeout: 10000 })
        .should('contain', 'Login')

      cy.get('body').then(($body) => {
        var init_button = $body.find(":contains('init database')").length > 0
        cy.log( "find init database button: " + init_button)

        if (init_button) {
          cy.log( "FOUND init database")
          cy.contains('init database').click()

          cy.get('#email', { timeout: 10000 })
            .should('exist')
            .should('be.visible')
            .type('plop@plop.com')
          cy.get('#password')
            .type('foobartest')
          cy.get('#confirm_password')
            .type('foobartest')
          cy.get('#data_form')
            .contains('save').click()
          cy.waitForUpdates()
          cy.get('#auth_user_email', { timeout: 10000 })
            .should('exist')
            .should('be.visible')
        }
        cy.exec('export initiated_database="true"')
      })
    } else {
      cy.log( "Init database already done")
    }
  }
})

Cypress.Commands.add('isDbPageVisible', () => { 
  cy.get('.db_div').then($button => {
    if ($button.is(':visible')){
      return true
    } else {
      return false
    }
  })
})


Cypress.Commands.add('openDBPage', () => {
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


Cypress.Commands.add('closeDBPage', () => {
  cy.isDbPageVisible()
  .then((val) => {
      console.log( val )
      if (val == true){
        cy.get('.db_div > .closeButton > .icon-cancel')
          .click()
          .should("not.visible")
      }
  })

})


/**
 * Allow to openDBpage if needed and to go to the correct token (patient/run/set)
 * Use an intercept on GET method to fire event after recept of request
 * Allow to not get error if db table is render again between multiple call
 * @param  {[type]} 'goToTokenPage' Name of function
 * @param  {[type]} (token)         Token to call (patient, run or set)
 * @return {[type]}
 */
Cypress.Commands.add('goToTokenPage', (token) => {
  cy.openDBPage().then(() => {
    cy.intercept({
        method: 'GET', // Route all GET requests
        url: 'get_active_notifications*', // that have a URL that matches '/users/*'
      }).as('getActivities')

    cy.get('#db_menu > .'+token+'_token')
      .contains(''+token+'s')
      .should('be.visible')
      .click()

    cy.wait(['@getActivities'])
    cy.waitForUpdates()

    cy.get('.db_div')
      .should('contain', ' + new '+token+'s ')
  })
})

/**
 * Go to db patient page; open db if needed and call patient page
 */
Cypress.Commands.add('goToPatientPage', () => {
  cy.goToTokenPage("patient")
})


/**
 * Go to db run page; open db if needed and call patient page
 */
Cypress.Commands.add('goToRunPage', () => { 
  cy.goToTokenPage("run")
})

/**
 * Go to db set page; open db if needed and call patient page
 */
Cypress.Commands.add('goToSetPage', () => {
  cy.goToTokenPage("set")
})
