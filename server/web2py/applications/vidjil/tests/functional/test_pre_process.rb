load 'vidjil_browser.rb'
load 'server_test.rb'

class TestPreProcess < ServerTest

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
      Watir::Wait.until(30) {$b.execute_script("return jQuery.active") == 0}
    end
  end

  def go_to_list
    $b.a(:class => "button", :text => "pre-process").click
    Watir::Wait.until(30) {$b.execute_script("return jQuery.active") == 0}
    table = $b.table(:id => "table")
    table.wait_until_present
    table
  end

  def test_pre_process_001_list
    table = go_to_list

    assert(table.tbody.present?)
  end

  def test_pre_process_add
    table = go_to_list
    count = table.tbody.rows.count

    # go to form
    $b.span(:class => "button2", :text => "+ new pre-process").click
    form = $b.form(:id => "data_form")
    form.wait_until_present

    form.text_field(:id => "pre_process_name").set('dummy')
    form.textarea(:id => "pre_process_command").set('dummy &file1& &file2& > &result&')
    form.textarea(:id => "pre_process_name").set('dummy pre-process for testing purposes')
    form.input(:type => "submit").click

    Watir::Wait.until(30) {$b.execute_script("return jQuery.active") == 0}
    table = $b.table(:id => "table")
    table.wait_until_present
    lines = table.tbody.rows
    assert(lines.count == count+1)
  end

  def test_pre_process_edit
    table = go_to_list

    line = table.td(:text => "test pre-process 0").parent
    uid = line.td(:index => 0).text
    line.i(:class => "icon-pencil-2").click

    form = $b.form(:id => "data_form")
    form.wait_until_present
    info = form.textarea(:id => "pre_process_info")
    assert(form.text_field(:id => "pre_process_name").value == "test pre-process 0")
    assert(form.textarea(:id => "pre_process_command").value == "dummy &file1& &file2& > &result&")
    assert(info.value == "test 0")

    info.set("edited")

    form.input(:type => "submit").click
    Watir::Wait.until(30) {$b.execute_script("return jQuery.active") == 0}
    table = $b.table(:id => 'table')
    table.wait_until_present

    line = table.td(:index => 0, :text => uid).parent
    assert(line.td(:text => "edited").present?)
  end

  def test_pre_process_delete
    table = go_to_list

    count = table.tbody.rows.count
    line = table.td(:text => "test pre-process 2").parent
    line.i(:class => "icon-erase").click
    Watir::Wait.until(30) {$b.execute_script("return jQuery.active") == 0}
    $b.button(:text => "continue").click
    Watir::Wait.until(30) {$b.execute_script("return jQuery.active") == 0}
    table.wait_until_present
    lines = table.tbody.rows
    assert(lines.count == count-1)
  end

  def test_pre_process_permission
    table = go_to_list

    line = table.td(:text => "test pre-process 2").parent
    line.i(:class => 'icon-key').click
    Watir::Wait.until(30) {$b.execute_script("return jQuery.active") == 0}

    list = $b.table(:id => "table")
    list.wait_until_present
    line = table.td(:text => "public").parent
    checkbox = line.cells.last.input(:type => "checkbox")
    assert(checkbox.checked == False)
    checkbox.click

    # reload page to check if permissions are persistant.
    $b.span(:id => "db_reload").click
    Watir::Wait.until(30) {$b.execute_script("return jQuery.active") == 0}
    list = $b.table(:id => "table")
    list.wait_until_present
    line = table.td(:text => "public").parent
    checkbox = line.cells.last.input(:type => "checkbox")
    assert(checkbox.checked == True)
  end
end
