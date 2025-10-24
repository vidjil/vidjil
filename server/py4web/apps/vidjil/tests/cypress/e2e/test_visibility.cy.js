/// <reference types="cypress" />
// Should we keep these tests ? 
describe('Visibility of panels', function () {
  it('01-visibility of panels', function () {
    // Test visibility of some panel and z-index
    cy.goToPatientPage()
    cy.get('.db_div').should("be.visible")
    cy.newSet('patient')
    cy.get('.db_div').should("be.visible")
    cy.get('#patient_clipboard > .icon-newspaper').click()
    cy.get('.popup_container').should("be.visible")

    cy.get('.popup_container > .closeButton > .icon-cancel').click()
    cy.get('.popup_container').should("not.be.visible")
    cy.get('.db_div > .closeButton > .icon-cancel').click()
    cy.get('.db_div').should("not.be.visible")

    cy.get('#file_menu').should("not.be.visible")
    cy.get('#import_data_anchor').click({ force: true })
    cy.get('#file_menu').should("be.visible")

    cy.openAnalysis("browser/test/data/demo_lil_l3_0.vidjil", undefined, 90000)
    cy.get('#file_menu').should("not.be.visible")

    cy.get('.info-container').should("not.be.visible")
    cy.openCloneInfo('1')
    cy.get('.info-container').should("be.visible")

    cy.openDBPage()
    cy.get('.db_div').should("be.visible")
    cy.get('.info-container').should("not.be.visible")
  })

  it('02-title in db table (#4494)', function () {
    cy.goToPatientPage()

    cy.get('#sample_set_open_22_config_id_-1 > :nth-child(3) > .set_token')
      .should("have.attr", "title")
      .and("equal", "2 patient (22)")

    cy.get('#sample_set_open_22_config_id_-1 > :nth-child(5) > span')
      .should("have.attr", "title")
      .and("equal", "set association test #set_assoc_2")

    cy.get('#result_sample_set_13_config_1')
      .should("have.attr", "title")
      .and("equal", "Display results for config default + extract reads")

    cy.openSet(22) // patient 

    cy.get('#sequence_file_48')
      .should("have.attr", "title").and("equal", "test_file.fasta")

    cy.get('[title="#set_assoc_2"]') // if getter work

    cy.goToConfigsPage()
    cy.get('#config_classification_7')
      .should("have.attr", "title").and("equal", "Human V(D)J recombinations")
    cy.get('#config_command_7')
      .should("have.attr", "title").and("equal", "-c clones -z 100 -r 1 -g germline/homo-sapiens.g -e 1 -2 -w 90 -y all --no-airr")
    cy.get('#config_fuse_command_7')
      .should("have.attr", "title").and("equal", "-t 100 -d lenSeqAverage --overlaps")
    cy.get('#config_info_7')
      .should("have.attr", "title").and("equal", "incomplete germlines + larger window (90bp), thus 20bp more on each side. This configuration is advised for studies on IGH clonality")

    cy.goToPreprocessPage()
    cy.get('#preprocess_name_4')
      .should("have.attr", "title").and("equal", "test pre-process 2")
    cy.get('#preprocess_command_4')
      .should("have.attr", "title").and("equal", "dummy &file1& &file2& > &result&")
    cy.get('#preprocess_info_4')
      .should("have.attr", "title").and("equal", "test 2")
  })


  it('03-name of custom fuse (issue #5205), direct button', function () {
    cy.goToPatientPage()

    const fname = "fname"
    const lname = "lname"
    const runname = "run_name"
    const preprocess = undefined;
    const filename1 = "Demo-X5-no-clone.vidjil";
    const filename2 = undefined;
    const samplingDate = "2021-01-01";
    const sampleInformation1 = "info of sample1";


    cy.createPatient("", fname, lname, "", "c", "public")
      .then((patientId) => {

        cy.addSample(
          preprocess,
          "nfs",
          filename1,
          filename2,
          samplingDate,
          sampleInformation1
        ).then((sampleId) => {
          cy.log("added sample " + sampleId);

          // Launch process and wait for result, as vidjil import, should be instant
          const configId = "9";
          cy.launchProcess(configId, sampleId);
          cy.waitAnalysisCompleted(configId, sampleId);

          cy.get(`#open_sample_result_${sampleId} > .icon-export`)
            .click()

          cy.get(`a#open_sample_result_${sampleId}`)
            .invoke('attr', 'href')
            .then((href) => {
              const urlParams = new URLSearchParams(href.split('?')[1]);
              const result_id = urlParams.get('custom');
              cy.log('Result Id :', result_id); // Affiche "100"

              // f"set {name}; sequence file: {filename} ({sequence_file_id}); result file: {id}";
              cy.get('#top_info') // as anon_ids is called, we used pateintId in sample set name
                .should("contain", `${filename1.split(".vidjil")[0]}`)
                .should("contain", `( .vidjil/`) // config name
                .should("not.contain", `${lname} ${fname} (${patientId})`)

              cy.get('#patient_info_text')
                .should("contain", `${filename1}`)
                .should("contain", `( .vidjil/`) // config name
                .should("contain", `${lname} ${fname} (${patientId})`)
            })

        })
      })


    cy.createRun("", runname, "2025-01-01", "info", "public")
      .then((runId) => {

        cy.addSample(
          preprocess,
          "nfs",
          filename1,
          filename2,
          samplingDate,
          sampleInformation1
        ).then((sampleId) => {
          cy.log("added sample " + sampleId);

          // Launch process and wait for result, as vidjil import, should be instant
          const configId = "9";
          cy.launchProcess(configId, sampleId);
          cy.waitAnalysisCompleted(configId, sampleId);

          cy.get(`#open_sample_result_${sampleId} > .icon-export`)
            .click()

          cy.get(`a#open_sample_result_${sampleId}`)
            .invoke('attr', 'href')
            .then((href) => {
              const urlParams = new URLSearchParams(href.split('?')[1]);
              const result_id = urlParams.get('custom');
              cy.log('Result Id :', result_id); // Affiche "100"

              // f"set {name}; sequence file: {filename} ({sequence_file_id}); result file: {id}";
              cy.get('#top_info') // as anon_ids is not called, we don't used pateintId in sample set name
                .should("contain", `${filename1.split(".vidjil")[0]}`)
                .should("contain", `( .vidjil/`) // config name
                .should("not.contain", `${runname} (${runId})`)

              cy.get('#patient_info_text')
                .should("contain", `${filename1.split(".vidjil")[0]}`)
                .should("contain", `( .vidjil/.clntab )`) // config name
                .should("contain", `${runname}`)
            })

        })
      })
  })


  it('04-name of custom fuse (issue #5205), multiple sample, compare view', function () {
    cy.goToPatientPage()

    const fname = "fname"
    const lname = "lname"
    const runname = "run_name"
    const preprocess = undefined;
    const filename1 = "Demo-X5-no-clone.vidjil";
    const filename2 = undefined;
    const samplingDate = "2021-01-01";
    const sampleInformation = "c #cy";
    const configId = "9";

    const sampleInformation1 = "info of sample1";
    const sampleInformation2 = "info of sample2";

    cy.createPatient("", fname, lname, "", "c", "public")
      .then((patientId) => {

        cy.addSample(
          preprocess,
          "nfs",
          filename1,
          filename2,
          samplingDate,
          sampleInformation1
        ).then((sampleId1) => {
          cy.log("added sample 1: " + 1);

          
          // Add a second sample
          cy.addSample(
            preprocess,
            "nfs",
            filename1,
            filename2,
            samplingDate,
            sampleInformation2
          ).then((sampleId2) => {
            cy.log("added sample 2: " + sampleId2);
            
            // Launch process and wait for result, as vidjil import, should be instant
            cy.launchProcess(configId, sampleId1);
            cy.get('#launch_all_unanalyzed_samples_9 > .icon-cog-2')
            .click()

            cy.waitAnalysisCompleted(configId, sampleId1);
            cy.waitAnalysisCompleted(configId, sampleId2);

            cy.get(`[onclick="db.call('sample_set/custom', {'id': '${patientId}', 'filter': ''} )"]`)
              .click()

            cy.get('#db_fixed_header > thead > tr > .column_20 > .checkbox_all')
              .click()

            cy.get(`[onclick="myUrl.loadCustomUrl(db, {'sample_set_id':${patientId} })"]`)
              .click({force: true})

            cy.get('#top_info')
              .should("contain", `Compare 2 samples from set ${lname} ${fname} (${patientId})`)
            
            cy.get('#patient_info_text')
              .should("contain", `Custom: Compare 2 samples from set ${lname} ${fname} (${patientId})`)

            cy.get('#time0')
              .click()
              .should("contain", `${filename1} ( .vidjil/.clntab )`)
              
            cy.get('#time1')
              .click()
              .should("contain", `${filename1} ( .vidjil/.clntab )`)

          })
        })
      })
  })

})
