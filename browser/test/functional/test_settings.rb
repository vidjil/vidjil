# coding: utf-8
load 'vidjil_browser.rb'
load 'browser_test.rb'


#browser test suite
class TestGraph < BrowserTest

  def setup
    super
    if not defined? $b
      set_browser("/doc/analysis-example2.vidjil", nil, {"timeFormat" => "short_name" })
      if $b.div(id: 'tip-container').present?
        $b.div(:id => 'tip-container').div(:class => 'tip_1').element(:class => 'icon-cancel').click
      end
    end
  end


  def after_tests
  end


  def test_00_starting_names
    type_name = "local_storage" 
    $b.div(:id => 'visu2_menu').hover
    sleep 0.5   #wait for menu to finish transition before starting 
    test_name_values(type_name)
  end


  def test_01_names_sample
    type_name = "sampling_date"
    change_name_key(type_name)
    test_name_values(type_name)
  end


  def test_02_names_short
    type_name = "short_name"
    change_name_key(type_name)
    test_name_values(type_name)
  end


  def test_03_names
    type_name = "name"
    change_name_key(type_name)
    test_name_values(type_name)
  end

  def test_04_delta_date
    type_name = "delta_date"
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
        return 'T8045-BC081-Diag' if type == "name"
        return 'T8045-BC'         if type == "short_name" || type == "local_storage"
        return '2019-12-17'       if type == "sampling_date"   # date
        return '2019-12-17'       if type == "delta_date"      # days
    elsif pos == "1"
        return 'T8045-BC082-fu1' if type == "name"
        return 'T8045-BC'        if type == "short_name" || type == "local_storage"
        return '2019-12-27'      if type == "sampling_date"
        return '+10'             if type == "delta_date"
    end
  end

  def change_name_key(type_name)
    $b.menu_settings.click
    $b.input(:id => "menuTimeForm_"+type_name).click
    $b.div(:id => 'visu2_menu').click
    $b.update_icon.wait_while(&:present?) # wait update
  end

  def test_name_values(type_name)
    $b.div(:id => 'visu2_menu').hover
    # By default, 2 samples are present in timeline graph
    print "\nTest for: " + type_name
    time0 = $b.graph_x_legend("0").text
    time1 = $b.graph_x_legend("1").text
    list0 = $b.td(:id => 'visu2_listElem_text_0' ).text
    list1 = $b.td(:id => 'visu2_listElem_text_1' ).text

    ## In graph label
    assert ( time0 == get_names("0", type_name) ), "incorrect name show for first sample (graph label), expected " + get_names("0", type_name) + " got " + time0
    assert ( time1 == get_names("1", type_name) ), "incorrect name show for second sample (graph label), expected " + get_names("1", type_name) + " got " + time1
    ## In graph list
    assert ( list0 == get_names("0", type_name) ), "incorrect name show for first sample (graphList text), expected " + get_names("0", type_name) + " got " + list0
    assert ( list1 == get_names("1", type_name) ), "incorrect name show for second sample (graphList text), expected " + get_names("1", type_name) + " got " + list1
  end

end
