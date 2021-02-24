# coding: utf-8
load 'vidjil_browser.rb'
load 'browser_test.rb'

#browser test suite
class TestGraph < BrowserTest

 def setup
    super
    if not defined? $b
      set_browser("/browser/test/data/issues/4632.vidjil")
    end
  end


  def after_tests
  end

   
  ### Issue 4632; issue with empty distributions field (case in mixcr)
  def test_00_correct_load
    assert ( $b.clone_in_list('0').exists?),   ">> real clone exist in list"
  end


  # Not really a test
  def test_zz_close
    close_everything
  end
end

