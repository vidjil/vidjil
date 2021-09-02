# coding: utf-8
load 'vidjil_browser.rb'
load 'browser_test.rb'

#browser test suite
class TestClones < BrowserTest

  def setup
    super
    if not defined? $b
      set_browser("/demo/Demo-X5-no-clone.vidjil")
      # Make upload menu appear to test the application with this menu too
      $b.execute_script("$('#upload_summary')[0].style.display='block';")
    end
  end


  def after_tests
  end

  ##############
  ### CLONES ###
  ##############
  # no clone present in this file, but only log, reads numbers, ...
  
  def test_000_clone_present_inlist
    info = $b.div(:id => "info_segmented")
    assert ( info.title == "total: 14" )
    assert ( not $b.clone_in_list('0').exists?), ">> No clone exist in list"
    
  end

  # Not really a test
  def test_zz_close
    close_everything
  end
end
