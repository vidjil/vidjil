load 'vidjil_browser.rb'
load 'server_test.rb'

class TestSample < ServerTest

  def setup
    super
    if not defined? $b
      set_browser("http://localhost/browser")
      $num_additional_files = 2
    end
    login_form = $b.form(:id => 'login_form')
    if login_form.present?
      login_form.text_field(:id => "auth_user_email").set('plop@plop.com')
      login_form.text_field(:id => "auth_user_password").set('foobartest')
      login_form.tr(:id => 'submit_record__row').input(:type => 'submit').click
    end
  end

  def go_to_first_set
    go_to_set 0
  end

  def go_to_patient_list
    # load patient list
    $b.a(:class => ["button", "button_token", "patient_token"], :text => "patients").click
    Watir::Wait.until(timeout: 30) {$b.execute_script("return jQuery.active") == 0}
    table = $b.table(:id => "table")
    table.wait_until(&:present?)
    table
  end

  def go_to_set(index)
    table = go_to_patient_list
    lines = table.tbody.rows
    lines[index].wait_until(&:present?)
    # select first patient
    lines[index].td(:index => 0).click
    Watir::Wait.until(timeout: 30) {$b.execute_script("return jQuery.active") == 0}
    # check that list of samples is loaded
    table = $b.table(:id => "table")
    table.wait_until(&:present?)
    table
  end

  def go_to_set_by_tag(tag)
    table = go_to_patient_list

    table.a(:text => tag).parent.parent.td(:class => 'uid').click
    Watir::Wait.until(timeout: 30) {$b.execute_script("return jQuery.active") == 0}
    samples_table = $b.table(:id => "table")
    samples_table.wait_until(&:present?)
    samples_table
  end

  def test_add
    table = go_to_set_by_tag "#test4"

    count = table.tbody.rows.count

    add_button = $b.span(:text => "+ add samples")
    add_button.wait_until(&:present?)
    add_button.click
    form = $b.form(:id => "upload_form")
    form.wait_until(&:present?)

    $b.input(:id => "source_nfs").click

    file_button = $b.span(:id => "file_button")
    for i in 0..$num_additional_files-1
      file_button.click
    end

    jstree = $b.div(:id => "jstree")
    for i in 0..$num_additional_files
      $b.div(:id => "jstree_field_%d" % i).span(:text => "browse").click
      assert(jstree.present?)
      jstree_file = jstree.a(:id => "//Demo-X5.fa_anchor")
      unless jstree_file.present? and jstree_file.present?
        jstree.a(:id => "/_anchor").double_click
      end
      jstree_file.wait_until(&:present?)
      jstree_file.click

      $b.span(:id => "jstree_button").click
      assert(!jstree.present?)

      form.text_field(:id => "file_sampling_date_%d" % i).set("2010-10-10")
      form.text_field(:id => "file_info_%d" % i).set("#my_file_%d" % i)
      # TODO test other sets
    end
    form.input(:type => "submit").click

    table = $b.table(:id => "table")
    table.wait_until(&:present?)

    lines = table.tbody.rows
    assert(lines.count == count + $num_additional_files + 1)
  end

  def test_edit
    table = go_to_set_by_tag "#test3"

    lines = table.tbody.rows
    lines[0].wait_until(&:present?)
    cell = lines[0].td(:class => "pointer")
    cell.i(:class => "icon-pencil-2").click
    form = $b.form(:id => "upload_form")
    form.wait_until(&:present?)
    form.text_field(:id => "file_info_0").set("#edited")
    form.input(:type => "submit").click


    table = $b.table(:id => "table")
    table.wait_until(&:present?)

    Watir::Wait.until(timeout: 30) {$b.execute_script("return jQuery.active") == 0}

    lines = table.tbody.rows
    lines[2].wait_until(&:present?)
    assert($b.link(:text => "#edited").present?)
  end

  def test_set_association_preservation
    samples_table = go_to_set_by_tag "#set_assoc_1"
    samples_table.a(:text => "#set_assoc_1").parent.parent.i(:class => "icon-pencil-2").click
    Watir::Wait.until(timeout: 30) {$b.execute_script("return jQuery.active") == 0}

    form = $b.form(:id => "upload_form")
    form.wait_until(&:present?)

    assert(form.div(:id => 'set_div').spans.length == 3)
    sets_text = form.input(:id => "file_set_list").text

    form.text_field(:id => "file_info_0").set("#set_assoc_1 #edited")
    form.input(:type => "submit").click
    Watir::Wait.until(timeout: 30) {$b.execute_script("return jQuery.active") == 0}

    samples_table.a(:text => "#set_assoc_1").parent.parent.i(:class => "icon-pencil-2").click
    Watir::Wait.until(timeout: 30) {$b.execute_script("return jQuery.active") == 0}
    form = $b.form(:id => "upload_form")
    form.wait_until(&:present?)

    assert(form.div(:id => 'set_div').spans.length == 3)
    assert(sets_text == form.input(:id => "file_set_list").text)
  end

  def test_set_association_create
    $b.a(:class => ["button", "button_token", "patient_token"], :text => "patients").click
    Watir::Wait.until(timeout: 30) {$b.execute_script("return jQuery.active") == 0}
    table = $b.table(:id => "table")
    table.wait_until(&:present?)

    patient_id = table.a(:text => "#set_assoc_0").parent.parent.td(:class => 'uid').text

    $b.a(:class => ["button", "button_token", "run_token"], :text => "runs").click
    Watir::Wait.until(timeout: 30) {$b.execute_script("return jQuery.active") == 0}
    table = $b.table(:id => "table")
    table.wait_until(&:present?)

    run_id = table.a(:text => "#set_assoc_0").parent.parent.td(:class => 'uid').text

    $b.a(:class => ["button", "button_token", "generic_token"], :text => "sets").click
    Watir::Wait.until(timeout: 30) {$b.execute_script("return jQuery.active") == 0}
    table = $b.table(:id => "table")
    table.wait_until(&:present?)

    set_id = table.a(:text => "#set_assoc_0").parent.parent.td(:class => 'uid').text

    samples_table = go_to_set_by_tag "#set_assoc_0"
    $b.span(:class => "button2", :text => "+ add samples").click
    Watir::Wait.until(timeout: 30) {$b.execute_script("return jQuery.active") == 0}

    form = $b.form(:id => "upload_form")
    form.wait_until(&:present?)

    $b.input(:id => "source_nfs").click

    jstree = $b.div(:id => "jstree")
    $b.div(:id => "jstree_field_0").span(:text => "browse").click
    assert(jstree.present?)
    jstree_file = jstree.a(:id => "//Demo-X5.fa_anchor")
    unless jstree_file.present? and jstree_file.present?
      jstree.a(:id => "/_anchor").double_click
    end
    jstree_file.wait_until(&:present?)
    jstree_file.click

    $b.span(:id => "jstree_button").click
    assert(!jstree.present?)

    form.text_field(:id => "file_sampling_date_0").set("2010-10-10")
    form.text_field(:id => "file_info_0").set("#my_file_add")

    val = ":p 0 (2010-10-10) (#{patient_id})|:r run 0 (#{run_id})|:s generic 0 (#{set_id})"
    $b.execute_script("return $('#file_set_list').val('#{val}');")

    form.input(:type => "submit").click

    samples_table = $b.table(:id => "table")
    samples_table.wait_until(&:present?)
    samples_table.a(:text => "#set_assoc_0").parent.parent.i(:class => "icon-pencil-2").click

    form = $b.form(:id => "upload_form")
    form.wait_until(&:present?)
    set_div = form.div(:id => 'set_div')
    assert(set_div.spans.length == 3)
  end

  def test_set_association_update
    samples_table = go_to_set_by_tag "#set_assoc_2"
    samples_table.a(:text => "#set_assoc_2").parent.parent.i(:class => "icon-pencil-2").click
    Watir::Wait.until(timeout: 30) {$b.execute_script("return jQuery.active") == 0}

    form = $b.form(:id => "upload_form")
    form.wait_until(&:present?)

    set_div = form.div(:id => 'set_div')
    assert(set_div.spans.length == 3)

    set_div.spans[1].i(:class => "icon-cancel").click
    form.input(:type => "submit").click

    Watir::Wait.until(timeout: 30) {$b.execute_script("return jQuery.active") == 0}
    samples_table = $b.table(:id => "table")
    samples_table.wait_until(&:present?)
    samples_table.a(:text => "#set_assoc_2").parent.parent.i(:class => "icon-pencil-2").click
    Watir::Wait.until(timeout: 30) {$b.execute_script("return jQuery.active") == 0}

    form = $b.form(:id => "upload_form")
    form.wait_until(&:present?)
    set_div = form.div(:id => 'set_div')
    assert(set_div.spans.length == 2)
  end

  def test_delete
    table = go_to_set_by_tag "#test2"

    count = table.tbody.rows.count

    lines = table.tbody.rows
    lines[0].wait_until(&:present?)
    mcell = lines[0].cells(:class => "pointer")
    mcell.each do |c|
      del = c.i(:class => "icon-erase")
      if del.present?
        del.click
        break
      end
    end

    Watir::Wait.until(timeout: 30) {$b.execute_script("return jQuery.active") == 0}

    button = $b.button(:text => "delete sequence and results")
    button.wait_until(&:present?)
    button.click

    Watir::Wait.until(timeout: 30) {$b.execute_script("return jQuery.active") == 0}

    table = $b.table(:id => "table")
    table.wait_until(&:present?)
    assert(table.tbody.rows.count == count-1)
  end

  def test_run
    table = go_to_set_by_tag "#set_assoc_0"

    config_list = $b.select_list(:id => "choose_config")
    assert ( config_list.optgroup(:label => "Vidjil-algo").exist? ), "optgroup is present in configlist"

    config_list.select("2")
    Watir::Wait.until(timeout: 30) {$b.execute_script("return jQuery.active") == 0}

    samples_table = $b.table(:id => "table")
    samples_table.wait_until(&:present?)
    lines = samples_table.tbody.rows
    lines[0].wait_until(&:present?)
    lines[0].i(:class => "icon-cog-2").click
    Watir::Wait.until(timeout: 30) {$b.execute_script("return jQuery.active") == 0}

    table = $b.table(:id => "table")
    table.wait_until(&:present?)
    lines = table.tbody.rows
    lines[0].wait_until(&:present?)
    l = lines[0]
    assert(l.td(:text => "QUEUED").present? || l.td(:text => "ASSIGNED").present? || l.td(:text => "COMPLETED").present?)
  end
end
