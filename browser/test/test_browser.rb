require 'rubygems'
gem "minitest"
require 'watir-webdriver'
require 'test/unit'
require "minitest/autorun"
require 'minitest/ci'
if ENV['HEADLESS']
  require 'headless'
end
load 'vidjil_browser.rb'

include Test::Unit::Assertions
MiniTest.autorun

#browser test suite
class Browser < MiniTest::Test

  def self.test_order
    :alpha
  end

  def setup
    if ENV['HEADLESS'] and not defined? $headless
      $headless = Headless.new
      $headless.start
      print "debut\n"
    end

    if not defined? $b
      set_browser
    end
  end

  def set_browser
    folder_path = Dir.pwd
    folder_path.sub! '/browser/test', ''
    index_path = 'file://' + folder_path + '/browser/index.html'
    data_path = folder_path + '/doc/analysis-example.vidjil'
    analysis_path = folder_path + '/browser/test/test.analysis'

    if ENV['LIVE_SERVER']
      index_path = ENV['LIVE_SERVER'] + '/?data='
    end
      
    print "Testing Vidjil browser at " + index_path + "\n"

    $b = VidjilBrowser.new :firefox
    #$b = VidjilBrowser.new :chrome
    $b.goto index_path

    # check that the browser loaded correctly
    if not $b.div(:id => 'logo').present?
      print "Loading of Vidjil browser failed. Do not execute remaining tests."
      exit
    end

    print "Vidjil browser loaded, launching tests.\n"
    
    # A live server can be configured with a database.
    # The welcome popup should not be tested.
    
    if not ENV['LIVE_SERVER']

    # check the welcoming popup
    assert ($b.div(:id => 'popup-msg').present?), "Popup message is not present at the opening of Vidjil"
    
    # close the welcoming popup
    $b.div(:id => 'popup-msg').button(:text => 'ok').click
    assert (not $b.div(:id => 'popup-msg').present?), "Popup message still present after trying to close it"

    end
    
    $b.div(:id => 'demo_file_menu').click 
    $b.div(:id => 'demo_file_menu').a(:id => 'import_data_anchor').click
    
    # select data file
    $b.div(:id => 'file_menu').file_field(:name,"json").set(data_path)
    $b.div(:id => 'file_menu').button(:text => 'start').click 
  end

  def after_tests
  end
  
  def test_00_info_segmentation
    assert ($b.div(:id => 'info_segmented').text.include?  '742 377 reads (94.35%)'), ' Incorrect number of segmented reads'
  end


  def test_00_info_reads
    assert ($b.div(:id => 'info_total').text.include? '786 861 reads'), 'Incorrect number of reads'
  end

  def test_00_default_point_name
    assert ($b.div(:id => 'info_point').text.include? 'helloworld'), 'Incorrect point name in info box'
  end

  def test_00_germline
    assert ($b.div(:id => 'info').span(:class => 'systemBoxNameMenu').text.include? 'TRA'), 'missing system TRA'
  end

  def test_00_legend_scatterplot
    assert ($b.scatterplot_x_legend(0).text == 'TRBV1'), "Bad legend for scatterplot"
    assert ($b.scatterplot_x_legend(4).text == '?'), "Bad legend for scatterplot"
    assert ($b.scatterplot_y_legend(0).text == 'TRBJ1-1'), "Bad legend for scatterplot"
    assert ($b.scatterplot_y_legend(9).text == '?'), "Bad legend for scatterplot"
  end

  def test_00_info_point
    assert (not $b.div(:id => 'info_timepoint').present?), "Info timepoint should not be present"
    $b.div(:id => 'info_point').span(:text => 'Info').click
    assert ($b.div(:id => 'info_timepoint').visible?), "After clicking info timepoint should be visible"

    table = $b.div(:id => 'info_timepoint').table
    assert (table[1][1].text == '786861'), "Incorrect  number of reads in infopoint"
    assert (table[2][1].text.include? '742377'), "Incorrect  number of reads in infopoint"
    $b.div(:id => 'data-container').span(:class => 'closeButton').click
    assert (not $b.div(:id => 'info_timepoint').present?), "Info timepoint should not be present"
  end

  def test_01_init

      assert ( $b.clone_in_list('25').exists?), ">>fail init : clone 0 missing in list"
      assert ( $b.clone_in_scatterplot('25').exists?), ">>fail init : clone 0 missing in scatterplot"
      #assert ( $b.clone_in_graph('25').exists?), ">>fail init : clone 0 missing in graph"
      assert ( $b.clone_in_list('25').text.include? '0.130%' ) , ">>fail init : wrong clone size "

  end

  def test_02_fold_left_menu
    assert ($b.div(:id => "left-container").present?), ">> fail : left menu should be visible"
    $b.div(:id => "vertical-separator").click
    assert (not $b.div(:id => "left-container").present?), ">> fail : left menu is still visible"
    $b.div(:id => "vertical-separator").click
    assert ($b.div(:id => "left-container").present?), ">> fail : left menu did not reappear"
  end

  def test_03_rename_clone_by_clicking
    clone_name = $b.clone_info('25')[:name]
    assert (clone_name.text == 'TRBV29*01 -1/0/-0 TRBD1*01 -2/0/-5 TRBJ2-5*01'), " >> clone name is not corect"
    clone_name.double_click

    $b.clone_name_editor.set 'toto'
    $b.clone_name_saver.click
    assert (clone_name.text == 'toto'), " >> clone name has not changed"
  end

  def test_04_rename_clone_by_enter
    clone_name = $b.clone_info('25')[:name]
    assert (clone_name.text == 'toto'), " >> clone name is not correct"
    clone_name.double_click

    $b.clone_name_editor.set 'other test'
    $b.send_keys :return
    assert (clone_name.text == 'other test'), " >> clone name has not changed"

    #unselect
    $b.unselect
  end

  def check_when_list_or_scatterplot_focused
    assert ( $b.clone_in_scatterplot('25', :class => 'circle_focus').exists?), ">> fail to focus correct plot after hovering a clone in the list"
    assert ( $b.clone_in_graph('25', :class => "graph_focus").exists?), ">> fail to focus correct graphLine after hovering a clone in the list"

    clone_name = $b.clone_info('25')[:name]
    assert ( $b.infoline.text == clone_name.text), ">> Clone name is not correct in focus div"
  end

  def test_05_focus_in_list
    begin
      $b.unselect
      #test hover a clone in the list
      $b.clone_in_scatterplot('25').wait_until_present
      $b.clone_in_list('25').hover

      check_when_list_or_scatterplot_focused
    rescue
      assert (false), "missing element to run test"
    end
  end

  def test_05_focus_in_scatterplot
    begin
      $b.unselect
      $b.clone_in_scatterplot('25').wait_until_present
      $b.clone_in_scatterplot('25').hover

      check_when_list_or_scatterplot_focused
    rescue
      assert (false), "missing element to run test\n"
    end
  end

  def check_when_list_or_scatterplot_clicked
    clone_name = $b.clone_info('25')[:name]
    assert ( $b.infoline.text == clone_name.text), ">> Clone name is not correct in focus div"

    assert ( $b.clone_in_list('25').class_name == "list list_select" )
    assert ( $b.clone_in_scatterplot('25', :class => "circle_select").exists?)
    assert ( $b.clone_in_graph('25', :class=> "graph_select").exists?)
    assert ( $b.clone_in_segmenter('25').exists? ), ">> fail to add clone to segmenter by clicking on the list or scatterplot"

    stats = $b.statsline
    assert (stats.text.include? '1 clone'), ">> Incorrect stats, should have one clone"
    assert (stats.text.include? '962 reads'), ">> Incorrect stats, should have 962 reads"
    assert (stats.text.include? '0.130%'), ">> Incorrect stats, should be at 0.130%"
  end

  def test_08_click_in_list
    #test select a clone in the list
    $b.clone_in_scatterplot('25').wait_until_present
    $b.clone_info('25')[:name].click()

    check_when_list_or_scatterplot_clicked

    #unselect
    $b.unselect
    assert ( $b.clone_in_list('25').class_name == "list" )
  end

  def test_08_click_in_scatterplot
    $b.clone_in_scatterplot('25').wait_until_present
    $b.clone_in_scatterplot('25').click

    check_when_list_or_scatterplot_clicked

    #unselect
    $b.unselect
    assert ( $b.clone_in_list('25').class_name == "list" )
  end

  def test_09_normalize
    $b.clone_info('25')[:star].click
    $b.tag_selector_edit_normalisation.wait_until_present
    $b.tag_selector_edit_normalisation.set('0.01')
    $b.tag_selector_normalisation_validator.click 
    
    assert ( $b.clone_info('25')[:size].text == '1.000%' ) , ">> fail normalize on : wrong clone size "
    
    $b.menu_settings.click 
    $b.radio(:id => 'reset_norm').click
    assert ( $b.clone_info('25')[:size].text == '0.130%' ) , ">> fail normalize off : wrong clone size "
  end

  def test_10_imgt
    begin
      $b.clone_in_scatterplot('25').wait_until_present
      $b.clone_in_scatterplot('25').click
      
      $b.span(:id => "toIMGT" ).click
      
      assert ( $b.window(:title => "IMGT/V-QUEST").exists? ) , ">> fail opening IMGT "
      $b.window(:title => "IMGT/V-QUEST").use do
        assert ($b.text.include? "Number of analysed sequences: 1"), ">> fail IMGT analysis"
        assert ($b.text.include? "Homsap TRBV28*01"), ">> IMGT expected V not found"
        assert ($b.text.include? "Homsap TRBJ2-5*01"), ">> IMGT expected J not found"
      end
      
      $b.window(:title => "Vidjil").use
      
    rescue
      assert (false), "missing element to run test_08_imgt \n" 
    end
  end
  
  
  def test_11_igBlast
    begin
      $b.clone_in_scatterplot('25').wait_until_present
      $b.clone_in_scatterplot('25').click
      
      $b.span(:id => "toIgBlast" ).click
      
      assert ( $b.window(:title => "IgBLAST Search Results").exists? ) , ">> fail opening igblast "
      $b.window(:title => "IgBLAST Search Results").use do
        assert ($b.text.include? "Length=180"), ">> igblast: was not launched on the correct sequence"
        assert ($b.text.include? "TRBV28*01"), ">> igblast: expected V not found"
        assert ($b.text.include? "TRBJ2-5*01"), ">> igblast: expected Js not found"
      end
      
      $b.window(:title => "Vidjil").use
      
    rescue
      assert (false), "missing element to run test_09_igBlast \n" 
    end
  end


  def test_12_tag
    begin
      $b.clone_info('25')[:star].click
      $b.tag_item('0')[:name].click
      $b.unselect

      assert ($b.clone_info('25')[:name].style('color') ==  'rgba(220, 50, 47, 1)' ) , ">> fail tag : clone color hasn't changed"
    rescue
      assert (false), "missing element to run test_12_tag \n" 
    end
  end
  

  def test_14_edit_tag
    begin
      ## rename Tag 0
      $b.clone_info('25')[:star].click

      edit = $b.tag_item('0')[:edit]
      edit.wait_until_present
      edit.click
      $b.tag_selector_edit_name.set 'renamed_click'
      $b.tag_selector_name_validator.click

      $b.tag_selector_close.click
      $b.tag_selector.wait_while_present

      ## rename Tag 1 (on another clone)
      $b.clone_info('24')[:star].click

      edit = $b.tag_item('1')[:edit]
      edit.wait_until_present
      edit.click
      $b.tag_selector_edit_name.set 'renamed_return'
      $b.send_keys :return

      $b.tag_selector_close.click
      $b.tag_selector.wait_while_present

      ## check renames (on again another clone)
      $b.clone_info('23')[:star].click
      edit = $b.tag_item('1')[:edit]
      edit.wait_until_present

      assert ($b.tag_selector.text.include? 'renamed_click'),  "fail edit tag with mouse : tag name in tag selector hasn't changed"
      assert ($b.tag_selector.text.include? 'renamed_return'), "fail edit tag with keyboard : tag name in tag selector hasn't changed"

      $b.tag_selector_close.click
      $b.tag_selector.wait_while_present
    end
  end
  


  # Not really a test, used to close server at the end
  def test_zz_close_everything
    print "\nTests finished, closing browser.\n"
    $b.close
    if ENV['HEADLESS']
      $headless.destroy
    end
  end

end

=begin
    TODO
    save_analysis
    clipboard
    edit tag
    change axis scatterplot
    edit name
    change color method
    change color palette
    change scatterplot/graph size
    
    check x/y clone position on scatterplot
    check clone path 
=end
