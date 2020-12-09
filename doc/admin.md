# Administration of a Vidjil server

This is the preliminary help for bioinformaticians administrators of the Vidjil web application.
This help covers administrative features that are mostly accessible from the web application,
and is complementary to the [Docker/Server documentation](server.md).
Users should consult the [Web Platform User Manual](user.md).

# Configuring pre-processes, processes and post-processes


## Pre-processes (after sample upload)

Custom pre-processing steps can be added.
They are called right after the upload of each sample, before launching the main processes.
They can be used, for example to filter out some reads, to demultiplex UMI or to merge paired-end reads.
Admins can add new pre-processes, and users can select a pre-process if they are allowed to.

Warning:
Adding an external program may bring additional security or performance issues.
Make sure you trust scripts you need to add before putting them on a production server.

### Adding a pre-process

Steps may differ if you use a plain-installation or a docker image.

  - (Command-line) Add a new preprocess script into the tools directory.
    This script make the link between the server, the data, the preprocess
    software or pipeline and the output file. A template is given in this
    directory (template<sub>preprocess</sub>.py) and need to be adapted to your
    usage and software.
  - (Command-line) You need to add the executable or preprocessing script to the path
    of vidjil to be callable. For this, give the correct path of it into the defs.py files.
  - You need to modifiy the function "run<sub>preprocess</sub>" in the
    script "server/web2py/application/vidjil/models/task.py". This part allow
    to use specific shortcut (files names for example) into the command line
    constructed by the server when calling the preprocess
  - (Web) You need to add the preprocess to the list of available process into the
    vidjil server interface. To do this, you need an admin account. You will
    see the pre-process tab in the list of admin tabs.

Here is an example with a fictive paired-end merger: "mymerger".

  - For this example, this fictionnal merger only need to use 3 parameters: 2 fastq files,
    paired-end, and an output file.
  - The fisrt step will be to reuse the template given into the tools directory.
    You need to adapt it to use the 3 paramters that will be called by the server
    when executed as described into it.
  - The second step will be to add the merger executable into the path to be callable
    by the server. This step will depend of you installation of the server. If you use
    a plain installation, you only need the add the executable to the path use by
    www-data user (if it is the one choose to serve the server). If you choose to use
    the docker installation, you need to uncomment the binaries volume into the
    docker-compose.yml file (service fuse); and copy the executable into the
    corresponding local directory (by default vidjil/docker/binaries/). After this, you should
    inquire the path into the **defs.py** file (relative path start from server/web2py).
  - After that, you will need to adapt the function "run<sub>preprocess</sub>" of task.py.
    The goal here is to add some shortcut that will be use by the server to adapt the
    calling of preprocess to replace the file names or path of the executable. For
    example, existing shortcut will be \&file1&, \&file2& and \&result&. You should add \&mymerger&.
    Here is the line to add : cmd = cmd.replace("\&mymerger&", defs.DIR<sub>MYMERGER</sub>).
    It should be place into the try loop, after the shortcut for \&result&.
  - Last step is to add the preprocess into the server administration interface. To do
    it, you need to inquire three fields, The first is the name of the preprocess,
    the third is a more complete description of it, that will be show when the preprocess
    on hover at the selection by user. The second field is the one where the command to
    execute is defined. In this case, his content is : "python mymerger.py \&mymerger& \&file1& \&file2& \&result&".

Now, you can set the permission to give the access to this preprocess at your users.
To do this, you need to click on the key logo of into the list of preprocess.
This open a panel from where you can set the permissions of acces to preprocess.
If you give permission to a group, each user of it will have access to it.
If you need to give permissions to all users of the server, you can simply
do that by given permission to public group.
You can also give permissions to some specifics users of the list.


## Main process and "fuse" configuration

This page shows the configurations list for the main analysis process.
Config are just parameters for:

- **running Vidjil-algo or other V(D)J analysis software on each sample**,
  producing a `.vidjil` file for each sample.
  The default install sets up some default configs that should work for the majority of applications.

- **``fusing'' (trough fuse.py) these results into a unique `.vidjil` file**.
  The defaults options are `-t 100`, other options can be seen in the help of `fuse.py`,
  possibly with additional pre- and post-processes (see below)

Each configuration has permissions for some groups.


## Pre- and post-processes (around fuse)

It is possible to run further pre- or post-process scripts around the "fusing" of results
by giving `--pre` and/or `--post` options to fue.
These scripts can also be wrappers of other software.
This can be useful to further process the result files, possibly taking into account several result files
 as in a MRD setup developed by Joao Medianis (Boldrini center, Brasil).

### Adding such a pre/post-process

  - Your script needs to take as an input a `.vidjil` file with `-i` argument, and export another `.vidjil` file with `-o`,
    such as in the call `spike-normalization.py -i res-samples.vidjil -o res-samples.vidjil`

  - The script should be available in the path referenced as `PRE_PROCESS_DIR` in `tools/defs.py`.
    The default path is relative to the `defs.py` file, so `.`  will be interpreted as `tools/` directory.

  - The script should be referenced in the `Fuse command` field of one "config" in the `processes config` page,
    as for example in `-t 100 --pre spike-normalization.py`.
    A `--pre` script will be called on each `.vidjil` file, before the actual fusing,
    whereas a `--post` script will be called on the combined `.vidjil` file after the fusing.


When the users select this config, these pre- and post-processes will also be called.


# Users, groups, and permissions

## Users

Users can be granted with various permissions:

  - Create patients
  - Edit/Delete patients
  - Upload sequences to patients
  - Run processes (Vidjil-algo or other analysis programs)
  - Save an Analysis
  - View a patients data in full detail

These permissions are assigned to groups to which a user can belong. Upon
creation a user is automatically assigned a newly created group designed
to be the user's personal group.
 
A user can belong to several groups and thus having access to several
sets of patients with different permissions on each set.
For example, he could be able to edit the patients of one group, but not
the patients of another one.

## Groups

Groups can be hierarchic: A group can have a parent group. 
All patient/run/set assigned to a group are also accessible to the children groups.
Other permissions are not transfered from parents to
children and access is not transfered from a child to a parent.

Child groups should be considered as roles inside the parent group as they
should not possess any personal access to parents.
They also cannot possess any children of their own. Assigning a new group
to a group which has a parent defer the parent-child
relationship to that parent.

## Creating groups

When creating the groups for an organisation the parent group MUST be the
first group created. Assigning a parent to a group cannot be done after
creation. A group cannot change parents.
Users can be created at any time. They can also be added
or removed from groups whenever it is convenient

### Example: create organisation Foobar with sub groups/roles

  - Create group Foobar (select None for parent group).
  - Create roles (eg. Technician, Engineer, Doctor). Be sure to select
    Foobar as the parent group.
  - From the group's detailed view, 
    set the permissions for the newly created groups Technician, Engineer and Doctor.
    Be sure to
    assign at least the 'view patient' permission or members will not be able
    to see any patients from the parent group.
  - Invite users to the groups from the detailed view.

Users will now be able, if permissions allow it, to create patients for
these groups. Any patient created should automatically be assigned to the
parent group. Any patient created for the parent group will be
accessible by any member of one of the child groups.

## Adding an user to a group

Adding a user to a group gives him access to the data of the group.
This should be done only with explicit authorization of the group manager.

## Removing an user from a group

To remove  a user from a group, 
open the corresponding group and click on the cross at the end of the line.
Data will still be accessible for other users of this group.

If the user should no longer have access to an account, you can after that delete the user 
or simply remove access by changing his password and/or restrain rights for his personnal group.

# Server Monitoring

Some monitoring features are accessible through the web application :
XXX TODO XXX
