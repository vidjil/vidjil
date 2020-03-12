# coding: utf-8
load 'vidjil_browser.rb'
load 'browser_test.rb'

#browser test suite
class TestClones < BrowserTest

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

  def test_000_clone_present_inlist
    ### exist in list
    assert (     $b.clone_in_list('0').exists?),   ">> real clone exist in list"
    assert (     $b.clone_in_list('15').exists?),  ">> smaller clones exist in list"
    assert (     $b.clone_in_list('29').exists?),  ">> seg5/seg3 distrib clone exist in list"
    assert ( not $b.clone_in_list('18').present?),  ">> lenSeqAverage distrib clone DON'T exist in list"
    assert ( not $b.clone_in_list('27').present?),  ">> lenCDR3 distrib clone DON'T exist in list"
  end

  def test_001_clone_present_in_scatterplot_segVJ
    ### Tests on size after top change
    slider = $b.menu_item("top_slider")
    slider.click
    $b.menu_filter.hover
    slider.send_keys :arrow_left
    slider.send_keys :arrow_left
    slider.send_keys :arrow_left
    $b.clone_in_list("0").click # sortir pour m.update() ?*

    ### exist in scatterplot
    $b.clone_in_scatterplot('0').wait_until(&:present?) # ">> 'real' clone exist in graph"
    assert (     $b.clone_in_scatterplot('29').present?), ">> 'corresponding distrib' clone (seg5/seg3) exist in correpsonding scatterplot"
    assert ( not $b.clone_in_scatterplot('15').present?), ">> 'other' clone DON'T exist in sp"
    assert ( not $b.clone_in_scatterplot('18').present?), ">> 'other' clone DON'T exist in sp"
  end

  def test_002_clone_present_in_scatterplot_lenSeqAverage
    ### change graphical
    $b.clone_in_scatterplot("0").click
    $b.send_keys 4;
    $b.update_icon.wait_while(&:present?)
    assert (     $b.clone_in_scatterplot('0').present?), ">> 'real' clone exist in sp"
    assert (     $b.clone_in_scatterplot('18').present?), ">> 'corresponding distrib' clone (len=162) exist in sp"
    assert ( not $b.clone_in_scatterplot('29').present?), ">> 'NOT correpsonding distrib' clone DON'T exist in sp"
    
    # Verify that data don't reappear at m.update()
    $b.scatterplot.click 
    assert ( not $b.clone_in_scatterplot('29').present?), ">> 'other' clone DON'T exist in graph"
  end


  def test_01_clone_size
    $b.menu_filter.click
    $b.input(:id => "top_slider").click
    $b.menu_filter.hover
    $b.send_keys :arrow_right
    $b.send_keys :arrow_right
    $b.clone_in_list("0").click

    ### Tests initial size (should be 0?)
    clone_size = $b.clone_info("18")[:size].text
    assert ( clone_size == "−"), ">> correct starting size"

    ### Tests on size after top change
    $b.menu_filter.click
    $b.input(:id => "top_slider").click
    $b.menu_filter.hover
    $b.send_keys :arrow_left
    $b.send_keys :arrow_left
    $b.clone_in_list("0").click # sortir pour m.update() ?
    $b.update_icon.wait_while(&:present?)

    clone_size = $b.clone_info("18")[:size].text
    assert ( clone_size == "8.000%"), ">> size must increase if more clone is include (by moving top slider) in a distrib clone"
    # TODO verify that distrib and other clones anre not count in the top slider

    ### Tests hide clone 0 to increase clone 18
    $b.clone_in_list("0").click
    $b.a(:id => "hide_selected").click
    $b.update_icon.wait_while(&:present?)

    clone_size = $b.clone_info("18")[:size].text
    assert ( clone_size == "8.000%"), ">> Size of a distrib clone should not increase if we hide a corresponding real clone"
  end


  def test_02_hide_and_focus
    ### Tests on filter by axes/types
    $b.send_keys 0
    $b.update_icon.wait_while(&:present?)
    # assert ( not $b.clone_in_scatterplot('18').present?), ">> 'lenSeqAverage' clone should not exist in bubble seg5/seg3 (preset 0)"
    assert ( $b.clone_in_scatterplot('31').present?),     ">> 'seg5/3' clone should exist in bubble seg5/seg3  (preset 0)"


    ### Distrib clone should be hidable
    $b.send_keys 4
    $b.clone_in_list("18").click
    $b.update_icon.wait_while(&:present?)
    $b.clone_in_scatterplot('18').wait_until(&:present?) 
    assert ( $b.clone_in_scatterplot('18').present?),     ">> distrib clone should be in scatterplot"
    assert ( not $b.clone_in_segmenter("18").present? ),  ">> not present in segmenter"
    $b.a(:id => "hide_selected").click
    $b.update_icon.wait_while(&:present?)
    assert ( not $b.clone_in_scatterplot('18').present?), ">>distrib clone should be hiden"

    $b.clear_filter.click
    $b.update_icon.wait_while(&:present?)
  end

  def test_03_focus
    $b.clone_in_scatterplot("1").click
    $b.clone_in_scatterplot("18").click(:control)
    $b.clone_in_scatterplot("19").click(:control)
    $b.update_icon.wait_while(&:present?)
    $b.a(:id => "focus_selected").click
    $b.update_icon.wait_while(&:present?)
    # should be hidden
    assert ( not $b.clone_in_scatterplot('17').present?), ">>distrib not focused clone should be hiden"
    assert ( not $b.clone_in_scatterplot('0').present?),  ">>real not focused clone should be hiden"
    # should be present
    assert ( $b.clone_in_scatterplot('1').present?),  ">>real focused clone should be present"
    # assert ( $b.clone_in_scatterplot('18').present?), ">>distrib focused clone should be present"
    # assert ( $b.clone_in_scatterplot('19').present?), ">>distrib focused clone should be present"

    $b.clear_filter.click
  end

  def test_04_clone_name_in_list
    ### Test on size for various timepoint
    $b.send_keys 4
    $b.update_icon.wait_while(&:present?)
    $b.clone_in_list("18").click
    $b.update_icon.wait_while(&:present?)
    # $b.send_keys :arrow_left

    ## liste  clones at 162 : 
    # time 0: [0, 1, 8, 9]
    # time 1: []
    # time 2: [1,7,8,9]
    
    # controle name
    clone_name = $b.clone_info('18')[:name]
    assert ( clone_name.text == "162 (2 clones)" ), ">>name of distrib clone for time 0 expected 162 (2 clones), was %s" % clone_name.text
    
    $b.send_keys :arrow_right
    $b.update_icon.wait_while(&:present?)
    clone_name = $b.clone_info('18')[:name]
    assert ( clone_name.text == "162 (0 clone)" ), ">>name of distrib clone for time 1 expected 162 (0 clone), was %s" % clone_name.text
    
    $b.send_keys :arrow_right
    $b.update_icon.wait_while(&:present?)
    clone_name = $b.clone_info('18')[:name]
    assert ( clone_name.text == "162 (7 clones)" ), ">>name of distrib clone for time 2 expected 162 (7 clones), was %s" % clone_name.text
    
    ### Tests on size after top change
    # return to time 0
    $b.send_keys :arrow_right 
    # Change the top to top
    $b.menu_filter.click
    $b.input(:id => "top_slider").click
    $b.menu_filter.hover
    $b.send_keys :arrow_right
    $b.send_keys :arrow_right

    # controle name
    clone_name = $b.clone_info('18')[:name]
    assert ( clone_name.text == "162 (0 clone)" ), ">>name of distrib clone for time 0, top max"
    
    $b.clone_in_list("1").click
    $b.a(:id => "hide_selected").click
    assert ( clone_name.text == "162 (0 clone)" ), ">>name of distrib clone for time 0, top max, clone 1 hidden"
    $b.clear_filter.click
  end

  def test_05_hide_distrib_clone
    # Change the top to top
    $b.menu_filter.click
    $b.input(:id => "top_slider").click
    $b.menu_filter.hover
    $b.send_keys :arrow_left
    $b.send_keys :arrow_left
    $b.send_keys :arrow_left
    $b.clone_in_list("1").click # validate
    
    # todo test on real and distrib clone
    $b.clone_in_list("1").click
    $b.a(:id => "hide_selected").click
    assert (     $b.clone_in_list('0').present?),        ">> Not hidded real clone exist in list"
    assert (     $b.clone_in_scatterplot('0').present?), ">> Not hidded real clone exist in scatterplot"
    assert ( not $b.clone_in_list('1').present?),        ">> Hidded real clone DON'T exist in list"
    assert ( not $b.clone_in_scatterplot('1').present?), ">> Hidded real clone DON'T exist in scatterplot"

    $b.clone_in_list("20").click
    $b.a(:id => "hide_selected").click
    $b.update_icon.wait_while(&:present?)
    assert ( not $b.clone_in_list('20').present?),        ">> Hidded distrib clone DON'T exist in list"
    $b.clone_in_scatterplot('20').wait_while(&:present?) # ">> Hidded distrib clone DON'T exist in scatterplot"
    $b.clear_filter.click
  end


  def test_06_focus_on_distrib_clone
    # Change the top to top
    $b.menu_filter.click
    $b.input(:id => "top_slider").click
    $b.menu_filter.hover
    $b.send_keys :arrow_left
    $b.send_keys :arrow_left
    $b.send_keys :arrow_left
    $b.clone_in_list("0").click # validate
    $b.send_keys 4
    $b.update_icon.wait_while(&:present?)

    # test size before focus
    assert ( $b.clone_info("0")[:size].text  == "20.00%"), ">> before focus; clone 0;correct starting size"
    assert ( $b.clone_info("1")[:size].text  == "12.00%"), ">> before focus; clone 1;correct starting size"
    assert ( $b.clone_info("2")[:size].text  == "10.00%"), ">> before focus; clone 2;correct starting size"
    assert ( $b.clone_info("17")[:size].text == "8.000%"), ">> before focus; clone 17;correct starting size"
    assert ( $b.clone_info("18")[:size].text == "8.000%"), ">> before focus; clone 18;correct starting size"
    assert ( $b.clone_info("19")[:size].text == "6.000%"), ">> before focus; clone 19;correct starting size"
    assert ( $b.clone_in_list('3').present?),              ">> before focus; real clone not selected is present"

    # Select
    $b.clone_in_scatterplot("0").click            # len 162, real
    $b.clone_in_scatterplot("1").click(:control)  # len 162, real
    $b.clone_in_scatterplot("2").click(:control)  # len 164, real
    $b.clone_in_scatterplot("17").click(:control) # len 160, distrib
    $b.clone_in_scatterplot("18").click(:control) # len 162, distrib
    $b.clone_in_scatterplot("19").click(:control) # len 164, distrib
    $b.update_icon.wait_while(&:present?)
    $b.a(:id => "focus_selected").click
    $b.update_icon.wait_while(&:present?)

    # test size before focus
    # 0; 1; 2; 17; 18; 19 should stay at same sizes
    assert ( $b.clone_info("0")[:size].text  == "20.00%"), ">> after focus; clone 0;correct finishing size"
    assert ( $b.clone_info("1")[:size].text  == "12.00%"), ">> after focus; clone 1;correct finishing size"
    assert ( $b.clone_info("2")[:size].text  == "10.00%"), ">> after focus; clone 2;correct finishing size"
    assert ( $b.clone_info("17")[:size].text == "8.000%"), ">> after focus; clone 17;correct finishing size"
    assert ( $b.clone_info("18")[:size].text == "8.000%"), ">> after focus; clone 18;correct finishing size"
    assert ( $b.clone_info("19")[:size].text == "6.000%"), ">> after focus; clone 19;correct finishing size"
    assert ( not $b.clone_in_list('3').present?),          ">> after focus; real clone not selected is NOT present"
    
    # Re-click: no modification waited
    $b.a(:id => "focus_selected").click
    $b.update_icon.wait_while(&:present?)
    assert ( $b.clone_info("0")[:size].text  == "20.00%"), ">> after focus; clone 0;correct finishing size"
    assert ( $b.clone_info("17")[:size].text == "8.000%"), ">> after focus; clone 17;correct finishing size"
    assert ( not $b.clone_in_list('3').present?),          ">> after focus; real clone not selected still NOT present"
    $b.clear_filter.click
  end


  def test_07_cluster
    $b.clear_filter.click

    # Change the top to top
    $b.menu_filter.click
    $b.input(:id => "top_slider").click
    $b.menu_filter.hover
    $b.send_keys :arrow_left
    $b.send_keys :arrow_left
    $b.send_keys :arrow_left
    $b.clone_in_list("1").click # validate
    
    # controle prior size
    assert ( $b.clone_info("1")[:size].text == "12.00%"),  ">> Init size of a real clone before merge"
    assert ( $b.clone_info("18")[:size].text == "8.000%"), ">> Init size of a distrib clone (len 162) before merge"
    assert ( $b.clone_info("19")[:size].text == "6.000%"), ">> Init size of a distrib clone (len 164) clone before merge"

    # Merge
    $b.clone_in_list("1").click
    $b.clone_in_list("2").click(:control)
    $b.clone_in_list("18").click(:control)
    $b.merge.click
    $b.update_icon.wait_while(&:present?)

    assert (     $b.clone_in_list("1").present? ),  ">> Real clone A should be present in list "
    assert ( not $b.clone_in_list("2").present? ),  ">> Real clone B should NOT be present in list "
    assert (     $b.clone_in_list("18").present? ), ">> Distrib clone should be present in list "
    $b.clone_in_list("1").click
    $b.update_icon.wait_while(&:present?)

    # What expected after merge for corresponding distrib clone ? 
    
    # controle size after merge
    assert ( $b.clone_info("1")[:size].text == "22.00%"),  ">> Size after merge of support real clone"
    assert ( $b.clone_info("18")[:size].text == "8.000%"), ">> Size after merge of distrib clone (len 162)"
    assert ( $b.clone_info("19")[:size].text == "6.000%"), ">> Size after merge of distrib clone (len 164)"
    
    # Attention, erreur après le click sur le graph !!
    $b.scatterplot.click
    $b.update_icon.wait_while(&:present?)
    assert ( $b.clone_info("1")[:size].text == "22.00%"),  ">> Size after merge of support real clone"
    assert ( $b.clone_info("18")[:size].text == "8.000%"), ">> Size after merge of distrib clone (len 162)"
    assert ( $b.clone_info("19")[:size].text == "6.000%"), ">> Size after merge of distrib clone (len 164)"
    
    # hide clone 1
    $b.clone_in_list("1").click
    $b.update_icon.wait_while(&:present?)
    $b.a(:id => "hide_selected").click
    $b.update_icon.wait_while(&:present?)
    assert ( $b.clone_info("18")[:size].text == "8.000%"), ">> Size of distrib clone (len 162) after hiding of merged clone"
    assert ( $b.clone_info("19")[:size].text == "6.000%"), ">> Size of distrib clone (len 164) after hiding of merged clone"
    $b.clear_filter.click

    $b.a(:id => 'list_split_all').click
    $b.span(:id => "delBox_list_2").click
  end


  # def test_07_sendto_dsitrbib
  #    $b.clone_in_scatterplot("18").click
  #   $b.clone_in_scatterplot("156").click
  #   $b.a(:id => "focus_selected").click
  #   sleep(3)
  #   # use sentTo with only distrib clones
  # end

  def test_08_test_list_appearance
    # filter list --> acag
    filter = $b.filter_area
    filter.value = 'acag'
    $b.send_keys :enter
    $b.update_icon.wait_while(&:present?)
    assert (     $b.clone_in_list('0').present?),  ">> real clone exist in list"
    assert ( not $b.clone_in_list('18').present?), ">> distrib clone is hidden"
    # other ???
    # update ???
    $b.clear_filter.click
    $b.clone_in_scatterplot('1').hover
  end

  
  def test_09_color
    # test color for 3 clones (real, smaller, distrib)
    assert ( $b.clone_info('0')[:name].style('color')  ==  'rgba(101, 123, 131, 1)' ) , "real clone have his standard color (grey)"
    assert ( $b.clone_info('16')[:name].style('color').start_with?('rgba(150, 150, 150, 0.65') ) , "other clone haven't changed color"
    assert ( $b.clone_info('18')[:name].style('color').start_with?('rgba(150, 150, 150, 0.65') ) , "distrib clone haven't changed color"

    # change color method and observe variation or not
    color_select = $b.select(:id => 'color_menu_select')
    color_select.click
    color_v_option = color_select.option(value: 'V')
    color_v_option.click
    $b.span(class: 'systemBoxNameMenu').hover
    $b.update_icon.wait_while(&:present?)
    assert ( $b.clone_info('0')[:name].style('color')  !=  'rgba(101, 123, 131, 1)' ) ,    "real clone should have changed color (diff from grey)"
    assert ( $b.clone_info('16')[:name].style('color').start_with?('rgba(150, 150, 150, 0.65') ) , "other clone shouldn't have changed color"
    assert ( $b.clone_info('18')[:name].style('color').start_with?('rgba(150, 150, 150, 0.65') ) , "distrib clone shouldn't have changed color"
  end

  def test_10_size_show_in_segmenter
    $b.clear_filter.click
    # Change the top to top, only TRD are not shown ?

    $b.clone_in_list("20").click
    $b.clone_in_list("21").click(:control)
    $b.clone_in_list("22").click(:control)
    $b.update_icon.wait_while(&:present?)
    stats = $b.statsline
    assert (stats.text.include? '+5 clones'), ">> Correct stats, should have '+5' clones"
    assert (stats.text.include? '50 reads'),  ">> Correct stats, should have 50 reads"
    assert (stats.text.include? '20.00%'),    ">> Correct stats, should be at 20.00%"
    # add a real clone
    $b.clone_in_list("0").click(:control)
    $b.update_icon.wait_while(&:present?)
    stats = $b.statsline
    assert (stats.text.include? '1+5 clones'), ">> Correct stats, should have '4+5' clones"
    assert (stats.text.include? '100 reads'),  ">> Correct stats, should have 100 reads"
    assert (stats.text.include? '40.00%'),     ">> Correct stats, should be at 40.00%"
  
    # add a real clone
    $b.clone_in_list("0").click
    $b.clone_in_list("1").click(:control)
    $b.clone_in_list("2").click(:control)
    $b.clone_in_list("3").click(:control)
    $b.clone_in_list("4").click(:control)
    $b.clone_in_list("17").click(:control)
    $b.clone_in_list("18").click(:control)
    $b.clone_in_list("19").click(:control)
    stats = $b.statsline
    $b.update_icon.wait_while(&:present?)
    assert (stats.text.include? '5+5 clones'), ">> Correct stats, should have '5+5' clones"
    assert (stats.text.include? '200 reads'),  ">> Correct stats, should have 50 reads"
    assert (stats.text.include? '80.00%'),     ">> Correct stats, should be at 80.00%"
  end


  # Not really a test
  def test_zz_close
    close_everything
  end
end
