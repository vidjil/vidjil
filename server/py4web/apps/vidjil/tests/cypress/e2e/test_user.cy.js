/// <reference types="cypress" />

describe("Creation of users and groups", function () {

   it("01-create a user and log him", function () {
    cy.goToUsersPage();

    // Create users
    const first_name = "uf";
    const last_name = "ul";
    const email = "user@logged.org";
    const password = "4P99n!vP3c_/kA]3Yv"; // complex password
    var user1_return = cy.createUser(
      first_name + "1",
      last_name + "1",
      email + "A",
      password + "1"
    );
    var user2_return = cy.createUser(
      first_name + "2",
      last_name + "2",
      email + "B",
      password + "2"
    );

    cy.logout()
    cy.visit('http://localhost')
    cy.wait("@getActivities");
    cy.fillLogin(email + "B", password + "2")

  });

  it("01-Users and impersonate", function () {
    cy.goToUsersPage();
    var initial_number_users_return = cy.getTableLength("#table_users");

    // Create users
    const first_name = "uf";
    const last_name = "ul";
    const email = "u@e.o";
    const password = "4P99n!vP3c_/kA]3Yv"; // complex password
    var user1_return = cy.createUser(
      first_name + "1",
      last_name + "1",
      email + "A",
      password + "1"
    );
    var user2_return = cy.createUser(
      first_name + "2",
      last_name + "2",
      email + "B",
      password + "2"
    );

    cy.goToUsersPage();
    initial_number_users_return.then((initial_number_users) =>
      cy.getTableLength("#table_users").should("eq", initial_number_users + 2)
    );

    user1_return.then((user_id) => {
      // Set group rights for user 1
      var correspondingGroup_return = cy.goToCorrespondingUserGroup(user_id);
      correspondingGroup_return.then((correspondingGroup) =>
        cy.setGroupRightInPage(correspondingGroup, ["run"], true)
      );

      // Impersonation
      cy.log("Try and impersonate user " + user_id);

      // Impersonate from drop down
      cy.goToPatientPage();
      cy.get("#db_auth_name").should("contain", "System Administrator");
      cy.get("#desimpersonate_btn").should("not.exist");
      cy.get("#choose_user").select(user_id, { force: true });
      cy.wait("@getActivities");
      cy.get("#db_auth_name").should("not.exist");

      cy.get("#desimpersonate_btn").should("exist").click();
      cy.wait("@getActivities");
      cy.get("#db_auth_name").should("contain", "System Administrator");

      // Impersonate from users table
      cy.goToUsersPage();

      cy.get("#db_auth_name").should("contain", "System Administrator");
      cy.get("#desimpersonate_btn").should("not.exist");
      cy.get("#impersonate_btn_" + user_id).click();
      cy.wait("@getActivities");
      cy.get("#db_auth_name").should("not.exist");
      cy.get('[data-cy="db_div"]').should("contain", " + new patients "); // we should have been redirected to patients page

      cy.get("#desimpersonate_btn").click();
      cy.wait("@getActivities");
      cy.get("#db_auth_name").should("contain", "System Administrator");

      // Owner sets
      var owner_public = "public";
      var owner_user1 = "Personal Group";

      // public should not be anon.
      cy.createPatient(
        "",
        "pub",
        "test1",
        "2000-01-01",
        "Cy",
        owner_public,
        `test1 pub`
      );
      // groups of user should be anon.
      cy.createPatient(
        "",
        "u",
        "test2",
        "2000-01-03",
        `Cy`,
        owner_user1,
        `tes (`
      );
    });
  });

  it("02-User update", function () {
    cy.goToUsersPage();
    var random_number_user = Math.floor(Math.random() * 100000000)
    cy.log(random_number_user)

    // Create users
    const first_name = "uf - User update";
    const last_name = "ul - User update";
    const email_admin = "plop@plop.com";
    const email = `user-${random_number_user}@plop.com`;
    const new_good_email = `user-update-${random_number_user}@plop.com`;
    const new_bad_email = `not an real email`;

    const password = "4P99n!vP3c_/kA]3Yv"; // complex password
    const password_change = "new_password_4P99n!vP3c_/kA]3Yv"; // complex password

    cy.createUser(
      first_name + "2",
      last_name + "2",
      email + "B",
      password + "2"
    ).then((user1_id) => {

      // Test change of password
      cy.get(`[onclick="db.call('user/edit', {'id' :'${user1_id}'} )"] > .icon-pencil-2`)
        .click()

      cy.get('#password')
        .type(password_change)
      cy.get('#confirm_password')
        .type(password_change)
      cy.get('#update_user_btn')
        .click()

      cy.get('#page_user')
        .should("exist")

      //////////////////////////////////////////////
      // test update of email, but with a bad email
      cy.get(`[onclick="db.call('user/edit', {'id' :'${user1_id}'} )"] > .icon-pencil-2`)
        .click()

      cy.get('#email')
        .clear()
        .type(new_bad_email)

      cy.get('#update_user_btn')
        .click()

      cy.get('#page_user')
        .should("not.exist")

      cy.get('.flash_2')
        .should("contain", "Enter a valid email address")
        .click()

      ///////////////////////////////////////////////////
      // Test update with a real new email, but of admin
      cy.get('#email')
        .clear()
        .type(email_admin)

      cy.get('#update_user_btn')
        .click()

      cy.get('#page_user')
        .should("not.exist")


      cy.get('.flash_2')
        .should("contain", "Email already exist")

      /////////////////////////////////////
      // Test update with a real new email
      cy.get('#email')
        .clear()
        .type(new_good_email)

      cy.get('#update_user_btn')
        .click()

      cy.get('#page_user')
        .should("exist")

      cy.get(`[ondblclick="db.call('user/info', {'id' :'${user1_id}'} )"]`)
        .should("contain", new_good_email)
    })

  });

});
