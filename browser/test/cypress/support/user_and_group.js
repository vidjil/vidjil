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
  
  cy.get('#register_user')
    .should('exist')
    .should("contain", "Register new user")
  cy.update_icon()  

  cy.fillUser(first_name, last_name, email, password)

  cy.get('#sign_up')
    .should("contain", "Sign up")
    .click()

  cy.update_icon()  
  cy.get('#table_users')
    .should('exist')
    .should("contain", `${first_name} ${last_name}`)
})


Cypress.Commands.add('fillUser', (first_name, last_name, email, password) => {
  cy.get('#first_name').type(first_name)
  cy.get('#last_name').type(last_name)
  cy.get('#email').type(email)
  cy.get('#password').type(password)
  cy.get('#confirm_password').type(password)
  return
})


Cypress.Commands.add('setGroupRight', (grp_id, rights, value) => {
    // Control given values
    if (typeof value != "boolean") {
      throw new Error(`setGroupRight, error; '${value}' is not a boolean value`)
    }
    if (!Array.isArray(rights)) {
      throw new Error(`setGroupRight, error; '${rights}' is not an array of rights`)
    }

    cy.goToGroupsPage()
    cy.intercept({
        method: 'GET', // Route all GET requests
        url: 'get_active_notifications*',
      }).as('getActivities')

    cy.get('#row_group_'+grp_id)
      .click()

    cy.wait(['@getActivities'])
    cy.update_icon(100)

    var rights_list = ["create", "read", "admin", "upload", "run", "save", "anon"]
    for (var i = rights.length - 1; i >= 0; i--) {
      var right = rights[i]

      if (rights_list.indexOf(right) == -1) {
        throw new Error(`setGroupRight, error; right "${right}" don't exist`)
      }

      if (value == true){
        cy.request('POST','/vidjil/group/rights?value=true&name=sample_set&right='+right+'&id='+grp_id+'&=')
      } else if (value == false){
        cy.request('POST','/vidjil/group/rights?value=false&name=sample_set&right='+right+'&id='+grp_id+'4&=')
      }
    }

})
