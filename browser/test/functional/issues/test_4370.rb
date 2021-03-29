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
      $tooltip = $b.div(:id => "visu2_tooltip")
    end
  end


  def after_tests
  end
  
  # issue 4370; test tooltip content on graph
  def test_00_mouseover_delay
    # before hover, tooltip should be hidden
    assert ( $tooltip.style('opacity') == "0" ), "correct opacity of tooltip when label is NOT hover"
    $b.graph_x_legend('1').hover
    sleep 0.5 # no update icon in this case; so whould use a fixed time
    assert ( $tooltip.style('opacity') == "0" ), "correct opacity of tooltip when label is hover"
    $b.graph_x_legend('1').hover
    sleep 3
    assert ( $tooltip.style('opacity') == "1" ), "correct opacity of tooltip when label is hover"
  end

  
  def test_01_mouseover_with_dates 
    # sleep 10
    $b.graph_x_legend('1').hover
    sleep 1.5 # no update icon in this case; so whould use a fixed time
    assert ( $tooltip.style('opacity') == "1" ), "correct opacity of tooltip when label is hover"

    content = "T8045-BC082-fu1\n2019-12-27\n+10\n250 000 (57.19%)"
    assert ( $tooltip.text == content), "Correct text in the sample tooltip"
  end


  def test_02_mouseover_without_dates
    set_browser("/doc/analysis-example.vidjil")
    
    $b.graph_x_legend('0').hover
    sleep 2 
    assert ( $tooltip.style('opacity') == "1" ), "correct opacity of tooltip when label is hover"

    content = "helloworld\n741 684 (94.26%)"
    assert ( $tooltip.text == content), "Correct text in the sample tooltip"
  end

  # Not really a test
  def test_zz_close
    close_everything
  end
end
