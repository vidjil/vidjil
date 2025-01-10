/// <reference types="cypress" />

describe("Manipulate configs", function () {
  it("01-config", function () {
    cy.createConfig(
      "c",
      ["3", "Analysis with/for other software"],
      undefined,
      "x",
      "f",
      "i"
    ).then((config_id) => {
      cy.createPatient("", "airr", "t", "", "Cy", "public");
      cy.addSample(
        undefined,
        "nfs",
        "Demo-X5.airr",
        undefined,
        "2000-01-01",
        "AIRR"
      ).then((sample_id) => {
        cy.log(
          "added sample " +
            sample_id +
            " and start process for config " +
            config_id
        );
        cy.launchProcess("" + config_id, sample_id);
        cy.waitAnalysisCompleted(config_id, sample_id);
      });
    });
  });

  it("02-preprocess_config", function () {
    // Create a preprocess
    var pre_process_name_1 = "d1";
    var pre_process_name_2 = "d2";
    var pre_process_command = "d";
    var pre_process_info = "Cy";
    cy.createPreprocess(
      pre_process_name_1,
      pre_process_command,
      pre_process_info
    ).then((preprocess_id) => {
      // Edit a preprocess
      cy.editPreprocess(
        preprocess_id,
        pre_process_name_2,
        pre_process_command,
        pre_process_info + "; edit"
      );

      // Change permissions for group public (id=3)
      cy.permissionPreprocess(preprocess_id, 3, true);
      cy.permissionPreprocess(preprocess_id, 3, false);

      // Delete preprocess
      cy.deletePreprocess(preprocess_id, pre_process_name_2);
    });
  });
});
