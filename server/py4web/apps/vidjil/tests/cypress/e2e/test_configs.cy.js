/// <reference types="cypress" />

describe("Manipulate configs", function () {
  it("01-process-config", function () {
    cy.createConfig(
      "conf name",
      ["3", "Analysis with/for other software"],
      undefined,
      "x",
      "",
      "fuse",
      "info"
    ).then((config_id) => {
      cy.screenshot("starting_configuration")
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
      cy.addSample(
        undefined,
        "nfs",
        "Demo-X5.vidjil.gz",
        undefined,
        "2000-01-01",
        "Demo-X5.fa sample, already compressed"
      ).then((sample_id) => {
        cy.log(
          "added vidjil compressed sample " +
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
    const preProcessName1 = "d1";
    const preProcessName2 = "d2";
    const preProcessCommand = "d";
    const preProcessInfo = "Cy";
    cy.createPreprocess(
      preProcessName1,
      preProcessCommand,
      preProcessInfo
    ).then((preprocess_id) => {
      // Edit a preprocess
      cy.editPreprocess(
        preprocess_id,
        preProcessName2,
        preProcessCommand,
        preProcessInfo + "; edit"
      );

      // Change permissions for group public (id=3)
      cy.permissionPreprocess(preprocess_id, 3, true);
      cy.permissionPreprocess(preprocess_id, 3, false);

      // Delete preprocess
      cy.deletePreprocess(preprocess_id, preProcessName2);
    });
  });

  it("03-clipboard-copy-config", function () {
    if ((Cypress.browser.name === "chromium") && (parseInt(Cypress.browser.version.split(".")[0]) >= 81)) {
      cy.wrap(Cypress.automation('remote:debugger:protocol', {
        command: 'Browser.grantPermissions',
        params: {
          permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
          origin: window.location.origin,
        },
      }))

      // Copy process config to clipboard and apply it to a new config
      cy.goToConfigsPage();
      cy.get('#copyToClipboard_process_2 > .icon-newspaper')
        .click()
        .then(() => {
          // check flash message is displayed
          cy.get(".flash_1").should("be.visible").contains("Copied");

          // check that the path is copied to clipboard
          cy.window().then((win) => {
            win.navigator.clipboard.readText().then((text) => {
              const decodedText = decodeURIComponent(text)
              expect(decodedText).to.contain('"program": "vidjil",');
              expect(decodedText).to.contain('"classification": "1",');
              expect(decodedText).to.contain('"name": "multi+inc+xxx",');
              expect(decodedText).to.contain('"command": "-c clones -z 100 -r 1 -g germline/homo-sapiens.g -e 1 -2 -d -w 50 ",');
              expect(decodedText).to.contain('"fuse_command": "-t 100",');
              expect(decodedText).to.contain('"info": "multi-locus, with some incomplete/unusual/unexpected recombinations"');
            });
          });
        });
      cy.get('#new_config_btn')
        .click()
      cy.get('#fillProcessConfigFormFromClipboard')
        .click()
      cy.get('#config_name').should('have.value',"multi+inc+xxx");
      cy.get('#config_classification').should('have.value',"1");
      cy.get('#config_program').should('have.value',"vidjil");
      cy.get('#config_command').should('have.value',"-c clones -z 100 -r 1 -g germline/homo-sapiens.g -e 1 -2 -d -w 50 ");
      cy.get('#config_fuse_command').should('have.value',"-t 100");
      cy.get('#config_info').should('have.value',"multi-locus, with some incomplete/unusual/unexpected recombinations");


      // Copy pre-process config to clipboard and apply it to a new config
      cy.goToPreprocessPage();
      cy.get('#copyToClipboard_preprocess_1 > .icon-newspaper')
        .click()
        .then(() => {
          // check flash message is displayed
          cy.get(".flash_1").should("be.visible").contains("Copied");

          // check that the path is copied to clipboard
          cy.window().then((win) => {
            win.navigator.clipboard.readText().then((text) => {
              const decodedText = decodeURIComponent(text)
              expect(decodedText).to.contain('"name": "public pre-process",');
              expect(decodedText).to.contain('"command": "cat &file1& &file2& > &result&",');
              expect(decodedText).to.contain('"info": "concatenate two files"');
            });
          });
        });
      cy.get('#new_preprocess_btn')
        .click()
      cy.get('#fillPreprocessConfigFormFromClipboard')
        .click()
      cy.get('#pre_process_name').should('have.value',"public pre-process");
      cy.get('#pre_process_command').should('have.value',"cat &file1& &file2& > &result&");
      cy.get('#pre_process_info').should('have.value',"concatenate two files");
    }
  });

  it("5535-use-gz-output", function () {
    cy.createConfig(
      "compress_output",
      ["3", "Analysis with/for other software"],
      "vidjil",
      "-c clones -z 10 -r 1 -g germline/homo-sapiens.g -e 1 -2 -d -w 50 -y 1000 --no-airr -uu --gz",
      "",
      "-t 10",
      "information of process with compressed output (--gz)"
    ).then((config_id) => {
      cy.createPatient("", "compressed_output", "test", "", "Cy", "public");
      cy.addSample(
        undefined,
        "nfs",
        "Demo-X5.fa",
        undefined,
        "2000-01-01",
        "Demo-X5.fa sample"
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


  it("Use a prefuse config (old style)", function () {
    cy.createConfig(
      "conf with prefuse old style",
      ["3", "Analysis with/for other software"],
      "vidjil",
      "-c clones -z 10 -r 1 -g germline/homo-sapiens.g -e 1 -2 -d -w 50 -y 1000 --no-airr",
      "",
      "-t 10  --post 'igh-to-trg.sh -l IGK && script_a.py'",
      "information of process with compressed output (--gz)"
    ).then((config_id) => {
      cy.createPatient("", "prefuse config (old style)", "test", "", "Cy", "public");
      cy.addSample(
        undefined,
        "nfs",
        "Demo-X5.fa",
        undefined,
        "2000-01-01",
        "Demo-X5.fa sample"
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

  it("Use a prefuse config (new style)", function () {
    cy.createConfig(
      "conf with prefuse new style",
      ["3", "Analysis with/for other software"],
      "vidjil",
      "-c clones -z 10 -r 1 -g germline/homo-sapiens.g -e 1 -2 -d -w 50 -y 1000 --no-airr",
      "script_a.py",
      "-t 10",
      "information of process with compressed output (--gz)"
    ).then((config_id) => {
      cy.createPatient("", "prefuse config (new style)", "test", "", "Cy", "public");
      cy.addSample(
        undefined,
        "nfs",
        "Demo-X5.fa",
        undefined,
        "2000-01-01",
        "Demo-X5.fa sample"
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

});