/// <reference types="cypress" />

describe("Manipulate configs", function () {
  //   it("01-config", function () {
  //     var config_name = "cy";
  //     var config_class = ["3", "Analysis with/for other software"];
  //     var config_soft = undefined;
  //     var config_cmd = "x";
  //     var config_fuse = "f";
  //     var config_info = "inf";
  //     cy.createConfig(
  //       config_name,
  //       config_class,
  //       config_soft,
  //       config_cmd,
  //       config_fuse,
  //       config_info
  //     ).then((config_row) => {
  //       var config_id = config_row[0].cells[0].innerText;
  //       cy.log("config_id: " + config_id);
  //       cy.createPatient(
  //         "",
  //         "cairr",
  //         "t",
  //         "2000-01-01",
  //         "Cy",
  //         "public"
  //       );
  //         cy.addSample(
  //           undefined,
  //           "nfs",
  //           "Demo-X5.airr",
  //           undefined,
  //           "2000-01-01",
  //           "AIRR"
  //         ).then((sample_id) => {
  //           cy.log(
  //             "added sample " +
  //               sample_id +
  //               " and start process for config " +
  //               config_id
  //           );
  //           cy.launchProcess("" + config_id, sample_id);
  //           cy.waitAnalysisCompleted(config_id, sample_id);
  //         });
  //     });
  //   });

  it("02-preprocess_config", function () {
    // Create a preprocess (with id == 2)
    var pre_process_name_1 = "d1";
    var pre_process_name_2 = "d2";
    var pre_process_command = "d";
    var pre_process_info = "Cy";
    cy.createPreprocess(
      pre_process_name_1,
      pre_process_command,
      pre_process_info
    ); // n°6
    cy.createPreprocess(
      pre_process_name_2,
      pre_process_command,
      pre_process_info
    ); // n°7

    // Edit a preprocess
    cy.editPreprocess(
      1,
      pre_process_name_1,
      pre_process_command,
      pre_process_info + "; edit"
    ); // n°1

    // Change permissions for group public (id=3)
    cy.permissionPreprocess(2, 3, true);
    cy.permissionPreprocess(2, 3, false);

    // Delete a preprocess
    cy.deletePreprocess(7, pre_process_name_2); // second cypress created preprocess
  });
});
