# coding: utf-8
load 'vidjil_browser.rb'
load 'browser_test.rb'

#browser test suite
class TestNormalization < BrowserTest

    def setup
        super
        if not defined? $b
        set_browser("/doc/analysis-example.vidjil")
        $b.div(:id => 'tip-container').div(:class => 'tip_1').element(:class => 'icon-cancel').click
        end
    end


    def after_tests
    end


    def test_00_normalization_none
        $b.element(:id => 'settings_menu').click
        assert ($b.div(:id => 'normalize_list').visible?), "After clicking normalize_list form should be visible"
        assert ($b.div(:id => 'reset_norm').present?), "Form have the input for reset normalization"
        $b.execute_script(' showSelector("settingsSelector"); console.log( "hide settings")')
        $b.send_keys :escape
    end


    def test_01_normalization_expected
        set_browser("/doc/analysis-example.vidjil")
        
        $b.div(:id => 'color25').click
        $b.text_field(:id => 'norm_button').set '0.1'
        $b.send_keys :enter
        
        assert ($b.span(:text => '10.00%').present?), "Span show correct normalized size"

        $b.element(:id => 'settings_menu').click
        assert ($b.div(:id => 'normalize_list').visible?), "After clicking normalize_list form should be visible"
        assert ($b.div(:id => 'normalizetest25').present?), "Form have the input for expected normalization"
        
        $b.div(:id => 'reset_norm').click
        $b.send_keys :escape
        
        assert ($b.span(:text => '0.129%').present?), "Span show correct size after reset normalization"
    end


    def test_02_normalization_external
        set_browser("/doc/analysis-example.vidjil")
        assert ($b.span(:text => '0.122%').present?), "Span show correct normalized size (external) by default"
        
        $b.element(:id => 'settings_menu').click
        assert ($b.div(:id => 'normalize_list').visible?), "After clicking normalize_list form should be visible"
        assert ($b.div(:id => 'normalize_external').present?), "Form have the input for external normalization"
        assert (not $b.div(:id => 'normalizetest25').present?), "Form have not the input for expected normalization"
        
        $b.div(:id => 'reset_norm').click
        
        assert ($b.span(:text => '0.081%').present?), "Span show correct size after reset normalization"
    end


    def test_zz_close
       close_everything
    end


end
