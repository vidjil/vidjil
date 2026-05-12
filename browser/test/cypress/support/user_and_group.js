// ***********************************************


Cypress.Commands.add('createUser', (first_name, last_name, email, password) => {
  cy.goToUsersPage()

  cy.get('#create_user_button')
    .click()
  cy.wait("@getActivities")
  
  cy.get('#register_user')
    .should('exist')
    .should("contain", "Register new user")

  cy.fillUser(first_name, last_name, email, password)

  cy.get('#sign_up')
    .should("contain", "Sign up")
    .click()
  cy.wait("@getActivities")

  cy.contains('#table_users', `${first_name}`)
  cy.contains('#table_users', `${last_name}`)

  return cy.getBiggestId("#table_users")
})


Cypress.Commands.add('fillUser', (first_name, last_name, email, password) => {
  cy.get('#first_name').type(first_name)
  cy.get('#last_name').type(last_name)
  cy.get('#email').type(email)
  cy.get('#password').type(password)
  cy.get('#confirm_password').type(password)
})

Cypress.Commands.add("goToCorrespondingUserGroup", (user_id) => {
  // Double click on corresponding group
  cy.get("#table_users")
    .contains("tr td:nth-child(1)", user_id)
    .parent()
    .contains("td:nth-child(5) > a", "user_")
    .dblclick()
  cy.wait("@getActivities")

  // Get id from title
  cy.get("#db_content")
    .contains("h3", "group : ")
    .then(($title) => { 
      const titleText = $title.text();
      var regExp = /\(([^)]+)\)$/;
      var matches = regExp.exec(titleText);
      var group_id = parseInt(matches[1])
      return cy.wrap(group_id)
    })
})

Cypress.Commands.add('goToGroupPage', (grp_id) => {
    cy.goToGroupsPage()

    cy.get('#row_group_'+grp_id)
      .click()
    cy.wait("@getActivities")
})


Cypress.Commands.add('setGroupRightInPage', (grp_id, rights, value) => {
    // Control given values
    if (typeof value != "boolean") {
      throw new Error(`setGroupRight, error; '${value}' is not a boolean value`)
    }
    if (!Array.isArray(rights)) {
      throw new Error(`setGroupRight, error; '${rights}' is not an array of rights`)
    }

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
