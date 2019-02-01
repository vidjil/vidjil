load 'vidjil_browser.rb'
load 'server_test.rb'

class TestSampleSet < ServerTest

  def setup
    super
    if not defined? $b
      set_browser("http://localhost/browser")
    end
    login_form = $b.form(:id => 'login_form')
    if login_form.present?
      login_form.text_field(:id => "auth_user_email").set('plop@plop.com')
      login_form.text_field(:id => "auth_user_password").set('foobartest')
      login_form.tr(:id => 'submit_record__row').input(:type => 'submit').click
    end
  end

  def go_to_list
    #$b.a(:class => ["button", "button_token", "patient_token"], :text => "patients").click
    $b.a(:class => "button button_token patient_token", :text => "patients").click
    Watir::Wait.until(timeout: 30) {$b.execute_script("return jQuery.active") == 0}
    table = $b.table(:id => "table")
    table.wait_until(&:present?)
    table
  end

  def test_patient_001_list
    table = go_to_list
    assert(table.tbody.present?)
  end

  def test_patient_add
    table = go_to_list

    count = table.tbody.rows.count

    # go to form
    $b.span(:class => "button2", :text => "+ new patients").click
    form = $b.form(:id => "object_form")
    form.wait_until(&:present?)

    assert($b.select(:id => "group_select").present?)

    # add more elements to form
    for i in 0..4 do
      $b.span(:id => "patient_button").click

      # Delete a line to ensure robustness
      if i == 2
        l = $b.span(:text => "Patient %d" % (i+2)).parent
        l.i(:class => "icon-cancel").click
      end
    end

    # fill in form
    for i in 0..4 do
      if i > 2
        k = i+1
      else
        k = i
      end
      form.text_field(:id => "patient_id_label_%d" % k).set("test_label %d" % k)
      form.text_field(:id => "patient_first_name_%d"% k).set("first %d" % k)
      form.text_field(:id => "patient_last_name_%d" % k).set("last %d" % k)
      form.text_field(:id => "patient_birth_%d" % k).set("2010-10-10")
      form.text_field(:id => "patient_info_%d" % k).set("patient %d #test #mytag%d" % [k, k])
    end

    form.input(:type => "submit").click

    # ensure patients were added
    table.wait_until(&:present?)
    lines = table.tbody.rows
    assert(lines.count == count + 5)
    lines.each do |line|
      #assert(line.cell(:index => 1).text.match("first %d last %d" % [i, i]))
      assert(line.cell(:index => 2).text == "2010-10-10")
      #assert(line.cell(:index => 3).text == "patient %d #test" % i)
    end
  end

  def test_patient_edit
    table = go_to_list

    # click edit button for first line in table
    line = table.td(:text => /test patient 3/).parent
    sample_set_id = line.td(:class => "uid").text
    line.i(:class => "icon-pencil-2").click
    form = $b.form(:id => "object_form")
    form.wait_until(&:present?)

    # check form data
    info = form.text_field(:id => "patient_info_0")
    assert(form.text_field(:id => "patient_id_label_0").value == "")
    assert(form.text_field(:id => "patient_first_name_0").value == "patient")
    assert(form.text_field(:id => "patient_last_name_0").value == "3")
    assert(form.text_field(:id => "patient_birth_0").value == "2010-10-10")
    assert(info.value == "test patient 3 #test3")

    info.set("#edited")

    form.input(:type => "submit").click
    Watir::Wait.until(timeout: 30) {$b.execute_script("return jQuery.active") == 0}
    table = $b.table(:id => 'table')
    table.wait_until(&:present?)
    table = go_to_list
    line = table.td(:class => "uid", :text => sample_set_id).parent
    assert(line.cell(:index => 3).text == "#edited")
  end

  def test_patient_delete
    table = go_to_list

    count = table.tbody.rows.count
    # click delete button for first line in table
    line = table.td(:text => /test patient 4/).parent
    line.i(:class => "icon-erase").click

    delete_button = $b.button(:text => "delete")
    delete_button.wait_until(&:present?)
    delete_button.click

    table.wait_until(&:present?)
    lines = table.tbody.rows
    assert(lines.count == count-1)
  end

  def test_patient_search
    table = go_to_list

    filter = $b.text_field(:id => "db_filter_input")
    filter.wait_until(&:present?)
    filter.set('test1')

    filter.fire_event('onchange')
    Watir::Wait.until(timeout: 30) {$b.execute_script("return jQuery.active") == 0}
    table = $b.table(:id => 'table')
    lines = table.tbody.rows
    assert(lines.count == 1)
  end

=begin
  def test_patient_autocomplete
    table = go_to_list

    $b.execute_script("new VidjilAutoComplete().clearCache()")
    filter = $b.text_field(:id => "db_filter_input")
    filter.set('#myt')
    sleep(2)
    autocomplete = $b.div(:id => 'at-view-tags')
    puts autocomplete.html
    autocomplete.wait_until(&:present?)
    assert(autocomplete.present?)
    puts autcomplete.ul.count
    assert(autocomplete.ul.count == 5)
  end
=end
end
