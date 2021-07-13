# coding: utf-8
load 'vidjil_browser.rb'
load 'browser_test.rb'

#browser test suite
class TestGraph < BrowserTest

  def setup
    super
    if not defined? $b
      set_browser("/doc/analysis-example2.vidjil")
    end
  end


  def after_tests
  end
  
  def test_00_graphlist_init
    # By default, 2 samples are present in timeline graph
    $time0 = $b.graph_x_legend("0")
    $time1 = $b.graph_x_legend("1")
    $div_ratio = $b.span(:id => "visu2_title")
    $check0 = $b.checkbox(:id => "visu2_listElem_check_0")
    $check1 = $b.checkbox(:id => "visu2_listElem_check_1")
    $sample_arrow = $b.i(:title => "next sample")

    assert ( $time0.present? ), "first sample is present in timeline"
    assert ( $time1.present? ), "second sample is present in timeline"
    assert ( $sample_arrow.present? ), "sample arrow next is present at beginning"
    assert ( $b.graph_x_legend('0', :class => 'graph_time2').exists?), "first sample is current sample (bold in graph text)"
    assert ( $div_ratio.text == "2 / 2" ), "Ratio show is correct at init"
  end
  
  def test_01_graphlist_table
    # By default, checkbox are true
    $b.div(:id => 'visu2_menu').hover
    $b.table(:id => "visu2_table").wait_until(&:present?)
    assert ($b.td(:id => 'visu2_listElem_text_'+'0', :class => 'graph_listElem_selected').exists?), "First sample IS bold in list"
    assert (not $b.td(:id => 'visu2_listElem_text_'+'1', :class => 'graph_listElem_selected').exists?), "Second sample is NOT bold in list"
    # Assert on checkbox
    # $check0 = $b.checkbox(:id => "visu2_listElem_check_0")
    assert ( $check0.set? ), "first checkbox is true"
    # $check1 = $b.checkbox(:id => "visu2_listElem_check_1")
    assert ( $check1.set? ), "second checkbox is true"

  end
  
  def test_03_graphlist_manipulations
    # After click on first sample checkbox, the corresponding checkbox is false, 
    # and sample not present in timeline
    $check0.click
    $b.until { not $time0.present? }  # Test "first sample is NOT present in timeline after click"
    assert ( not $check0.set? ), "first checkbox is false"
    # $time1 = $b.graph_x_legend("1")
    assert ( $time1.present? ), "second sample is still present in timeline"
    assert ( $check1.set? ), "second checkbox is true"
    # verify that the second sample become selected (class: graph_time2)
    assert ($b.graph_x_legend('1', :class => 'graph_time2').exists?), "second sample become current sample (bold in graph text)"
    assert ( $div_ratio.text == "1 / 2" ), "Ratio show is correct after first hidding first sample"

    # hide second sample by dblclick on graph label (prevent as last)
    $time1.double_click
    $b.until { $time1.present? } # Test "second sample still present in timeline"
    check1 = $b.checkbox(:id => "visu2_listElem_check_1")
    assert ( $check1.set? ), "second checkbox still true as sample is not disable"
    assert ( $div_ratio.text == "1 / 2" ), "Ratio show is correct after prevent hidding of last sample"
  end
  
  def test_04_graphlist_XXXall_buttons
    # Use show all and hide all button
    $b.div(:id => 'visu2_menu').click
    $b.update_icon.wait_while(&:present?) # wait update
    $b.td(:id => 'visu2_listElem_showAll').click
    $b.update_icon.wait_while(&:present?) # wait update

    assert ( $time0.present? ), "first sample is SHOW in timeline"
    assert ( $time1.present? ), "second sample is SHOW in timeline"
    assert ( $check0.set? ), "first checkbox is true"
    assert ( $check1.set? ), "second checkbox is true"
    assert ($b.graph_x_legend('1', :class => 'graph_time2').exists?), "second sample become current sample (bold in graph text)"
    assert (not $b.td(:id => 'visu2_listElem_text_'+'0', :class => 'graph_listElem_selected').exists?), "First sample is NOT bold in list"
    assert (    $b.td(:id => 'visu2_listElem_text_'+'1', :class => 'graph_listElem_selected').exists?), "Second sample IS bold in list"


    # test hide all, with simple and dblclick
    $b.div(:id => 'visu2_menu').click
    $b.update_icon.wait_while(&:present?) # wait update
    $b.td(:id => 'visu2_listElem_hideAll').click
    $b.update_icon.wait_while(&:present?) # wait update

    assert ( $time1.present? ), "first sample is NOT hidden in timeline (hide simple click)"
    assert ( not $time0.present? ), "second sample is HIDDEN in timeline"
    assert ( $check1.set? ), "first checkbox is true  (hide simple click)"
    assert ( not $check0.set? ), "second checkbox is false"

    $b.td(:id => 'visu2_listElem_hideAll').double_click
    # No action as only one sample still active
    $b.update_icon.wait_while(&:present?) # wait update
    assert ( not $time0.present? ), "first sample is HIDDEN in timeline"
    assert (     $time1.present? ), "second sample still present as last active sample"
    assert ( not $check0.set? ), "first checkbox is false"
    assert (     $check1.set? ), "second checkbox is true"
    assert ( not $sample_arrow.present? ), "sample arrow next is NOT present after hide all"
    # No sample should be bold in list
    assert ( not $b.td(:id => 'visu2_listElem_text_'+'0', :class => 'graph_listElem_selected').exists?), "First sample is NOT bold in list"
    assert (     $b.td(:id => 'visu2_listElem_text_'+'1', :class => 'graph_listElem_selected').exists?), "Second sample is NOT bold in list"

    # Test the action on simple click on element of the list (should change selected sample)
    $b.div(:id => 'visu2_menu').click
    $b.td(:id => 'visu2_listElem_showAll').click
    $b.update_icon.wait_while(&:present?) # wait update

    info_name = $b.div(:id => "info_sample_name")
    assert ( info_name.text == "T8045-BC082-fu1" ), "info name is the name of sample 0"
    assert ( $b.td(:id => 'visu2_listElem_text_'+'1', :class => 'graph_listElem_selected').exists?), "Second sample BECOME bold in list"
    assert ( $div_ratio.text == "2 / 2" ), "Ratio show is correct after showAll click"

    # click to change the sample
    menu = $b.div(:id => 'visu2_menu')
    sample0 = $b.td(:id => "visu2_listElem_text_0")
    sample0.click
    $b.update_icon.wait_while(&:present?) # wait update

    assert ( info_name.text == "T8045-BC081-Diag" ), "info name is the name of sample 1"
    assert ( $b.td(:id => 'visu2_listElem_text_'+'0', :class => 'graph_listElem_selected').exists?), "First sample BECOME bold in list"
    # ===========
    # hide sample XX, so sample yy should become the current one
    $time1.double_click
    $b.update_icon.wait_while(&:present?) # wait update
    assert ($b.graph_x_legend('0', :class => 'graph_time2').exists?), "second sample become current sample (bold in graph text)"
     
    $b.div(:id => 'visu2_menu').click
    $b.td(:id => 'visu2_listElem_showAll').click
    
    # test change by arrow usage
    $b.send_keys :arrow_left
    $b.update_icon.wait_while(&:present?) # wait update
    assert ( $b.td(:id => 'visu2_listElem_text_'+'1', :class => 'graph_listElem_selected').exists?), "Second sample BECOME bold in list"
    assert ( not $b.td(:id => 'visu2_listElem_text_'+'0', :class => 'graph_listElem_selected').exists?), "First sample is NOT bold in list"
  end

  def test_06_graph_keep_order
    # Test correctg init order of samples (attr 'x' position ? )
    assert ( $time0.attribute_value("x") < $time1.attribute_value("x") ), "first sample is before the second (by 'X' position)"

    # Hide first sample
    $time0.double_click
    $b.update_icon.wait_while(&:present?) # wait update
    sleep 0.5

    assert ( not $time0.present? ), "first sample is hidden after dblclick"
    assert ($b.graph_x_legend('1', :class => 'graph_time2').exists?), "second sample become current sample (bold in graph text)"

    # Add sample 0
    $b.div(:id => 'visu2_menu').click
    $b.td(:id => 'visu2_listElem_showAll').click
    $b.update_icon.wait_while(&:present?) # wait update
    sleep 0.5

    print "\n===++\n" + $time0.attribute_value("x") +"; "+$time1.attribute_value("x") + "\n===++\n"
    # Still in correct order
    assert ( $time0.attribute_value("x") < $time1.attribute_value("x") ), "first sample still before the second (by 'X' position)"

  end
  
  def test_05_graphlist_mouseout
    ### test mouseout; hide table
    $b.clone_in_list('0').click # click outside...
    $b.update_icon.wait_while(&:present?) # wait update
    $b.table(:id => "visu2_table").wait_while(&:present?)
  end

  def test_07_graphlist_filter_on_shared_clones
    $b.div(:id => 'visu2_menu').hover
    $b.table(:id => "visu2_table").wait_until(&:present?)
    $b.td(:id => 'visu2_listElem_showAll').click
    
    $b.clone_in_list('4').click

    # Assert on checkbox at init
    assert ( $check0.set? ), "first checkbox is true"
    assert ( $check1.set? ), "second checkbox is true"

    # By default, checkbox are true
    $b.div(:id => 'visu2_menu').hover
    $b.table(:id => "visu2_table").wait_until(&:present?)
    $b.td(:id => 'visu2_listElem_hideNotShare').click
    $b.update_icon.wait_while(&:present?) # wait update
    
    # Assert on checkbox after filter on shared clones
    assert ( $check0.set? ), "first checkbox is true"
    assert ( !$check1.set? ), "second checkbox is false"

  end

  def test_08_mouseover 
    ## reset, time 0, preset 0
    $b.send_keys 0
    $b.graph_x_legend("0").fire_event('click')
    $b.update_icon.wait_while(&:present?)


    # Use show all and hide all button
    $b.div(:id => 'visu2_menu').click
    $b.update_icon.wait_while(&:present?) # wait update
    $b.td(:id => 'visu2_listElem_showAll').click
    $b.update_icon.wait_while(&:present?) # wait update

    # Hover the sample in graphList. Label in graph should be changed in size
    menu = $b.div(:id => 'visu2_menu')
    $b.td(:id => "visu2_listElem_text_0").hover
    assert ( $b.element(tag_name: 'text', :id => 'time0').style('font-size') == "16px" ), "sample 0 have correct label size when hover 0 in graphlist"
    assert ( $b.element(tag_name: 'text', :id => 'time1').style('font-size') == "12px" ), "sample 1 have correct label size when hover 1 in graphlist"


    $b.td(:id => "visu2_listElem_text_1").hover
    assert ( $b.element(tag_name: 'text', :id => 'time1').style('font-size') == "16px" ), "sample 1 have correct label size when hover 1 in graphlist"
    assert ( $b.element(tag_name: 'text', :id => 'time0').style('font-size') == "12px" ), "sample 0 have correct label size when hover 0 in graphlist"

    $b.clone_in_list('4').click
    $b.update_icon.wait_while(&:present?) # wait update
    assert ( $b.graph_x_legend('0', :class => 'graph_time2').exists? ), "sample 1 have correct label size when no hover in graphlist (bold as select)"
  end

  # Not really a test
  def test_zz_close
    close_everything
  end
end
