<link rel="stylesheet" type="text/css" href="org-mode.css" />

This is the preliminary help for administrators of the Vidjil web application.
This help covers administrative features accessible from the web application,
and is complementary to the "Server Installation and Maintenance Manual".
Users should consult the "Web Application Manual".

# Configurations

XXX TODO XXX
This page will show you the config list, config are just parameters for Vidjil runs. Everybody can use config (no permission acces needed, TODO)

# Pre-process configurations

Admin can add pre-processing step before launching an analysis.
The common usage of these preprocess is to merge paired-end reads.
To add a new pre-process, multiple step are require, and may differ
if you use a plain-installation or a docker image.

  - Add a new preprocess script into the tools directory.
    This script make the link between the server, the data, the preprocess
    software or pipeline and the output file. A template is given in this
    directory (template<sub>preprocess</sub>.py) and need to be adapted to your
    usage and software.
  - You need to add the executable or preprocessing script to the path
    of vidjil to be callable. For this, give the correct path of it into the defs.py files.
  - You need to modifiy the function "run<sub>preprocess</sub>" in the
    script "server/web2py/application/vidjil/models/task.py". This part allow
    to use specific shortcut (files names for example) into the command line
    constructed by the server when calling the preprocess
  - You need to add the preprocess to the list of available process into the
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

# Users, groups, and permissions

## Users

Users can have various permissions which allow them to perform actions on
the site.
These actions are:

  - Create patients
  - Edit/Delete patients
  - Upload sequences to patients
  - Run Vidjil
  - Save an Analysis
  - View a patients data in full detail

These permissions are assigned to groups to which a user can belong. Upon
creation a user is automatically assigned a newly created group designed
to be the user's personal group.
Belonging to multiple groups implies the user can have access to several
sets of patients and have different permissions on each set. (eg. one might
have the permissions necessary to edit the patients of one group, but not
the patients of another).

## Groups

Groups can belong to a hierarchical structure. A group can have a parent
group. This means any patient assigned to a group is also accessible to
said group's children. Other permissions are not transfered from parents to
children and access is not transfered from a child to a parent.

Child groups should be considered as roles inside the parent group as they
should not possess any personal access to parents.
They also cannot possess any children of their own. Assigning a new group
to a group which has a parent will automatically defer the parent-child
relationship to that parent.

## Creation Procedure

When creating the groups for an organisation the parent group MUST be the
first group created. Assigning a parent to a group cannot be done after
creation. A group cannot change parents.
Users can be created at any point in the procedure. They can also be added
or removed from groups whenever it is convenient

### Example: create organisation Foobar with sub groups/roles

  - Create group Foobar (select None for parent group).
  - Create roles (eg. Technician, Engineer, Doctor). Be sure to select
    Foobar as the parent group.
  - Set the permissions for the newly created groups Technician, Engineer
    and Doctor. You can do this from the group's detailed view (be sure to
    assign at least the 'view patient' permission or members will not be able
    to see any patients from the parent group)
  - Invite users to the groups from the detailed view.

Users will now be able, if permissions allow it, to create patients for
these groups. Any patient created should automatically be assigned to the
parent group. Any patient created for the parent group will be
accessible by any member of one of the child groups.

## Deletion Procedure

The way to delete a user from a group is to open the corresponding group and to click on the cross at the end of the line to remove the corresponding user.
Datas will still be accessible for other users of this group.
If the user should no longer have access to an account, you can after that delete the user or simply remove acces by changing his password and/or restrain rights for his personnal group.

# Server Monitoring

Some monitoring features are accessible through the web application :
XXX TODO XXX
