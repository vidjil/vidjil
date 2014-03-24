require 'rubygems'
require 'watir-webdriver'
require 'test/unit'
require "minitest/autorun"

include Test::Unit::Assertions
MiniTest::Unit.autorun

#custom runner
class MyMiniTest
    class Unit < MiniTest::Unit

        #open browser and load default data
        def before_suites
            folder_path = Dir.pwd
            index_path = 'file://' + folder_path + '/../index.html'
            data_path = folder_path + '/test.data'
            analysis_path = folder_path + '/test.analysis'
            
            $b = Watir::Browser.new :firefox
            #$b = Watir::Browser.new :chrome
            $b.goto index_path

            # close the welcoming popup
            $b.div(:id => 'popup-msg').button(:text => 'start').click 

            # select data file
            $b.div(:id => 'file_menu').file_field(:name,"json").set(data_path)
            $b.div(:id => 'file_menu').button(:text => 'start').click 
            
            sleep 2
        end

        #close browser
        def after_suites
            $b.close
        end

        #test suite launcher
        def _run_suites(suites, type)
            begin
                before_suites
                super(suites, type)
            ensure
                after_suites
            end
        end

        def _run_suite(suite, type)
            begin
                suite.before_suite if suite.respond_to?(:before_suite)
                super(suite, type)
            ensure
                suite.after_suite if suite.respond_to?(:after_suite)
            end
        end

    end
end


MiniTest::Unit.runner = MyMiniTest::Unit.new

#browser test suite
class BrowserTest < MiniTest::Unit::TestCase

    #before all tests
    def self.before_suite
        
    end

    #after all tests
    def self.after_suite
        
    end
    
    #after each tests
    def teardown
        $b.window(:title => "Vidjil").use do
            $b.execute_script("m.resetClones()")
            $b.element(:id => "visu_back" ).click 
        end
    end
    

    def test_01_init
        begin
            list = $b.div(:id => 'list_clones')
            
            assert ( list.li(:id => '0' ).exists?), ">>fail init : clone 0 missing in list"
            assert ( $b.element(:id => "circle0" ).exists?), ">>fail init : clone 0 missing in scatterplot"
            assert ( $b.element(:id => "polyline0" ).exists?), ">>fail init : clone 0 missing in graph"
            assert ( list.li(:id => '0' ).span(:class => 'sizeBox').text == '64.75%' ) , ">>fail init : wrong clone size "
        rescue
            assert (false), "missing element to run test_01_init \n" 
        end
    end
    
    
    def test_02_focus
        begin
            
            #test hover a clone in the list
            list = $b.div(:id => 'list_clones')
            list.li(:id => '0' ).hover
            
            assert ( $b.element(:id => "circle0" ).class_name == "circle_focus"), ">> fail to focus correct plot after hovering a clone in the list"
            assert ( $b.element(:id => "polyline0" ).class_name == "graph_focus"), ">> fail to focus correct graphLine after hovering a clone in the list"
            
            #test hover a clone in the scatterplot
            $b.element(:id => "circle1" ).hover
            
            assert ( $b.element(:id => "circle1" ).class_name == "circle_focus"), ">> fail to focus correct plot after hovering a clone in the scatterplot"
            assert ( $b.element(:id => "polyline1" ).class_name == "graph_focus"), ">> fail to focus correct graphLine after hovering a clone in the scatterplot"
            
            #watir unable to do hover/click on svg path
            
        rescue
            assert (false), "missing element to run test_02_focus \n" 
        end
    end
    
    
    def test_03_select
        begin
            
            #test select a clone in the list
            list = $b.div(:id => 'list_clones')
            
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
            assert (false), "missing element to run test_03_select \n" 
        end
    end
    
    
    def test_04_cluster
        begin
            list = $b.div(:id => 'list_clones')
            $b.execute_script("m.clusterBy('V')")
            assert ( list.li(:id => '0' ).span(:class => 'sizeBox').text == '78.65%' ) , ">> fail cluster by V : wrong clone size "
            
            $b.execute_script("m.clusterBy('J')")
            assert ( list.li(:id => '0' ).span(:class => 'sizeBox').text == '69.92%' ) , ">> fail cluster by J : wrong clone size "
            
            $b.execute_script("m.resetClones()")
            assert ( list.li(:id => '0' ).span(:class => 'sizeBox').text == '64.75%' ) , ">> fail reset cluster : wrong clone size "
            
        rescue
            assert (false), "missing element to run test_04_cluster \n" 
        end
    end
    
    
    def test_05_normalize
        begin
            list = $b.div(:id => 'list_clones')
            $b.execute_script("m.normalization_switch(true)")
            assert ( list.li(:id => '0' ).span(:class => 'sizeBox').text == '6.625%' ) , ">> fail normalize on : wrong clone size "
            
            $b.execute_script("m.normalization_switch(false)")
            assert ( list.li(:id => '0' ).span(:class => 'sizeBox').text == '64.75%' ) , ">> fail normalize off : wrong clone size "
        rescue
            assert (false), "missing element to run test_05_normalize \n" 
        end
    end
    
    
    def test_06_displayTop
        begin
            list = $b.div(:id => 'list_clones')
            $b.execute_script("m.displayTop(100)")
            assert ( list.li(:id => '120' ).visible? ) , ">> fail display : this clone should be visible"

            $b.execute_script("m.displayTop(20)")
            assert ( not list.li(:id => '120' ).visible? ) , ">> fail display : this clone shouldn't be visible"

        rescue
            assert (false), "missing element to run test_06_displayTop \n" 
        end
    end
    
    
    def test_07_merge
        begin
            list = $b.div(:id => 'list_clones')
            #select 3 clones
            $b.element(:id => "circle0" ).click
            $b.element(:id => "circle1" ).click
            $b.element(:id => "circle2" ).click
            
            #merge
            #$b.span(:id => "merge" ).click
            $b.execute_script("m.merge()")
            assert ( list.li(:id => '0' ).span(:class => 'sizeBox').text == '75.55%' ) , ">> fail clustering : wrong clone size "
            
            #unmerge
            $b.execute_script("m.resetClones()")
            assert ( list.li(:id => '0' ).span(:class => 'sizeBox').text == '64.75%' ) , ">> fail unclustering : wrong clone size "
            
        rescue
            assert (false), "missing element to run test_07_merge \n" 
        end
    end
    
    
    def test_08_imgt
        begin
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
            
        rescue
            assert (false), "missing element to run test_08_imgt \n" 
        end
    end
    
    
    def test_09_igBlast
        begin
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
            
        rescue
            assert (false), "missing element to run test_09_igBlast \n" 
        end
    end
    
    
    def test_10_align
        #TODO find a way to use local cgi
        skip 
        
        begin
            #select 2 clones
            $b.element(:id => "circle1" ).click
            $b.element(:id => "circle0" ).click
            
            assert ($b.text.include? "GGTCTATTACTGTGCCACCTTCTGACATAAGAAACTCTTTGGCAGTGGA"), ">> fail to display sequence"
            
            $b.span(:id => "align" ).click
            
            assert ($b.text.include? "CTT---CTG-AC-AT--AAGAAACT--CTTT-GG--C-A-G-TG---G-AA"), ">> fail to align sequences" 
            
        rescue
            assert (false), "missing element to run test_10_align \n" 
        end
    end
  
    
end

=begin
    TODO
    load_analysis
    save_analysis
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