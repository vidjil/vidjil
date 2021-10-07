// ***********************************************




/**
 * Allow to openDBpage if needed and to go to the correct token (patient/run/set)
 * Use an intercept on GET method to fire event after recept of request
 * Allow to not get error if db table is render again between multiple call
 * @param  {[type]} 'goToTokenPage' Name of function
 * @param  {[type]} (token)         Token to call (patient, run or set)
 * @return {[type]}
 */
Cypress.Commands.add('goToDbPage', (dbpage, page, page_header) => {
  cy.openDBPage().then(() => {
    cy.intercept({
        method: 'GET', // Route all GET requests
        url: 'get_active_notifications*', // that have a URL that matches '/users/*'
      }).as('getActivities')

    cy.get(dbpage)
      .should('be.visible')
      .click( { force: true} )

    cy.wait(['@getActivities'])
    cy.update_icon()

    cy.get(page)
      .should('exist')
      .should('contain', page_header)
  })
})

/**
 * Go to db patient page; open db if needed and call patient page
 */

Cypress.Commands.add('goToUsagePage', () => {
  cy.goToDbPage("#db_page_usage", "#page_usage", "Usage")
})
Cypress.Commands.add('goToProcessPage', () => {
  cy.goToDbPage("#db_page_processes", "#page_jobs", "")
})

Cypress.Commands.add('goToNewsPage', () => {
  cy.goToDbPage("#db_page_news", "#page_news", "News")
})


/////////////////
// Admin db page
/////////////////

Cypress.Commands.add('goToPreprocessPage', () => {
  cy.goToDbPage("#db_page_preprocess", "#page_preprocess", "Pre-process list")
})
Cypress.Commands.add('goToConfigsPage', () => {
  cy.goToDbPage("#db_page_configs", "#page_process", "Configs")
})

Cypress.Commands.add('goToGroupsPage', () => {
  cy.goToDbPage("#db_page_groups", "#page_group", "Groups")
})
Cypress.Commands.add('goToUsersPage', () => {
  cy.goToDbPage("#db_page_users", "#page_user", "Users")
})
Cypress.Commands.add('goToAdminPage', () => {
  cy.goToDbPage("#db_page_admin", "#page_admin", "Admin")
})



Cypress.Commands.add('createUser', (first_name, last_name, email, password) => {
  cy.goToUsersPage()

  cy.get('#create_user_button')
    .click()

  cy.update_icon()
  
  cy.get('#db_content > h2')
    .should('exist')
    .should("contain", "Register")
  cy.update_icon()  

  cy.fillUser(first_name, last_name, email, password)
  cy.get('#submit_record__row > .w2p_fw > input')
    .click()

  cy.update_icon()  
  cy.get('#user_info')
    .should('exist')
    .should("contain", `user info ${first_name} ${last_name}`)


})


Cypress.Commands.add('fillUser', (first_name, last_name, email, password) => {
  cy.get('#auth_user_first_name').type(first_name)
  cy.get('#auth_user_last_name').type(last_name)
  cy.get('#auth_user_email').type(email)
  cy.get('#auth_user_password').type(password)
  cy.get('#auth_user_password_two').type(password)
  return
})


Cypress.Commands.add('setGroupRight', (right, value) => {

    var rights = ["create", "read", "admin", "upload", "run", "save", "anon"]
    if (rights.indexOf(right) == -1 || typeof value != "boolean") {
      throw new Error('setGroupRight, error')
    }
    var check = cy.get('#group_right_'+right)

    if (value == true){
      check.check()
           .should('be.checked')
    } else if (value == false){
      check.uncheck()
           .should('not.be.checked')
    }

})