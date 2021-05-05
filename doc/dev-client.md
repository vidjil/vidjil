
Here are aggregated notes forming a part of the developer documentation on the Vidjil web client.
These notes are a work-in-progress, they are not as polished as the user documentation.
Developers should also have a look at the [documentation for bioinformaticians and server administrators](/),
at the [issues](http://gitlab.vidjil.org), at the commit messages, and at the source code.

# Development notes -- Client

## Installation

Run a `make` into `browser/` to get the necessary files.
This will in particular get the germline files as well as the icon files.

Opening the `browser/index.html` file is then enough to get a functionning client,
able to open `.vidjil` files with the `import/export` menu.

To work with actual data, the easiest way is to copy `js/conf.js.sample` to `js/conf.js`.
This will unlock the `patients` menu and allow your local client
to access the public server at <http://app.vidjil.org/>.

## Installation with Docker

This section is intended for people wanting to install a vidjil client using docker
WITHOUT a vidjil server. If you wish to install a vidjil server altogether with your client
please refer to the docker section in dev-server.md.

### Setup 

The config file that will be used by the client can be found at vidjil-client/conf/conf.js

Since this installation does not provide a Vidjil server it is recommended to disable the use of databases,

``` json
"use_database" : false,
```

or to provide an URL to connect to an existing one online.

``` json
"db_address" : "https://VIDJILSERVERURL/vidjil",
```

### Starting the environment

The vidjil Docker environment is managed by Docker Compose since it is composed of 
several different services, but a single service, nginx, is required to run the vidjil client,
for a more detailed explanation on other services see dev-server.md.

Ensure your docker-compose.yml contains the correct reference to the
vidjil-client image you want to use. Usually this will be vidjil/vidjil-client:latest,
but more tags are available at <https://hub.docker.com/r/vidjil/vidjil/tags/>.

Running the following command will automatically download any missing
images and start the environment:

``` bash
docker-compose up nginx
```


## Client API and permanent URLs

The client can be opened on a data file specified from a `data` attribute,
and optionally on an analysis file specified from a `analysis` attribute,
as in the following URLs on our test server:

  - <http://app.vidjil.org/browser/?data=test.vidjil>
  - <http://app.vidjil.org/browser/?data=test.vidjil&analysis=test.analysis>
  - <http://app.vidjil.org/browser/?data=http://app.vidjil.org/browser/test.vidjil>

Both GET and POST requests are accepted.
Note that the `browser/index.html` file and the `.vidjil/.analysis` files should be hosted on the same server.
Otherwise, the server hosting the `.vidjil/.analysis` files must accept cross-domain queries.

The client can also load data from a server (see below, requires logging) using url parameters to pass file identifiers,
as in <http://app.vidjil.org/?set=3241&config=39>

|             |               |
| ----------- | ------------- |
| `set=xx`    | sample set id |
| `config=yy` | config id     |

or directly inside the URL for a shortened version, as in <http://app.vidjil.org/3241-39/>


Older formats (patients, run…) are also supported for compatibility but deprecated.
Moreover, the state of the client can be encoded in the URL, as in <http://app.vidjil.org/3241-39/?plot=v,size,bar&clone=11,31>

|                  |                       |
| ---------------- | --------------------- |
| `plot=x,y,m`     | plot (x axis, y axis) |
| `clone=xx,xx,xx` | selected clone ids    |

For `plot` the axis names are found in `browser/js/axes.js`. `m` is optional, and defines the type of plot (either `grid` or `bar`).

We intend to encode more parameters in the URL.

## Architecture

The Vidjil client is a set of *views* linked to a same *model*.
The model keeps the views in sync on some global properties,
most notably dealing with the selection of clones, with the clone filtering,
as well with the locus selection.

  - The model (`js/model.js`) is the main object of the Vidjil client.
    It loads and saves `.vidjil` json data (either directly from data, or from a local file, or from some url).
    It provides function to access and edit information on the clones and on the global parameters
    It keeps all the views in sync.

  - Each of the views (`Graph`, `ScatterPlot`, `List`, `Segment`) is rendered inside one or several `<div>` elements,
    and kept sync with the model. All the views are optional, and several views of the same type can be added.
    See `js/main.js` for the invocation

  - The link with the patient database/server is done with the `Database` object (`js/database.js`)

  - Other objects: `Report`, `Shortcut`
    Extends functionalities but requires elements from the full `index.html`.


### Clone attributes

Clone use [boolean mask](https://en.wikipedia.org/wiki/Mask_(computing)) in order to specify attributes. 
These attributes allow specific behavior inside the client.


C_SIZE_CONSTANT
C_SIZE_DISTRIB
C_SIZE_OTHER

Each clone has one (and only one) attributes linked to his type/size.
Either its raw size is constant (`_CONSTANT`), either it is computed from other clones (`_DISTRIB`, `_OTHER`).
Note that, that in each case, the displayed size can be different from the raw size
due to normalizations.


C_INTERACTABLE

The clone can be selected by the user. It can be focused in, or hidden.


C_CLUTERIZABLE

The clone can be clustered with other clones. This clone should also be C_INTERACTABLE.


C_INSCATTERPLOT 

Each clone that has values on the current axes will be displayed in the 'scatterplot' panel.

.sequence

Each clone that has a sequence will be displayed in the bottom 'segmenter' panel.

### Creation of common clones

Three types of clone are now created combining some of the attributes
In the following example, `data` is an map specifying values for a clone (locus, segments, number of reads, ...).


* `Constant` clone: actual individual clones,
described into an item of the `clones` list in the `.vidjil` file

```javascript
// Constant
new Clone(data, model, index, C_SIZE_CONSTANT | C_CLUSTERIZABLE | C_INTERACTABLE | C_IN_SCATTERPLOT);
```

* `Other`, or smaller clones: corresponding to the sum of each clones of a given locus, with size dynamically computed to take into account the current filter and viewable constant clones.

```javascript
// Other
new Clone(data, model, index, C_SIZE_OTHER);
```

* `Distribution` clones correspond to `distributions` lists of the `.vidjil` file. 
See "distributions" in `vidjil-format.md`.
They are aggregate information on clones that won't be shown individually in the client,
and are useful to display views such a "simulated Genescan".
They are generated by `model.loadAllDistribClones()`, that agregates such data for each sample. 

```javascript
// Distributions
new Clone(data, model, index, C_SIZE_DISTRIB | C_INTERACTABLE | C_IN_SCATTERPLOT );
```
### Update mechanism

Views object are used to display the content of an Object.model() 
The views are using 3 different update functions to synchronyze the data stored in the model and the content they display.
If you make any change to the model you should use one of these functions to resync the view with it.

#### updateElemStyle(list[])
	
##### What does it do :
UpdateElemStyle take a list of clone ID and update the look of those clones in the view.
really fast, this usually does not need any complex redraw and is dealt with a simple change in a css attribute.

##### When should it be used :
* if the clone state(selected/onFocus/hidden/...) has changed but not his data values (name/size/v/d/j/...)
* if the colorMethod used in the model has changed

#### updateElem(list[])

##### What does it do :
UpdateElem take a list of clone ID and update them fully in the view.

##### When should it be used :
* after an operation that modify a clone data values(name/size/v/d/j/...)
* after a clone rename or any clustering operations for example.

#### update() 

##### What does it do :
redraw the view from scratch.

##### When should it be used :
* after a change in the view parameters (like the selected axis or the scale used)
* if a change on how is computed the clones data values(name/size/v/d/j/...) is made.
(for example, anything that change the results of the getSize() or getName() functions for the clones, like a change in the germline selection, the normalization or the selected sample)

#### model updates
most of the time you will not call the view updates functions but the model equivalent that take care to call the updates on all the views linked to it.

m.update()
m.updateElem()
m.updateElemList()

## Integrating the client

### HTML and CSS

  - The `index.html` contains the `<div>` for all views and the menus

  - The CSS (`css/light.css`) is generated by `less` from `css/vidjil.less`

  - The `small_example.html` is a minimal example embedding basic HTML, CSS, as well as some data.
    As the menus are not embedded in this file, functionalities should be provided by direct calls to the models and the views.

### Javascript

  - The wonderful library `require.js` is used, so there is only one file to include
    \<script data-main="js/app.js" src="js/lib/require.js"\>\</script\>

  - `js/main.js` creates the different views and binds them to the model.
    Another option is to directly define a function named `main()`, as in `small_example.html`.

### JSON .vidjil data

Clone lists can be passed to the model through several ways:

  - directly by the user (import/export)
  - from a patient database (needs a database)
  - trough the API (see below)
  - or by directly providing data through Javascript (as in `small_example.html`)

The first three solutions need some further elements from the full `index.html`.

## Notifications

### Priority

\#<span id="browser:priority"></span>
The priority determines how the notification are shown and what action the
user should do. The priorities can be between 0 and 3.

  - 0  
    The notification is not shown
  - 1  
    The notification is shown (usually on green background) and
    automatically disappears
  - 2  
    The notification is shown (usually on yellow background) and
    automatically disappears
  - 3  
    The notification is shown (usually on red background) and doesn't
    disappear until the user clicks on it.

In the `console.log`, the field `priority` takes one of those priorities.

## Plots

### How to add something to be plotted

You want to add a dimension in the scatterplot or as a color? Read the
following.

1.  Scatterplot
    
    In [scatterPlot.js](../browser/js/scatterPlot.js), the `available_axis` object defines the dimensions that
    can be displayed. It suffices to add an entry so that it will be proposed
    in the X and Y axis. This kind of way of doing should be generalized to
    the other components.
    
    The presets are defined in the `preset` object.

2.  Color
    
    Adding a color needs slightly more work than adding a dimension in the
    scatterplot.
    
    The function `updateColor` in file [clone.js](../browser/js/clone.js) must be modified to add our color method.
    The variable `this.color` must contain a color (either in HTML or RGB, or…).
    
    Then a legend must be displayed to understand what the color represents.
    For this sake, modify the `build_info_color` method in [info.js](../browser/js/info.js) file. By
    default four spans are defined (that can be used) to display the legend:
    `span0`, …, `span3`.
    
    Finally modify the [index.html](../browser/index.html) file to add the new color method in the
    select box (which is under the `color_menu` ID).

## Sequence panel

### Add a sequence feature

A sequence feature can be used to highlight a specific part of a sequence.
Here for example is the sequence feature describing how to highlight the V region as available in aligner_layer.js

''' js
    'V':
    {
        'title': function (s,c) { return c.seg["5"].name;},
        'start': function (s,c) { return c.getSegStart("5"); },
        'stop': function (s,c) { return c.getSegStop("5"); },
        'className': "seq_layer_highlight",
        'style': { 'background': "#4c4" },
        'enabled': true
    }
'''
each sequence feature contains fields used to customize and locate the feature on the sequence.

  - title : [text] the content of the html title field of the feature.
  - start : [int] the position of the first nucleotide of the selected region.
  - stop : [int] the position of the last nucleotide of the selected region .
  - text : [int] (optional) text to overlay on top of the sequence.
  - condition : [boolean] (optional) sequence feature will be displayed only if true.
  - classname : [text] (optional) html classname used to customize the sequence feature look.
  - style : [object] (optional) additional css properties to further customize the sequence feature.
  - enabled : [boolean] default visibility

most field can take a static value or a function that will be able to return a specific value for each clone.

''' js
  function (s,c) { ...}
'''

 - s : the aligner_sequence object (check aligner_sequence.js to see available functions)
 - c : the clone object (check clone.js to see functions / data available)

### How to add a sequence feature in the menu

You can set the 'enabled' sequence feature field to true to always display it, or, you can edit the aligner_menu file to add an entry to the sequence panel menu allowing you to enable/disable your sequence feature with a checkbox.

example : the aligner_menu.js entry allowing to enable/disable the V/D/J regions of the sequence

''' js
  {
    'text': 'V/D/J genes',
    'title': 'Highlight V/D/J genes',
    'layers': ["V","D","J"],
    'enabled': true
  }
'''

 - text : [text] checkbox text to display in the sequence menu panel
 - title : [text] the content of the html title field of the checkbox.
 - layers : [array] a list of sequence feature name defined in aligner_layer.js to enable/disable
 - enabled : [boolean] default checkbox value

## Classes

### Clone

1.  Info box
    
    In the info box all the fields starting with a \_ are put. Also all the
    fields under the `seg` field are displayed as soon as they have a `start` and
    `stop`. Some of them can be explicitly not displayed by filling the
    `exclude_seg_info` array in `getHtmlInfo`.

## Tests

### Code Quality

Quality of code is checked using [JSHint](http://jshint.com/), by
running `make quality` from the `browser` directory.

Install with `npm install -g jshint`

### Unit

The unit tests in the client are managed by QUnit and launched using
[nightmare](http://www.nightmarejs.org/), by launching `make unit` from the `browser/test` directory.
The tests are organised in the directory
[browser/test/QUnit/testFiles](../browser/test/QUnit/testFiles). The file [data<sub>test</sub>.js](../browser/test/QUnit/testFiles/data_test.js) contains a toy
dataset that is used in the tests.

Unit tests can be launched using a real client (instead of nightmare). It
suffices to open the file [test<sub>Qunit</sub>.html](../browser/test/QUnit/test_Qunit.html). In this HTML webpage it is
possible to see the coverage. It is important that all possible functions
are covered by unit tests. Having the coverage displayed under Firefox
needs to display the webpage using a web server for security
reasons. Under Chromium/Chrome this should work fine by just opening the
webpage.

1.  Installation
    
    Nightmare is distributed withing `node` and can therefore be installed with it.
    
    ``` bash
    apt-get install nodejs-legacy npm
    npm install nightmare -g # make -C browser/test unit will automatically
    link to global nightmare installation
    ```
    
    Note that using `nightmare` for our unit testing
    requires the installation of `xvfb`.

2.  Debugging
    
    If there is a problem with the nightmare or electron (nightmare
    dependency), you may encounter a lack of output or error messages.
    To address this issue, run:
    
    ``` bash
    cd browser/test/QUnit
    DEBUG=nightmare*,electron:* node nightmare.js
    ```

### Functional

1.  Architecture
    
    The client functional testing is done in the directory
    `browser/tests/functional`, with Watir.
    The functional tests are built using two base files:
    
      - `vidjil_browser.rb`  
        abstracts the vidjil browser (avoid using IDs or
        class names that could change in the test). The tests must rely as
        much as possible on `vidjil_browser`. If access to some
        data/input/menus are missing they must be addded there.
      - `browser_test.rb`  
        prepares the environment for the tests. Each test
        file will extend this class (as can be seen in `test_multilocus.rb`)
    
    The file `segmenter_test.rb` extends the class in `browser_test.rb` to adapt
    it to the purpose of testing the analyze autonomous app.
    
    The tests are in the files whose name matches the pattern `test*.rb`. The
    tests are launched by the script in `../launch_functional_tests` which launches
    all the files matching the previous pattern. It also backs up the test
    reports as `ci_reporter` removes them before each file is run.

2.  Installation
    
    The following instructions are for Ubuntu.
    For OS X, see <https://github.com/watir/watirbook/blob/master/manuscript/installation/mac.md>.
    
    1.  Install rvm
        
        ``` bash
        curl -sSL https://get.rvm.io | sudo bash
        ```
        
        Afterwards you may need to launch:
        
        ``` bash
        source /etc/profile.d/rvm.sh
        ```
    
    2.  Install ruby 2.6.1
        
        ``` bash
        rvm install 2.6.1
        ```
    
    3.  Switch to ruby 2.6.1
        
        ``` bash
        rvm use 2.6.1
        ```
    
    4.  Install necessary gems
        
        ``` bash
        gem install minitest minitest-ci watir test-unit
        ```
    
    5.  Install web browsers
        
        The Firefox version used can be set with an environment variable (see
        below). By default, the tests only work with Firefox ≤ 45. But this can be
        modified with an environment variable. All Firefox releases are [available here](https://download-installer.cdn.mozilla.net/pub/firefox/releases/).
        
        One can instead choose to launch functional tests using chrome. You should
        install `chromium-browser` as well as `chromium-chromedriver`. On old Chrome
        versions the `chromedriver` package may not exist. In such a case you should
        [download the ChromeDriver by yourself](https://chromedriver.storage.googleapis.com/index.html?path=2.11/) (the supported Chrome versions are
        written in the `notes.txt` file of each version).

3.  Launch client tests

    As indicated previously, `rvm` must have been loaded. Thus you may need to
    first launch:
    ```bash
    source /etc/profile.d/rvm.sh
    rvm use 2.6.1
    ```
    
    Then you can launch the tests (potentially by altering its behaviour with
    environment variables, see below).

    ``` bash
    make functional
    ```
    
    1.  Environment variables
        
        By default the tests are launched on the Firefox installed on the system.
        This can be modified by providing the `WATIR_BROWSER_PATH` environment
        variable that defines the path to another Firefox version.
        
        Other environment variables that can be specified to tune the default behaviour
        
          - `WATIR_CHROME`  
            should be set to something evaluated to `True` (*e.g.* 1) if the
            tests must be launched using Chrome (in such a case
            `WATIR_BROWSER_PATH` is useless)
          - `WATIR_MARIONETTE`  
            should be set to something evalued to `True` (*e.g. 1*)
            if the tests must be launched on a recent Firefox version (\> 45)
            
    2.  If you have set a configuration file (browser/js/conf.js), you should remove it during the tests. The easiest way to do it is to launch these commands before and after the tests
    
        ``` bash
        # before tests
        mv browser/js/conf.js     browser/js/conf.js.bak 
        # after tests
        mv browser/js/conf.js.bak browser/js/conf.js    
        ```
            
4.  Headless mode
    
    On servers without a X server the client tests can be launched in headless
    mode.
    For this sake one needs to install a few more dependencies:
    
    ``` bash
    gem install headless
    ```
    
    The virtual framebuffer X server (`xvfb`) must also be installed. Depending
    on the operating system the command will be different:
    
    ``` bash
    # On Debian/Ubuntu
    apt-get install xvfb
    # On Fedora/CentOS
    yum install xvfb
    ```
    
    Then the client tests can be launched in headless mode with:
    
    ``` bash
    make headless
    ```
    
    It is possible to view the framebuffer content of `Xvfb` using `vnc`. To do so,
    launch:
    
    1.  `x11vnc -display :99 -localhost`
    2.  `vncviewer :0`

    This will work when the headless mode is launched on the local machine.
    Otherwise, when one wants to view what is going on on a distant host, one
    should additionally do port forwarding through SSH, with `ssh -L
    5900:localhost:5900 distant_host`, where 5900 is the port number on which
    the VNC server is launched. Then `vncviewer` can be launched locally with
    `vncviewer :5900`.

5.  Interactive mode
    
    For debugging purposes, it may be useful to launch Watir in interactive
    mode. In that case, you should launch `irb` in the `browser/tests/functional`
    directory.
    
    Then load the file `browser_test.rb` and create a `BrowserTest`:
    
    ``` ruby
    load 'browser_test.rb'
    bt = BrowserTest.new "toto"
    
    # Load the Vidjil client with the given .vidjil file
    bt.set_browser("/doc/analysis-example.vidjil")
    ```
    
    Finally you can directly interact with the `VidjilBrowser` using the `$b`
    variable.
    
    Another way of debugging interactively is by using (and installing) the
    `ripl` gem. Then you should add, in the `.rb` file to debug:
    
    ``` ruby
    require 'ripl'
    ```
    
    Then if you want to stop launch an `irb` arrived at a given point in the
    code, the following command must be inserted in the code:
    
    ``` ruby
    Ripl.start :binding => binding
    ```
    
    If you have to launch `irb` on a remote server without X (only using `Xvfb`)
    you may be interested to use the [redirection over SSH](https://en.wikipedia.org/wiki/Xvfb#Remote_control_over_SSH).

