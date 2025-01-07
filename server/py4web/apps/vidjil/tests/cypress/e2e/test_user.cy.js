/// <reference types="cypress" />

describe("Creation of users and groups", function () {
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
});
