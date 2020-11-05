load 'vidjil_browser.rb'
load 'server_test.rb'

class TestMyAccount < ServerTest

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
      Watir::Wait.until(timeout: 30) {$b.execute_script("return jQuery.active") == 0}
    end
  end

  def  go_to_my_account
    $b.a(class: 'button', text: 'my account').click
    Watir::Wait.until(timeout: 30) {$b.execute_script("return jQuery.active") == 0}
  end

  def go_to_jobs
    $b.a(class: 'button', text: 'my jobs').click
    Watir::Wait.until(timeout: 30) {$b.execute_script("return jQuery.active") == 0}
    table = $b.table(:id => "table")
    table.wait_until(&:present?)
    table
  end

  def test_my_account
    go_to_my_account

    assert($b.div(class: 'set_group').present?)
    assert($b.text.include?('public'))
  end

  def test_filter_my_account_tag
    go_to_my_account

    test1_tag = $b.a(class: 'tag-link', text: 'test1')
    test2_tag = $b.a(class: 'tag-link', text: 'test2')

    assert(test1_tag.present?)
    assert(test2_tag.present?)

    test1_tag.click
    Watir::Wait.until(timeout: 30) {$b.execute_script("return jQuery.active") == 0}

    assert(test1_tag.present?)
    assert(test2_tag.present? == false)

    filter = $b.text_field(id: 'db_filter_input')
    filter.set('#test2')
    Watir::Wait.until(timeout: 30) {$b.execute_script("return jQuery.active") == 0}

    assert(test1_tag.present? == false)
    assert(test2_tag.present?)
  end

  def test_jobs
    table = go_to_jobs

    assert(table.tbody.present?)
  end

  def test_filter_jobs_tag
    table = go_to_jobs

    test1_tag = $b.a(class: 'tag-link', text: 'test1')
    test2_tag = $b.a(class: 'tag-link', text: 'test2')

    assert(test1_tag.present?)
    assert(test2_tag.present?)

    test1_tag.click
    Watir::Wait.until(timeout: 30) {$b.execute_script("return jQuery.active") == 0}

    assert(test1_tag.present?)
    assert(test2_tag.present? == false)

    filter = $b.text_field(id: 'db_filter_input')
    filter.set('#test2')
    Watir::Wait.until(timeout: 30) {$b.execute_script("return jQuery.active") == 0}

    assert(test1_tag.present? == false)
    assert(test2_tag.present?)
  end
end
