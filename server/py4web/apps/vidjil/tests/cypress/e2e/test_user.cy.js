/// <reference types="cypress" />

describe("Creation of users and groups", function () {
  it("01-Users and impersonate", function () {
    // Create users
    cy.goToUsersPage();
    cy.getTableLength("#table_users").should("eq", 1);

    var first_name = "uf";
    var last_name = "ul";
    var email = "u@e.o";
    var password = "4P99n!vP3c_/kA]3Yv"; // complex password
    cy.createUser(
      first_name + "1",
      last_name + "1",
      email + "A",
      password + "1"
    );
    cy.createUser(
      first_name + "2",
      last_name + "2",
      email + "B",
      password + "2"
    );

    cy.goToUsersPage();
    cy.getTableLength("#table_users").should("eq", 3);

    // Set group rights
    cy.goToGroupsPage();
    var grp_user4 = 9;
    cy.setGroupRight(grp_user4, ["run"], true);

    // Impersonate from drop down
    cy.goToPatientPage();
    cy.get("#db_auth_name").should("contain", "System Administrator");
    cy.get("#desimpersonate_btn").should("not.exist");
    cy.get("#choose_user").select("2", { force: true });
    cy.wait("@getActivities");
    cy.get("#db_auth_name").should("not.exist");

    cy.get("#desimpersonate_btn").should("exist").click();
    cy.wait("@getActivities");
    cy.get("#db_auth_name").should("contain", "System Administrator");

    // Impersonate from users table
    cy.goToUsersPage();

    cy.get("#db_auth_name").should("contain", "System Administrator");
    cy.get("#desimpersonate_btn").should("not.exist");
    cy.get("#impersonate_btn_2").click();
    cy.wait("@getActivities");
    cy.get("#db_auth_name").should("not.exist");
    cy.get('[data-cy="db_div"]').should("contain", " + new patients "); // we should have been redirected to patients page

    cy.get("#desimpersonate_btn").click();
    cy.wait("@getActivities");
    cy.get("#db_auth_name").should("contain", "System Administrator");

    // Owner sets

    var owner_public = "public";
    var owner_user1 = "Personal Group";

    // public shoud not be anon.
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
