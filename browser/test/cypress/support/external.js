
Cypress.Commands.add('newTabDisabler', (form_id) => { 
  form_id = form_id == undefined ? "#form" : form_id
    cy.get(form_id)
      .then(($a) => {
        $a.attr('target', '_self')
        expect($a).to.have.attr('target','_self')
      })
})
