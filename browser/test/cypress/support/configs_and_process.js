/**
 * Create a configuration and fill its info
 */
Cypress.Commands.add(
  "createConfig",
  (
    config_name,
    config_class,
    config_soft,
    config_cmd,
    config_fuse,
    config_info
  ) => {
    cy.goToConfigsPage();

    cy.get("#new_config_btn").should("contain", " + new config").click();
    cy.wait("@getActivities");

    cy.fillConfig(
      config_name,
      config_class[0],
      config_soft,
      config_cmd,
      config_fuse,
      config_info
    );

    cy.get("#add_config_submit").click();
    cy.wait("@getActivities");

    cy.getBiggestId("#table_configs").then((config_id) => {
      cy.log("Created config id " + config_id);

      cy.get("#config_name_" + config_id).should("contain", config_name);
      cy.get("#config_classification_" + config_id).should(
        "contain",
        config_class[1]
      );
      cy.get("#config_program_" + config_id).should(
        "contain",
        config_soft == undefined ? "none" : config_soft
      );
      cy.get("#config_command_" + config_id).should("contain", config_cmd);
      cy.get("#config_fuse_command_" + config_id).should(
        "contain",
        config_fuse
      );
      cy.get("#config_info_" + config_id).should("contain", config_info);

      return cy.wrap(config_id);
    });
  }
);

Cypress.Commands.add(
  "fillConfig",
  (
    config_name,
    config_class,
    config_soft,
    config_cmd,
    config_fuse,
    config_info
  ) => {
    cy.get("#config_name").type(config_name);
    if (config_class != undefined) {
      cy.get("#config_classification")
        .select(config_class, { force: true })
        .should("have.value", config_class);
    }

    if (config_soft != undefined) {
      cy.get("#config_program")
        .select(config_soft, { force: true })
        .should("have.value", config_soft);
    }

    cy.get("#config_command").type(config_cmd);
    cy.get("#config_fuse_command").type(config_fuse);
    cy.get("#config_info").type(config_info);
  }
);

/**
 * Create a preprocess configuration and fill it information
 */
Cypress.Commands.add(
  "createPreprocess",
  (config_name, config_cmd, config_info) => {
    cy.goToPreprocessPage();

    cy.get("#new_preprocess_btn")
      .should("contain", " + new pre-process")
      .click({ force: true });
    cy.wait("@getActivities");

    cy.fillPreprocess(config_name, config_cmd, config_info);

    cy.get("#add_preprocess_submit").click();
    cy.wait("@getActivities");

    cy.getBiggestId("#table").then((preprocess_id) => {
        cy.log("Created preprocess id " + preprocess_id);

        cy.controlPreprocess(
          preprocess_id,
          config_name,
          config_cmd,
          config_info
        );

        return cy.wrap(preprocess_id);
      });
  }
);

/**
 * Control preprocess value for a given id
 */
Cypress.Commands.add(
  "controlPreprocess",
  (expected_id, config_name, config_cmd, config_info) => {
    cy.get("#preprocess_name_" + expected_id).should("contain", config_name);
    cy.get("#preprocess_command_" + expected_id).should("contain", config_cmd);
    cy.get("#preprocess_info_" + expected_id).should("contain", config_info);
  }
);

/**
 * Edit a preprocess and control values
 */
Cypress.Commands.add(
  "editPreprocess",
  (id, config_name, config_cmd, config_info) => {
    cy.goToPreprocessPage();

    cy.get("#preprocess_edit_" + id).click();
    cy.wait("@getActivities");

    cy.fillPreprocess(config_name, config_cmd, config_info);

    cy.get("#preprocess_update_submit").click();
    cy.wait("@getActivities");

    cy.controlPreprocess(id, config_name, config_cmd, config_info);
  }
);

/**
 * Fill a preprocess form
 */
Cypress.Commands.add(
  "fillPreprocess",
  (config_name, config_cmd, config_info) => {
    cy.get("#pre_process_name").clear().type(config_name);
    cy.get("#pre_process_command").clear().type(config_cmd);
    cy.get("#pre_process_info").clear().type(config_info);
  }
);

/**
 * Delete a preprocess by its id
 */
Cypress.Commands.add("deletePreprocess", (id, config_name) => {
  cy.goToPreprocessPage();

  cy.get("#preprocess_delete_" + id).click();
  cy.wait("@getActivities");

  cy.get("#preprocess_name").should("contain", config_name);
  cy.get("#delete_preprocess_confirm_btn").click();
  cy.wait("@getActivities");
  
  cy.get("#preprocess_line_" + id).should("not.exist");
});

/**
 * Set a permission on a preprocess to a group
 */
Cypress.Commands.add("permissionPreprocess", (id, group_id, value) => {
  cy.goToPreprocessPage();

  cy.get("#preprocess_permission_" + id).click();
  cy.wait("@getActivities");

  if (value == true) {
    cy.get("#permission_checkbox_" + group_id)
      .should("not.be.checked")
      .check()
      .should("be.checked");

    cy.goToPreprocessPage();

    cy.get("#preprocess_permission_" + id).click();
    cy.wait("@getActivities");

    cy.get("#permission_checkbox_" + group_id).should("be.checked");
  } else if (value == false) {
    cy.get("#permission_checkbox_" + group_id)
      .should("be.checked")
      .uncheck()
      .should("not.be.checked");

    cy.goToPreprocessPage();

    cy.get("#preprocess_permission_" + id).click();
    cy.wait("@getActivities");

    cy.get("#permission_checkbox_" + group_id).should("not.be.checked");
  }
});
