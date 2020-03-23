# coding: utf-8
load 'vidjil_browser.rb'
load 'browser_test.rb'


#browser test suite
class TestGraph < BrowserTest

  def setup
    super
    if not defined? $b
      set_browser("/doc/analysis-example2.vidjil")
      if $b.div(id: 'tip-container').present?
        $b.div(:id => 'tip-container').div(:class => 'tip_1').element(:class => 'icon-cancel').click
      end
    end
  end


  def after_tests
  end


  def test_00_starting_names
    type_name = "SamplePlus" # by default if date given in vidjil file 
    test_name_values(type_name)

  end


  def test_01_names_sample
    type_name = "Sample"
    change_name_key(type_name)
    test_name_values(type_name)
  end


  def test_02_names_short
    type_name = "Short"
    change_name_key(type_name)
    test_name_values(type_name)
  end


  def test_03_names_short
    type_name = "Name"
    change_name_key(type_name)
    test_name_values(type_name)
  end


  # Not really a test
  def test_zz_close
    close_everything
  end


  protected

  def get_names(pos, type)
    ### names in various format
    if pos == "0"
        return 'T8045-BC081-Diag' if type == "Name"
        return 'T8045-BC'         if type == "Short"      # short
        return '2019-12-17'       if type == "Sample"     # date
        return '2019-12-17'       if type == "SamplePlus" # days
    elsif pos == "1"
        return 'T8045-BC082-fu1' if type == "Name"
        return 'T8045-BC'        if type == "Short"
        return '2019-12-27'      if type == "Sample"
        return '+10'             if type == "SamplePlus"
    end
  end

  def change_name_key(type_name)
    $b.menu_settings.click
    $b.input(:id => "menuTimeForm"+type_name).click
    $b.div(:id => 'visu2_menu').click
    $b.update_icon.wait_while(&:present?) # wait update
  end

  def test_name_values(type_name)
    # By default, 2 samples are present in timeline graph
    print "\nTest for: " + type_name
    time0 = $b.graph_x_legend("0")
    time1 = $b.graph_x_legend("1")
    list0 = $b.td(:id => 'visu2_listElem_text_0' )
    list1 = $b.td(:id => 'visu2_listElem_text_1' )

    ## In graph label
    assert ( time0.text == get_names("0", type_name) ), "correct name show for first sample (graph label)"
    assert ( time1.text == get_names("1", type_name) ), "correct name show for second sample (graph label)"
    ## In graph list
    if $b.driver.capabilities.browser_name == 'chrome'
      skip "Don't work with old chrome"
    end
    
    assert ( list0.text == get_names("0", type_name) ), "correct name show for first sample (graphList text)"
    assert ( list1.text == get_names("1", type_name) ), "correct name show for second sample (graphList text)"
  end

end
