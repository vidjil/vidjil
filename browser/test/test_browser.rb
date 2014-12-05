require 'rubygems'
gem "minitest"
require 'watir-webdriver'
require 'test/unit'
require "minitest/autorun"
require 'minitest/ci'
if ENV['HEADLESS']
  require 'headless'
end

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
        index_path = 'file://' + folder_path + '/../index.html'
        data_path = folder_path + '/../../doc/analysis-example1.vidjil'
        analysis_path = folder_path + '/test.analysis'

        $b = Watir::Browser.new :firefox
        #$b = Watir::Browser.new :chrome
        $b.goto index_path

        # close the welcoming popup
        $b.div(:id => 'popup-msg').button(:text => 'ok').click
        assert (not $b.div(:id => 'popup-msg').present?), "Popup message still present"

        $b.div(:id => 'demo_file_menu').click 
        $b.div(:id => 'demo_file_menu').a(:id => 'import_data_anchor').click
        
        # select data file
        $b.div(:id => 'file_menu').file_field(:name,"json").set(data_path)
        $b.div(:id => 'file_menu').button(:text => 'start').click 
  end

  def after_tests
  end
    
  def test_00_info_segmentation
    assert ($b.div(:id => 'info_segmented').text.include?  '335662 reads (76.78%)'), ' Incorrect number of segmented reads'
  end

  def test_00_info_reads
    assert ($b.div(:id => 'info_total').text.include? '437164 reads'), 'Incorrect number of reads'
  end

  def test_00_default_point_name
    assert ($b.div(:id => 'info_point').text.include? 'T8045-BC081-Diag'), 'Incorrect point name in info box'
    assert ($b.element(:id => 'time0').text.include? 'T8045-BC081-Diag'), 'Incorrect point name on plot'
  end

  def test_00_germline
    assert ($b.div(:id => 'info').span(:class => 'systemBoxNameMenu').text == 'GTRG'), 'Incorrect system name'
  end

  def test_00_legend_scatterplot
    assert ($b.element(:id => 'visu_axis_x_container').element(:class => 'sp_legend', :index => 0).text == 'TRGV5'), "Bad legend for scatterplot"
    assert ($b.element(:id => 'visu_axis_x_container').element(:class => 'sp_legend', :index => 1).text == '?'), "Bad legend for scatterplot"
    assert ($b.element(:id => 'visu_axis_y_container').element(:class => 'sp_legend', :index => 0).text == 'TRGJ1'), "Bad legend for scatterplot"
    assert ($b.element(:id => 'visu_axis_y_container').element(:class => 'sp_legend', :index => 1).text == '?'), "Bad legend for scatterplot"
  end

  def test_00_info_point
    assert (not $b.div(:id => 'info_timepoint').visible?), "Info timepoint should not be visible"
    $b.div(:id => 'info_point').span(:text => 'Info').click
    assert ($b.div(:id => 'info_timepoint').visible?), "After clicking info timepoint should be visible"

    table = $b.div(:id => 'info_timepoint').table
    assert (table[1][1].text == '437164'), "Incorrect  number of reads in infopoint"
    assert (table[2][1].text.include? '335662'), "Incorrect  number of reads in infopoint"
  end
 
    def test_01_init
        begin
            list = $b.div(:id => 'list_clones')
            
            assert ( list.li(:id => '0' ).exists?), ">>fail init : clone 0 missing in list"
            assert ( $b.element(:id => "circle0" ).exists?), ">>fail init : clone 0 missing in scatterplot"
            assert ( $b.element(:id => "polyline0" ).exists?), ">>fail init : clone 0 missing in graph"
            assert ( list.li(:id => '0' ).span(:class => 'sizeBox').text == '72.47%' ) , ">>fail init : wrong clone size "
        rescue
            assert (false), "missing element to run test_01_init \n" 
        end
    end

    def test_02_fold_left_menu
      assert ($b.div(:id => "left-container").present?), ">> fail : left menu should be visible"
      $b.div(:id => "vertical-separator").click
      assert (not $b.div(:id => "left-container").present?), ">> fail : left menu is still visible"
      $b.div(:id => "vertical-separator").click
      assert ($b.div(:id => "left-container").present?), ">> fail : left menu did not reappear"
    end

    def test_03_rename_clone_by_clicking
      clone_name = $b.div(:id => 'list_clones').li(:id => '0').div(:class => 'nameBox')
      assert (clone_name.text == 'clone-001'), " >> clone name is no corect"
      clone_name.double_click

      clone_name.text_field(:id => 'new_name').set 'toto'
      clone_name.a(:id => 'btnSave').click
      assert (clone_name.text == 'toto'), " >> clone name has not changed"
    end

    def test_04_rename_clone_by_enter
      clone_name = $b.div(:id => 'list_clones').li(:id => '0').div(:class => 'nameBox')
      clone_name.double_click

      clone_name.text_field(:id => 'new_name').set 'other test'
      $b.send_keys :return
      assert (clone_name.text == 'other test'), " >> clone name has not changed"
    end

    def test_05_focus_in_list
        begin    
            #test hover a clone in the list
            list = $b.div(:id => 'list_clones')
            $b.element(:id => "circle0" ).wait_until_present
            list.li(:id => '0' ).hover

            assert ( $b.element(:id => "circle0", :class => "circle_focus" ).exists?), ">> fail to focus correct plot after hovering a clone in the list"
            assert ( $b.element(:id => "polyline0", :class => "graph_focus" ).exists?), ">> fail to focus correct graphLine after hovering a clone in the list"
        rescue
          assert (false), "missing element to run test"
        end
    end

    def test_06_focus_in_scatterplot
      begin
            $b.element(:id => "circle0" ).wait_until_present
            $b.element(:id => "circle0" ).hover
            assert ( $b.element(:id => "circle0", :class => "circle_focus" ).exists?), ">> fail to focus correct plot after hovering a clone in the scatterplot"
            assert ( $b.element(:id => "polyline0", :class => "graph_focus" ).exists?), ">> fail to focus correct graphLine after hovering a clone in the scatterplot"
        rescue
            assert (false), "missing element to run test\n"
      end
    end

    def test_07_focus_in_graph
      begin
        $b.element(:id => "circle0" ).wait_until_present
        $b.element(:id => "polyline0" ).hover
        assert ( $b.element(:id => "circle0", :class => "circle_focus" ).exists?), ">> fail to focus correct plot after hovering a clone in the graph"
        assert ( $b.element(:id => "polyline0", :class => "graph_focus" ).exists?), ">> fail to focus correct graphLine after hovering a clone in the graph"
      rescue
        assert (false), "missing element to run test\n"
      end
    end

    def test_08_click_in_list
            #test select a clone in the list
            list = $b.div(:id => 'list_clones')
            
            $b.element(:id => "circle0").wait_until_present
            list.li(:id => '0' ).div(:class => 'nameBox').click
            assert ( list.li(:id => '0' ).class_name == "list list_select" )
            assert ( $b.element(:id => "circle0", :class => "circle_select" ).exists?)
            assert ( $b.element(:id => "polyline0", :class => "graph_select" ).exists?)
            assert ( $b.element(:id => "seq0" ).exists? ), ">> fail to add clone to segmenter by clicking on the list"

            #unselect
            $b.element(:id => "visu_back" ).click
            assert ( list.li(:id => '0' ).class_name == "list" )
    end

    def test_08_click_in_scatterplot
            list = $b.div(:id => 'list_clones')
            $b.element(:id => "circle0").wait_until_present
            $b.element(:id => "circle0" ).click
            assert ( list.li(:id => '0' ).class_name == "list list_select" )
            assert ( $b.element(:id => "circle0", :class => "circle_select" ).exists?)
            assert ( $b.element(:id => "polyline0", :class => "graph_select" ).exists?)
            assert ( $b.element(:id => "seq0" ).exists? ), ">> fail to add clone to segmenter by clicking on the scatterplot"

            #unselect
            $b.element(:id => "visu_back" ).click
            assert ( list.li(:id => '0' ).class_name == "list" )
    end

    def test_09_normalize
        begin
            list = $b.div(:id => 'list_clones')
            elem = $b.div(:id => 'list_clones').li(:id => '0')
            tagSelector = $b.div(:id => 'tagSelector')
            
            elem.div(:class => 'starBox').click
            $b.element(:id => 'normalized_size').wait_until_present
            $b.text_field(:id => 'normalized_size').set('0.01')
            tagSelector.button(:text => 'ok').click 
            
            assert ( list.li(:id => '0' ).span(:class => 'sizeBox').text == '1.000%' ) , ">> fail normalize on : wrong clone size "
            
            $b.div(:id => 'settings_menu').click 
            $b.radio(:id => 'reset_norm').click
            assert ( list.li(:id => '0' ).span(:class => 'sizeBox').text == '72.47%' ) , ">> fail normalize off : wrong clone size "
        rescue
            assert (false), "missing element to run test_05_normalize \n"
        end
    end

    def test_10_imgt
        begin
            $b.element(:id => "circle0").wait_until_present
            $b.element(:id => "circle0" ).click
            
            $b.span(:id => "toIMGT" ).click
            
            assert ( $b.window(:title => "IMGT/V-QUEST").exists? ) , ">> fail opening IMGT "
            $b.window(:title => "IMGT/V-QUEST").use do
                assert ($b.text.include? "Number of analysed sequences: 1"), ">> fail IMGT analysis"
                assert ($b.text.include? "Homsap TRGV5*01"), ">> IMGT expected V not found"
                assert ($b.text.include? "Homsap TRGJ1*02"), ">> IMGT expected J not found"
            end
 
            $b.window(:title => "Vidjil").use
            
        rescue
            assert (false), "missing element to run test_08_imgt \n" 
        end
    end
    
    
    def test_11_igBlast
        begin
            $b.element(:id => "circle0").wait_until_present
            $b.element(:id => "circle0" ).click
            
            $b.span(:id => "toIgBlast" ).click
            
            assert ( $b.window(:title => "IgBLAST Search Results").exists? ) , ">> fail opening igblast "
            $b.window(:title => "IgBLAST Search Results").use do
                assert ($b.text.include? "Query= clone-001"), ">> fail igblast analysis"
                assert ($b.text.include? "TRGV5*01"), ">> igblast: expected V not found"
                assert ($b.text.include? "TRGJ1*02,TRGJ1*01,TRGJ2*01"), ">> igblast: expected Js not found"
            end
 
            $b.window(:title => "Vidjil").use
            
        rescue
            assert (false), "missing element to run test_09_igBlast \n" 
        end
    end


        def test_12_tag
        begin
            elem = $b.div(:id => 'list_clones').li(:id => '0')
            tagSelector = $b.div(:id => 'tagSelector')
            
            elem.div(:class => 'starBox').click
            tagSelector.span(:class => 'tagName0').click
            $b.element(:id => "visu_back" ).click

            assert (elem.div(:class => 'nameBox').style('color') ==  'rgba(220, 50, 47, 1)' ) , ">> fail tag : clone color hasn't changed"
            
        rescue
            assert (false), "missing element to run test_13_tag \n" 
        end
    end
    

    def test_14_edit_tag
        begin
            elem = $b.div(:id => 'list_clones').li(:id => '1')
            tagSelector = $b.div(:id => 'tagSelector')
            filterMenu = $b.div(:id => 'filter_menu')
            
            elem.div(:class => 'starBox').click
            tagSelector.span(:class => 'edit_button').click
            tagSelector.text_field(:id => 'new_tag_name').set 'test_tag'
            tagSelector.a(:id => 'btnSaveTag').click 
            
            filterMenu.click
            assert ( filterMenu.text.include? 'test_tag') , "fail edit tag : tag name in display menu hasn't changed"
            
            elem.div(:class => 'starBox').click
            assert ( tagSelector.text.include? 'test_tag') , "fail edit tag : tag name in tag selector hasn't changed"
            
            tagSelector.span(:class => 'closeButton').click
            
        rescue
            assert (false), "missing element to run test_14_edit_tag \n" 
        end
    end

    # Not really a test, used to close server at the end
    def test_zz_close_everything
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
