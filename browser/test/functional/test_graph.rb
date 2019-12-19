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

    # By default, checkbox are true
    $b.div(:id => 'visu2_menu').click
    check0 = $b.checkbox(:id => "graph_listElem_check_0")
    assert ( check0.set? ), "first checkbox is true"
    check1 = $b.checkbox(:id => "graph_listElem_check_1")
    assert ( check1.set? ), "second checkbox is true"

    # After click oin first sample checkbox, the corresponding checkbox is false, 
    # and not present in timeline
    check0.click
    time0 = $b.graph_x_legend("0")
    assert ( not time0.present? ), "first sample is NOT present in timeline after click"
    time1 = $b.graph_x_legend("1")
    assert ( time1.present? ), "second sample is still present in timeline"
    assert ( not check0.set? ), "first checkbox is false"
    assert ( check1.set? ), "second checkbox is true"

    # hide second sample by dblclick
    time1.double_click
    time1 = $b.graph_x_legend("1")
    assert ( not time1.present? ), "second sample is HIDDEN in timeline"

    # Use show all and hide all button
    $b.div(:id => 'visu2_menu').click
    $b.div(:id => 'graph_listElem_showAll').click
    assert ( time0.present? ), "first sample is SHOW in timeline"
    assert ( time1.present? ), "second sample is SHOW in timeline"
    assert ( check0.set? ), "first checkbox is true"
    assert ( check1.set? ), "second checkbox is true"


    $b.div(:id => 'visu2_menu').click
    $b.div(:id => 'graph_listElem_hideAll').click
    assert ( time0.present? ), "first sample is NOT hidden in timeline (hide simple click)"
    assert ( not time1.present? ), "second sample is HIDDEN in timeline"
    assert ( check0.set? ), "first checkbox is true  (hide simple click)"
    assert ( not check1.set? ), "second checkbox is false"

    # test hide all, with simple and dblclick
    $b.div(:id => 'graph_listElem_hideAll').double_click
    assert ( not time0.present? ), "first sample is HIDDEN in timeline"
    assert ( not time1.present? ), "second sample is HIDDEN in timeline"
    assert ( not check0.set? ), "first checkbox is false"
    assert ( not check1.set? ), "second checkbox is false"
    assert ( not sample_arrow.present? ), "sample arrow next is NOT present after hide all"
     
    # Test the action on simple click on element of the list (should change selected sample)
    $b.div(:id => 'visu2_menu').click
    $b.div(:id => 'graph_listElem_showAll').click
    info_name = $b.div(:id => "info_sample_name")
    assert ( info_name.text == "T8045-BC081-Diag" ), "info name is the name of sample 0"
    # click to change the sample
    $b.div(:id => 'visu2_menu').click
    sample1 = $b.div(:id => "graph_listElem_text_1")
    sample1.click
    assert ( info_name.text == "T8045-BC082-fu1" ), "info name is the name of sample 1"
    # ===========
     
  end



  # Not really a test
  def test_zz_close
    # close_everything
  end
end
