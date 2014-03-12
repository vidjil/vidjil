require 'rubygems'
require 'watir-webdriver'
require 'minitest/autorun'


class TestBrowser < MiniTest::Unit::TestCase
    
    #OMG i'm so ashamed ( best function name ever !)
    i_suck_and_my_tests_are_order_dependent!
        
    
    def test_01_start
        folder_path = Dir.pwd
        $index_path = 'file://' + folder_path + '/../index.html'
        $data_path = folder_path + '/test.data'
        
        #$b = Watir::Browser.new :firefox
        $b = Watir::Browser.new :chrome
        $b.goto $index_path
        
        assert ($b.text.include? "Vidjil"), ">> fail to start Vidjil browser" 
    end
    
    
    def test_02_load
        begin
            # close the welcoming popup
            $b.div(:id => 'popup-msg').button(:text => 'start').click 

            # select data file
            $b.div(:id => 'file_menu').file_field(:name,"json").set($data_path)
            $b.div(:id => 'file_menu').button(:text => 'start').click 
            
            assert ($b.text.include? "test.data"), ">> fail to load data" 
        rescue
            assert (false), "missing element to run test_02_load \n" 
        end
    end
    

    def test_03_init
        begin
            list = $b.div(:id => 'listClones')
            
            assert ( list.li(:id => '0' ).exists?), ">>fail init : clone 0 missing in list"
            assert ( $b.element(:id => "circle0" ).exists?), ">>fail init : clone 0 missing in scatterplot"
            assert ( $b.element(:id => "polyline0" ).exists?), ">>fail init : clone 0 missing in graph"
            assert ( list.li(:id => '0' ).span(:class => 'sizeBox').text == '64.750%' ) , ">>fail init : wrong clone size "
        rescue
            assert (false), "missing element to run test_03_init \n" 
        end
    end
    
    
    def test_04_focus
        begin
            
            #test hover a clone in the list
            list = $b.div(:id => 'listClones')
            list.li(:id => '0' ).hover
            
            assert ( $b.element(:id => "circle0" ).class_name == "circle_focus"), ">> fail to focus correct plot after hovering a clone in the list"
            assert ( $b.element(:id => "polyline0" ).class_name == "graph_focus"), ">> fail to focus correct graphLine after hovering a clone in the list"
            
            #test hover a clone in the scatterplot
            $b.element(:id => "circle1" ).hover
            
            assert ( $b.element(:id => "circle1" ).class_name == "circle_focus"), ">> fail to focus correct plot after hovering a clone in the scatterplot"
            assert ( $b.element(:id => "polyline1" ).class_name == "graph_focus"), ">> fail to focus correct graphLine after hovering a clone in the scatterplot"
            
            #watir unable to do hover/click on svg path
            
        rescue
            assert (false), "missing element to run test_04_focus \n" 
        end
    end
    
    
    def test_05_select
        begin
            
            #test select a clone in the list
            list = $b.div(:id => 'listClones')
            
            #list.li(:id => '0' ).div(:class => 'nameBox2').click 
            # ".click" work with chrome but not with firefox so direct call with javascript ( a bit hadrcore ...) 
            $b.execute_script("document.getElementById('0').getElementsByClassName('nameBox2')[0].click()")
            
            assert ( list.li(:id => '0' ).class_name == "list list_select" )
            assert ( $b.element(:id => "circle0" ).class_name == "circle_select")
            assert ( $b.element(:id => "polyline0" ).class_name == "graph_select")
            assert ( $b.element(:id => "seq0" ).exists? ), ">> fail to add clone to segmenter by clicking on the list"
            
            #test select a clone in the scatteplot
            $b.element(:id => "circle1" ).click
            
            assert ( list.li(:id => '1' ).class_name == "list list_select" )
            assert ( $b.element(:id => "circle1" ).class_name == "circle_select")
            assert ( $b.element(:id => "polyline1" ).class_name == "graph_select")
            assert ( $b.element(:id => "seq1" ).exists? ), ">> fail to add clone to segmenter by clicking on the scatterplot"
            
            #watir unable to hover/click svg path
            
            #unselect
            $b.element(:id => "visu_back" ).click
            
            assert ( list.li(:id => '0' ).class_name == "list" )
            
        rescue
            assert (false), "missing element to run test_05_select \n" 
        end
    end
    
    
    def test_06_cluster
        begin
            list = $b.div(:id => 'listClones')
            $b.execute_script("m.clusterBy('V')")
            assert ( list.li(:id => '0' ).span(:class => 'sizeBox').text == '78.652%' ) , ">> fail cluster by V : wrong clone size "
            
            $b.execute_script("m.clusterBy('J')")
            assert ( list.li(:id => '0' ).span(:class => 'sizeBox').text == '69.919%' ) , ">> fail cluster by J : wrong clone size "
            
            $b.execute_script("m.resetClones()")
            assert ( list.li(:id => '0' ).span(:class => 'sizeBox').text == '64.750%' ) , ">> fail reset cluster : wrong clone size "
            
        rescue
            assert (false), "missing element to run test_06_cluster \n" 
        end
    end
    
    
    def test_07_normalize
        begin
            list = $b.div(:id => 'listClones')
            $b.execute_script("m.normalization_switch(true)")
            assert ( list.li(:id => '0' ).span(:class => 'sizeBox').text == '6.625%' ) , ">> fail normalize on : wrong clone size "
            
            $b.execute_script("m.normalization_switch(false)")
            assert ( list.li(:id => '0' ).span(:class => 'sizeBox').text == '64.750%' ) , ">> fail normalize off : wrong clone size "
        rescue
            assert (false), "missing element to run test_07_normalize \n" 
        end
    end
    
    
    def test_08_displayTop
        begin
            list = $b.div(:id => 'listClones')
            $b.execute_script("m.displayTop(100)")
            assert ( list.li(:id => '120' ).visible? ) , ">> fail display : this clone should be visible"

            $b.execute_script("m.displayTop(20)")
            assert ( not list.li(:id => '120' ).visible? ) , ">> fail display : this clone shouldn't be visible"

        rescue
            assert (false), "missing element to run test_08_displayTop \n" 
        end
    end
    
    
    def test_09_merge
        begin
            list = $b.div(:id => 'listClones')
            #select 3 clones
            $b.element(:id => "circle0" ).click
            $b.element(:id => "circle1" ).click
            $b.element(:id => "circle2" ).click
            
            #merge
            #$b.span(:id => "merge" ).click
            $b.execute_script("m.merge()")
            assert ( list.li(:id => '0' ).span(:class => 'sizeBox').text == '75.546%' ) , ">> fail clustering : wrong clone size "
            
            #unmerge
            $b.execute_script("m.resetClones()")
            assert ( list.li(:id => '0' ).span(:class => 'sizeBox').text == '64.750%' ) , ">> fail unclustering : wrong clone size "
            
            #unselect
            $b.element(:id => "visu_back" ).click
            
        rescue
            assert (false), "missing element to run test_09_merge \n" 
        end
    end
    
    
    def test_10_imgt
        begin
            list = $b.div(:id => 'listClones')
            #select 3 clones
            $b.element(:id => "circle0" ).click
            $b.element(:id => "circle1" ).click
            $b.element(:id => "circle2" ).click
            
            $b.span(:id => "toIMGT" ).click
            
            assert ( $b.window(:title => "IMGT/V-QUEST").exists? ) , ">> fail opening IMGT "
            $b.window(:title => "IMGT/V-QUEST").use do
                assert ($b.text.include? "Number of analysed sequences: 3"), ">> fail IMGT analysis" 
            end
 
            $b.window(:title => "Vidjil").use
            
            #unselect
            $b.element(:id => "visu_back" ).click
            
        rescue
            assert (false), "missing element to run test_10_imgt \n" 
        end
    end
    
    
    def test_11_igBlast
        begin
            list = $b.div(:id => 'listClones')
            #select 3 clones
            $b.element(:id => "circle5" ).click
            $b.element(:id => "circle8" ).click
            $b.element(:id => "circle12" ).click
            
            $b.span(:id => "toIgBlast" ).click
            
            assert ( $b.window(:title => "IgBLAST Search Results").exists? ) , ">> fail opening igblast "
            $b.window(:title => "IgBLAST Search Results").use do
                assert ($b.text.include? "Index for multiple query sequences (total = 3)"), ">> fail igblast analysis" 
            end
 
            $b.window(:title => "Vidjil").use
            
            #unselect
            $b.element(:id => "visu_back" ).click
            
        rescue
            assert (false), "missing element to run test_11_igBlast \n" 
        end
    end
    
    
    def test_99_end
        begin
            #$b.close
        rescue
            assert (false), "missing element to run test_99_end \n" 
        end
    end
    
=begin
    TODO
    load_analysis
    save_analysis
    align
    clipboard
    change tag
    edit tag
    change axis scatterplot
    edit name
    change color method
    change color palette
    change scatterplot/graph size
    
    check x/y clone position on scatterplot
    check clone path 
=end
    
end
