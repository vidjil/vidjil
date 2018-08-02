load 'vidjil_browser.rb'
load 'browser_test.rb'

class TestLogin < BrowserTest

  def setup
    super
    if not defined? $b
      set_browser("http://localhost/browser")
    end
  end

=begin
  def test_00_init_db
    init_button = $b.a(:text => "init database")
    assert(init_button.present?)

    init_button.click
    init_form = $b.form(:id => "data_form")
    init_form.wait_until_present

    init_form.text_field(:id => "email").set("plop@plop.com")
    init_form.text_field(:id => "password").set("foobartest")
    init_form.text_field(:id => "confirm_password").set("foobartest")

    init_form.input(:type => "submit").click

    login_form = $b.form(:id => 'login_form')
    login_form.wait_until_present
  end
=end

  def test_failed_login
    login_form = $b.form(:id => 'login_form')
    assert(login_form.present?)
    login_form.text_field(:id => "auth_user_email").set('foo@bar.com')
    login_form.text_field(:id => "auth_user_password").set('foobar')
    login_form.tr(:id => 'submit_record__row').input(:type => 'submit').click
    Watir::Wait.until(30) {$b.execute_script("return jQuery.active") == 0}

    login_form = $b.form(:id => 'login_form')
    assert(login_form.present?)
  end

  def test_successful_login
    login_form = $b.form(:id => 'login_form')
    assert(login_form.present?)
    login_form.text_field(:id => "auth_user_email").set('plop@plop.com')
    login_form.text_field(:id => "auth_user_password").set('foobartest')
    login_form.tr(:id => 'submit_record__row').input(:type => 'submit').click
    Watir::Wait.until(30) {$b.execute_script("return jQuery.active") == 0}
    assert(!login_form.present?)
  end
end

