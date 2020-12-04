# coding: utf-8
load 'vidjil_browser.rb'
load 'browser_test.rb'

#browser test suite
class TestScatterplot < BrowserTest

  def setup
    super
    if not defined? $b
      set_browser("/tools/tests/data/fused_multiple.vidjil")
      if $b.div(id: 'tip-container').present?
        $b.div(:id => 'tip-container').div(:class => 'tip_1').element(:class => 'icon-cancel').click
      end

      # Make upload menu appear to test the application with this menu too
      $b.execute_script("$('#upload_summary')[0].style.display='block';")
    end
  end


  def after_tests
  end

  ##############
  ### CLONES ###
  ##############
  # id     0 --> biggest clone, IGHV1, IGHJ1, _average_read_length==162
  # id 15/16 --> other clone (TRD, IGH)
  # id    18 --> lenSeqAverage/_average_read_length == 162
  # id    27 --> lenCDR3 (undefined), represent all clones
  # id    29 --> seg5; seg3 (IGHV1; IGHJ1)

  def test_01_multiple_select_barmode
    $b.menu_filter.click
    $b.update_icon.wait_while(&:present?)
    $b.send_keys 4
    $b.update_icon.wait_while(&:present?)
    # to verify correct selection, We will look in semgenter the presence if clone entrie
    # Maybe another method could be more acurate
    
    $b.clone_in_scatterplot("0").click
    $b.update_icon.wait_while(&:present?)
    assert (     $b.clone_in_segmenter('0').present? ), ">> Firste click; Correct selection of clone 0 by click in scatterplot"
    assert ( not $b.clone_in_segmenter('1').present? ), ">> Firste click; Clone 1 should not be present in segmenter"
    
    $b.clone_in_scatterplot("1").click
    $b.update_icon.wait_while(&:present?)
    assert ( not $b.clone_in_segmenter('0').present? ), ">> Another click; Clone 0 should not be present anymore in segmenter"
    assert (     $b.clone_in_segmenter('1').present? ), ">> Another click; Correct selection of clone 1 after second click in scatterplot"
   

    $b.clone_in_scatterplot("0").click(:control)
    $b.update_icon.wait_while(&:present?)
    assert ( $b.clone_in_segmenter('0').present? ), ">> ctrl+click; Clone 0 should be present in segmenter"
    assert ( $b.clone_in_segmenter('1').present? ), ">> ctrl+click; Clone 1 should be present in segmenter"
  end

  def test_02_multiple_select_bubble
    $b.menu_filter.click
    $b.update_icon.wait_while(&:present?)
    $b.send_keys 1
    $b.update_icon.wait_while(&:present?)
    # to verify correct selection, We will look in semgenter the presence if clone entrie
    # Maybe another method could be more acurate
    
    $b.clone_in_scatterplot("0").click
    $b.update_icon.wait_while(&:present?)
    assert (     $b.clone_in_segmenter('0').present? ), ">> Firste click; Correct selection of clone 0 by click in scatterplot"
    assert ( not $b.clone_in_segmenter('1').present? ), ">> Firste click; Clone 1 should not be present in segmenter"
    
    $b.clone_in_scatterplot("1").click
    $b.update_icon.wait_while(&:present?)
    assert ( not $b.clone_in_segmenter('0').present? ), ">> Another click; Clone 0 should not be present anymore in segmenter"
    assert (     $b.clone_in_segmenter('1').present? ), ">> Another click; Correct selection of clone 1 after second click in scatterplot"
   

    $b.clone_in_scatterplot("0").click(:control)
    $b.update_icon.wait_while(&:present?)
    assert ( $b.clone_in_segmenter('0').present? ), ">> ctrl+click; Clone 0 should be present in segmenter"
    assert ( $b.clone_in_segmenter('1').present? ), ">> ctrl+click; Clone 1 should be present in segmenter"
  end


  def test_03_update_radius
    $b.menu_filter.click
    $b.update_icon.wait_while(&:present?)

    #visible clones never shrink under 4px width (minimum radius 2px)

    $b.send_keys 1

    $b.update_icon.wait_while(&:present?)
    assert ( $b.clone_in_scatterplot('1').width > 4),  ">> clone 1 should be visible in scatterplot at time 0"
    assert ( $b.clone_in_scatterplot('2').width > 4),  ">> clone 2 should be visible in scatterplot at time 0"
    
    $b.send_keys :arrow_right

    $b.update_icon.wait_while(&:present?)
    assert ( $b.clone_in_scatterplot('1').width > 4),  ">> clone 1 should still be visible in scatterplot at time 1"
    assert ( $b.clone_in_scatterplot('2').width < 4),  ">> clone 2 should NOT be visible in scatterplot at time 1 "

  end

  def test_04_axis_order_in_compare
    $b.clone_in_list("0").click
    $b.update_icon.wait_while(&:present?)
    $b.send_keys 9
    $b.update_icon.wait_while(&:present?)

    axis_container_Y = $b.element(:id => "visu_axis_y_container")
    axis = axis_container_Y.elements(:class => "sp_legend")

    assert (  axis.length == 4 ),  ">> incorrect number of axis, got (" + axis.length.to_s + "), expected (4)"
    assert (  axis[0].text == "0" ),    ">> incorrect first legend, got '"  + axis[0].text + "', expected '0'"
    assert (  axis[1].text == "1" ),    ">> incorrect second legend, got '" + axis[1].text + "', expected '1'"
    assert (  axis[2].text == "0.1" ),  ">> incorrect third legend, got '"  + axis[2].text + "', expected '0.1'"
    assert (  axis[3].text == "0.01" ), ">> incorrect fourth legend, got '" + axis[3].text + "', expected '0.01'"
  end

  def test_05_multiple_select_with_inapropriate_distrib_clone
    ## reset, time 0, preset 0
    $b.send_keys 0
    $b.graph_x_legend("0").fire_event('click')
    $b.update_icon.wait_while(&:present?)

    slider = $b.menu_item("top_slider")
    slider.click
    $b.menu_filter.hover
    slider.send_keys :arrow_left
    slider.send_keys :arrow_left
    slider.send_keys :arrow_left
    
    $b.send_keys [:control, :shift, 'k']

    $b.clone_in_list("0").click
    $b.update_icon.wait_while(&:present?)
    assert (     $b.clone_in_segmenter('0').present? ), ">> First click; Correct selection of clone 0 by click in scatterplot"
    assert ( not $b.clone_in_segmenter('1').present? ), ">> First click; Clone 1 should not be present in segmenter"
    # assert ( not $b.clone_in_scatterplot("18").present? ), "distrib clone is present"

    $b.send_keys 4
    $b.update_icon.wait_while(&:present?)
    $b.send_keys 0
    $b.update_icon.wait_while(&:present?)

    circle_18 = $b.element(:id => "visu_circle18")
    circle_18.fire_event('click') # allow to click if clone is not visible or under another element

    # control by segmenter the curent state of selection
    segmenter_stat = $b.div(:id => "segmenter").element(:class => "stats_content")
    assert ( segmenter_stat.text.include? "1 clone, 50 reads (20.00%)" ), "segmenter show correct information of selection (without selection of distrib clone)"
  end

  def test_07_open_click_by_dblclick
     ## reset, time 0, preset 0
    $b.send_keys 0
    $b.graph_x_legend("0").fire_event('click')
    $b.update_icon.wait_while(&:present?)

    ## open a first time the modal (init style and content); and close it
    modal = $b.modal_container
    c0 = $b.clone_in_list("0")
    c0.span(:class => ["infoBox", "warn"]).click
    modal.i(:class => "icon-cancel").click 
    ## verify that clone window is close before
    assert ( modal.style == "display: none;" ), "before dblclick, modal is closed"


    ## verify that clone window is open after
    $b.clone_in_scatterplot("1").double_click
    $b.update_icon.wait_while(&:present?)
    assert ( modal.style == "display: block;" ), "after dblclick, modal is opened"

    ## Verify that content is related to correct clone
    assert ( modal.h2(:text => "Cluster info : T2 - IGHV1*01 0//0 IGHJ1*01").present? ), "Correct title content for modal"
  end
  
  # Not really a test
  def test_zz_close
    close_everything
  end
end
