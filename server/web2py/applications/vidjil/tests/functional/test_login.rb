load 'vidjil_browser.rb'
load 'browser_test.rb'

class TestLogin < BrowserTest

  def setup
    super
    if not defined? $b
      set_browser("https://localhost/browser")
    end
  end

  def test_00_failed_login
    login_form = $b.form(:id => 'login_form')
    assert(login_form.present?)
    login_form.text_field(:id => "auth_user_email").set('foo@bar.com')
    login_form.text_field(:id => "auth_user_password").set('foobar')
    login_form.tr(:id => 'submit_record__row').input(:type => 'submit').click
    Watir::Wait.until(timeout: 30) {$b.execute_script("return jQuery.active") == 0}
    assert(login_form.present?)
  end

  def test_01_successful_login
    login_form = $b.form(:id => 'login_form')
    assert(login_form.present?)
    login_form.text_field(:id => "auth_user_email").set('plop@plop.com')
    login_form.text_field(:id => "auth_user_password").set('foobar')
    login_form.tr(:id => 'submit_record__row').input(:type => 'submit').click
    Watir::Wait.until(timeout: 30) {$b.execute_script("return jQuery.active") == 0}
    assert(!login_form.present?)
  end

  def test_zz_close
    close_everything
  end
end

