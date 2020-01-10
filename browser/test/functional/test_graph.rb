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
  
  def test_00_list_clones
    # By default, 2 samples are present in timeline graph
    time0 = $b.graph_x_legend("0")
    assert ( time0.present? ), "first sample is present in timeline"
    time1 = $b.graph_x_legend("1")
    assert ( time1.present? ), "second sample is present in timeline"
    sample_arrow = $b.i(:title => "next sample")
    assert ( sample_arrow.present? ), "sample arrow next is present at beginning"
    assert ($b.graph_x_legend('0', :class => 'graph_time2').exists?), "first sample is current sample (bold in graph text)"

    # By default, checkbox are true
    $b.div(:id => 'visu2_menu').click
    sleep 0.1
    assert ($b.td(:id => 'graph_listElem_text_'+'0', :class => 'graph_listElem_selected').exists?), "First sample IS bold in list"
    assert (not $b.td(:id => 'graph_listElem_text_'+'1', :class => 'graph_listElem_selected').exists?), "Second sample is NOT bold in list"
    # assert ( not $b.td(:id => '1', :class => 'graph_listElem_selected').exists?), "Second sample is NOT bold in list"
    check0 = $b.checkbox(:id => "graph_listElem_check_0")
    assert ( check0.set? ), "first checkbox is true"
    check1 = $b.checkbox(:id => "graph_listElem_check_1")
    assert ( check1.set? ), "second checkbox is true"

    # After click on first sample checkbox, the corresponding checkbox is false, 
    # and sample not present in timeline
    check0.click
    sleep 1
    time0 = $b.graph_x_legend("0")
    assert ( not time0.present? ), "first sample is NOT present in timeline after click"
    assert ( not check0.set? ), "first checkbox is false"
    time1 = $b.graph_x_legend("1")
    assert ( time1.present? ), "second sample is still present in timeline"
    assert ( check1.set? ), "second checkbox is true"
    # verify that the second sample become selected (class: graph_time2)
    assert ($b.graph_x_legend('1', :class => 'graph_time2').exists?), "second sample become current sample (bold in graph text)"

    # hide second sample by dblclick
    time1.double_click
    sleep 1
    # time1 = $b.graph_x_legend("1")
    assert ( not time1.present? ), "second sample is HIDDEN in timeline"
    check1 = $b.checkbox(:id => "graph_listElem_check_1")
    assert ( not check1.set? ), "second checkbox is false as sample is disable"
    

    # Use show all and hide all button
    $b.div(:id => 'visu2_menu').click
    sleep 0.1
    $b.td(:id => 'graph_listElem_showAll').click
    sleep 1
    assert ( time0.present? ), "first sample is SHOW in timeline"
    assert ( time1.present? ), "second sample is SHOW in timeline"
    assert ( check0.set? ), "first checkbox is true"
    assert ( check1.set? ), "second checkbox is true"
    assert ($b.graph_x_legend('1', :class => 'graph_time2').exists?), "second sample become current sample (bold in graph text)"
    assert (not $b.td(:id => 'graph_listElem_text_'+'0', :class => 'graph_listElem_selected').exists?), "First sample is NOT bold in list"
    assert (    $b.td(:id => 'graph_listElem_text_'+'1', :class => 'graph_listElem_selected').exists?), "Second sample IS bold in list"


    $b.div(:id => 'visu2_menu').click
    sleep 0.1
    $b.td(:id => 'graph_listElem_hideAll').click
    sleep 1
    # todo, corriger les textes
    assert ( time1.present? ), "first sample is NOT hidden in timeline (hide simple click)"
    assert ( not time0.present? ), "second sample is HIDDEN in timeline"
    assert ( check1.set? ), "first checkbox is true  (hide simple click)"
    assert ( not check0.set? ), "second checkbox is false"

    # test hide all, with simple and dblclick
    $b.td(:id => 'graph_listElem_hideAll').double_click
    sleep 1
    assert ( not time0.present? ), "first sample is HIDDEN in timeline"
    assert ( not time1.present? ), "second sample is HIDDEN in timeline"
    assert ( not check0.set? ), "first checkbox is false"
    assert ( not check1.set? ), "second checkbox is false"
    assert ( not sample_arrow.present? ), "sample arrow next is NOT present after hide all"
    # No sample should be bold in list
    assert ( not $b.td(:id => 'graph_listElem_text_'+'0', :class => 'graph_listElem_selected').exists?), "First sample is NOT bold in list"
    assert ( not $b.td(:id => 'graph_listElem_text_'+'1', :class => 'graph_listElem_selected').exists?), "Second sample is NOT bold in list"

    # Test the action on simple click on element of the list (should change selected sample)
    $b.div(:id => 'visu2_menu').click
    $b.td(:id => 'graph_listElem_showAll').click
    sleep 1
    info_name = $b.div(:id => "info_sample_name")
    assert ( info_name.text == "T8045-BC082-fu1" ), "info name is the name of sample 0"
    assert ( $b.td(:id => 'graph_listElem_text_'+'1', :class => 'graph_listElem_selected').exists?), "Second sample BECOME bold in list"
    # click to change the sample
    menu = $b.div(:id => 'visu2_menu')
    sample0 = $b.td(:id => "graph_listElem_text_0")
    sample0.click
    sleep 1
    assert ( info_name.text == "T8045-BC081-Diag" ), "info name is the name of sample 1"
    assert ( $b.td(:id => 'graph_listElem_text_'+'0', :class => 'graph_listElem_selected').exists?), "First sample BECOME bold in list"
    # ===========
    # hide sample XX, so sample yy should become the current one
    time1.double_click
    sleep 1
    assert ($b.graph_x_legend('0', :class => 'graph_time2').exists?), "second sample become current sample (bold in graph text)"
     
    $b.div(:id => 'visu2_menu').click
    $b.td(:id => 'graph_listElem_showAll').click
    
    # test change by arrow usage
    $b.send_keys :arrow_left
    sleep 1
    assert ( $b.td(:id => 'graph_listElem_text_'+'1', :class => 'graph_listElem_selected').exists?), "Second sample BECOME bold in list"
    assert ( not $b.td(:id => 'graph_listElem_text_'+'0', :class => 'graph_listElem_selected').exists?), "First sample is NOT bold in list"
  end



  # Not really a test
  def test_zz_close
    close_everything
  end
end
