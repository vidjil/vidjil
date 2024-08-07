!!! note
    Here are aggregated notes forming a part of the developer documentation on the Vidjil web client.  
    These notes are a work-in-progress, they are not as polished as the user documentation.  
    Developers should also have a look at the documentation for [bioinformaticians](vidjil-algo.md) and [server administrators](admin.md), at the [issues](http://gitlab.vidjil.org), at the commit messages, and at the source code.

# Development notes -- Client

## Installation

Run a `make` into `browser/` to get the necessary files.
This will in particular get the germline files as well as the icon files.

Opening the `browser/index.html` file is then enough to get a functioning client,
able to open `.vidjil` files with the `import/export`dev-ger menu.

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

For `plot` the axis names are found in `browser/js/axis_conf.js`. `m` is optional, and defines the type of plot (either `grid` or `bar`).

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
These attributes allow specific behavior inside the client: `C_SIZE_CONSTANT`, `C_SIZE_DISTRIB` and `C_SIZE_OTHER`.

Each clone has one (and only one) attributes linked to his type/size.
Either its raw size is constant (`_CONSTANT`), either it is computed from other clones (`_DISTRIB`, `_OTHER`).
Note that, that in each case, the displayed size can be different from the raw size
due to normalizations.

| Attributes      | Effect |
|:----------------| :------|
| C_INTERACTABLE  | The clone can be selected by the user. It can be focused in, or hidden.|
| C_CLUTERIZABLE  | The clone can be clustered with other clones. This clone should also be C_INTERACTABLE. |
| C_INSCATTERPLOT | Each clone that has values on the current axes will be displayed in the 'scatterplot' panel. |
| .sequence       | Each clone that has a sequence will be displayed in the bottom 'segmenter' panel. |

### Creation of common clones

Three types of clone are now created combining some of the attributes
In the following example, `data` is an map specifying values for a clone (locus, segments, number of reads, ...).

- `Constant` clone: actual individual clones,
  described into an item of the `clones` list in the `.vidjil` file

  ```js
  // Constant
  new Clone(data, model, index, C_SIZE_CONSTANT | C_CLUSTERIZABLE | C_INTERACTABLE | C_IN_SCATTERPLOT);
  ```

- `Other`, or smaller clones: corresponding to the sum of each clones of a given locus, with size dynamically computed to take into account the current filter and viewable constant clones.

  ```js
  // Other
  new Clone(data, model, index, C_SIZE_OTHER);
  ```

- `Distribution` clones correspond to `distributions` lists of the `.vidjil` file.
See "distributions" in `vidjil-format.md`.
They are aggregate information on clones that won't be shown individually in the client,
and are useful to display views such a "simulated Genescan".
They are generated by `model.loadAllDistribClones()`, that agregates such data for each sample.

```js
// Distributions
new Clone(data, model, index, C_SIZE_DISTRIB | C_INTERACTABLE | C_IN_SCATTERPLOT );
```

### Update mechanism

Views object are used to display the content of an Object.model() 
The views are using 3 different update functions to synchronyze the data stored in the model and the content they display.
If you make any change to the model you should use one of these functions to resync the view with it.

#### updateElemStyle(list[])

*What does it do*:  
UpdateElemStyle take a list of clone ID and update the look of those clones in the view.
really fast, this usually does not need any complex redraw and is dealt with a simple change in a css attribute.

*When should it be used*:  

- if the clone state(selected/onFocus/hidden/...) has changed but not his data values (name/size/v/d/j/...)
- if the colorMethod used in the model has changed

#### updateElem(list[])

*What does it do*:  
UpdateElem take a list of clone ID and update them fully in the view.

*When should it be used*:

- after an operation that modify a clone data values(name/size/v/d/j/...)
- after a clone rename or any clustering operations for example.

#### update()

*What does it do*:  
redraw the view from scratch.

*When should it be used*:  

- after a change in the view parameters (like the selected axis or the scale used)
- if a change on how is computed the clones data values(name/size/v/d/j/...) is made.
(for example, anything that change the results of the getSize() or getName() functions for the clones, like a change in the germline selection, the normalization or the selected sample)

#### model updates

Most of the time you will not call the view updates functions but the model equivalent that take care to call the updates on all the views linked to it.

```js
m.update()
m.updateElem()
m.updateElemList()
```

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

| Level | Effects|
|:------|:-------|
| 0     | The notification is not shown|
| 1     | The notification is shown (usually on green background) and automatically disappears|
| 2     | The notification is shown (usually on yellow background) and automatically disappears|
| 3     | The notification is shown (usually on red background) and doesn't disappear until the user clicks on it|

In the `console.log`, the field `priority` takes one of those priorities.

## Plots

### How to add something to be plotted

You want to add a dimension in the scatterplot or as a color? Read the
following.

1. Axis

    In [axes.js](../browser/js/axes.js), the `AXIS_DEFAULT` object defines the dimensions that
    can be displayed. It suffices to add an entry so that it will be proposed
    in the X and Y axis. This kind of way of doing should be generalized to
    the other components.

    Here is some of the settings you can use to customize your axis.
      - name
        a short description of the axis
      - doc
        a more detailed description of the axis
      - fct
        a javascript function that must return a value to be displayed on the axis for a given clone ID
      - scale
        used to define numerical axis min/max value
      - labels
        a list of labels that must always be present on the axis even if no clones has returned the corresponding value.
      - autofill
        autofill : true mean the list of label will be created or extended with all unique values returned by the clones.
        It will also create an adapted scale with the min/max value returned by the clones in case of a numerical axis.
      - sort
        you can provide a custom comparison function to sort the labels in a specific order

    There is also other settings that can be used to customize even further labels appearance or display, please check the already defined axes in [axes.js] to learn more about them.

1. Preset

    The presets are defined in the `preset` object that can be found in [scatterPlot_menu.js].

1. Color

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

``` js
'V': {
    'title': function (s,c) { return c.seg["5"].name;},
    'start': function (s,c) { return c.getSegStart("5"); },
    'stop': function (s,c) { return c.getSegStop("5"); },
    'className': "seq_layer_highlight",
    'style': { 'background': "#4c4" },
    'enabled': true
}
```

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

``` js
  function (s,c) { ...}
```

- s : the aligner_sequence object (check aligner_sequence.js to see available functions)
- c : the clone object (check clone.js to see functions / data available)

### How to add a sequence feature in the menu

You can set the 'enabled' sequence feature field to true to always display it, or, you can edit the aligner_menu file to add an entry to the sequence panel menu allowing you to enable/disable your sequence feature with a checkbox.

example : the aligner_menu.js entry allowing to enable/disable the V/D/J regions of the sequence

``` js
  {
    'text': 'V/D/J genes',
    'title': 'Highlight V/D/J genes',
    'layers': ["V","D","J"],
    'enabled': true
  }
```

- text : [text] checkbox text to display in the sequence menu panel
- title : [text] the content of the html title field of the checkbox.
- layers : [array] a list of sequence feature name defined in aligner_layer.js to enable/disable
- enabled : [boolean] default checkbox value

## Classes

### Clone

*Info box*

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
The tests are organized in the directory
[browser/test/QUnit/testFiles](../browser/test/QUnit/testFiles). The file [data<sub>test</sub>.js](../browser/test/QUnit/testFiles/data_test.js) contains a toy
dataset that is used in the tests.

Unit tests can be launched using a real client (instead of nightmare). It
suffices to open the file [test<sub>Qunit</sub>.html](../browser/test/QUnit/test_Qunit.html). In this HTML webpage it is
possible to see the coverage. It is important that all possible functions
are covered by unit tests. Having the coverage displayed under Firefox
needs to display the webpage using a web server for security
reasons. Under Chromium/Chrome this should work fine by just opening the
webpage.

#### Unit tests installation

Nightmare is distributed withing `node` and can therefore be installed with it.

```bash
apt-get install nodejs-legacy npm
npm install nightmare -g # make -C browser/test unit will automatically
link to global nightmare installation
```

Note that using `nightmare` for our unit testing
requires the installation of `xvfb`.

#### Debugging

If there is a problem with the nightmare or electron (nightmare
dependency), you may encounter a lack of output or error messages.
To address this issue, run:

``` bash
cd browser/test/QUnit
DEBUG=nightmare*,electron:* node nightmare.js
```

### Functional tests with cypress

The [Cypress](https://docs.cypress.io/guides/overview/why-cypress#In-a-nutshell)
testing pipeline is build on a Docker image which include the following Chrome and Firefox browsers:

|                              | Firefox | Chromium    |
|:-----------------------------|:--------|:------------|
|Legacy (until september 2021) | 62.0    | 75.0.3770.0 |
|Supported                     | 78.0    | 79.0.3945.0 |
|Latest (as at june 2021)      | 89.0    | 93.0.4524.0 |

Historic Watir tests were migrated toward Cypress.

#### Functional tests with cypress Installation

Install Docker, then either build locally the Docker image,
or download it from dockerhub

*Local build*

```bash
docker build ./docker/ci  -t "vidjilci/cypress_with_browsers:latest"
```

*Dockerhub pull*

```bash
docker pull "vidjilci/cypress_with_browsers:latest"
```

#### Usage

By default, the cypress pipeline is launched in headless mode.
The makefile rule `make functional_browser_cypress` launches the following command:

  ```bash
  docker run \
      --user $(id -u):$(id -g) \
      -v `pwd`/browser/test/cypress:/app/cypress \
      -v `pwd`/browser/test/data/:/app/cypress/fixtures/data/  \
      -v `pwd`/doc/:/app/cypress/fixtures/doc/  \
      -v `pwd`/demo/:/app/cypress/fixtures/demo/  \
      -v `pwd`:/app/vidjil \
      -v "`pwd`/docker/ci/cypress_script.bash":"/app/script.bash" \
      -v "`pwd`/docker/ci/script_preprocess.bash":"/app/script_preprocess.bash" \
      -v "`pwd`/docker/ci/cypress.json":"/app/cypress.json" \
      --env BROWSER=electron --env HOST=localhost "vidjilci/cypress_with_browsers:latest" bash script.bash
  ```

Local volumes are mounted for these tests.
Tests scripts are located in `browser/test/cypress`:

- `support` (shared functions)
- `fixtures` (data used during tests)
- `integration` (testing scripts)

#### Interactive mode

The interactive mode allows to select tests to be launched.
Cypress has to be installed on local computer.
The following command creates some links and open the GUI:

```bash
make functional_browser_cypress_open
```

A `test_sandbox` is available to quickly test some modification made in the browser. See file `test_sandbox.js` and other script file for fast development.

#### Troubleshooting

**Xvfb error**

:       The cypress pipeline may fail in some cases, when, after the end of the tests,
        the Xvfb server and the docker container are still running.
        In this case, stop the docker container.

```bash
docker ps
docker stop $container_id
```

**Permission errors on report and screenshot files**

:    Files produced by cypress docker belong to the root user.
    These files should be deleted with root privilege.

```bash
sudo rm -r browser/test/cypress/report browser/test/cypress/screenshots
```
