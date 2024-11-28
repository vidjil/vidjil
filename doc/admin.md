
This is the preliminary help for bioinformaticians administrators of the Vidjil web application. This help covers administrative features that are mostly accessible from the web application, and is complementary to the [Docker/Server documentation](server.md). Users should consult the [Web Platform User Manual](user.md).

For administrators, new tabs are available, allowing them various actions.

## Pre-processes, processes and post-processes

### Pre-processes (after sample upload)

Custom pre-processing steps can be added. These steps are executed right after the upload of each sample, before launching the main processes. They can be used, for example, to filter out certain reads, de-multiplex UMIs, or merge paired-end reads. Administrators can add new pre-processing steps, and users can select a pre-process if they have the necessary permissions.

Warning:
Adding an external program may introduce security or performance issues. Ensure you trust the scripts you intend to add before deploying them on a production server.

#### Adding a pre-process

1. (Command-line) A new pre-process script (and may be an executable) should be added. In order to do this, see [`contrib` repository](https://gitlab.inria.fr/vidjil/contrib)
1. (Code) You may need to modify the function "run<sub>preprocess</sub>" in the "server/py4web/apps/vidjil/tasks.py" script. This allows you to use specific shortcuts (such as file names) in the command line constructed by the server when calling the pre-process.
1. (Web) Add the pre-process to the list of available processes in the Vidjil server interface. To do this, you need an admin account. The pre-process configuration tab will appear in the list of admin tabs.

Here is an example with a fictive paired-end merger: "mymerger".

- For this example, this fictional merger only need to use 3 parameters: 2 fastq files,
  paired-end, and an output file.
- The first step will be to reuse the template given into the tools directory.
  You need to adapt it to use the 3 parameters that will be called by the server
  when executed as described into it.
- The second step will be to add the merger executable into the path to be callable
  by the server. This step will depend of you installation of the server. If you use
  a plain installation, you only need the add the executable to the path use by
  www-data user (if it is the one choose to serve the server). If you choose to use
  the docker installation, you need to uncomment the binaries volume into the
  docker-compose.yml file (service fuse); and copy the executable into the
  corresponding local directory (by default vidjil/docker/binaries/). After this, you should
  inquire the path into the **defs.py** file (relative path start from server/py4web/apps/vidjil).
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

You can now set permissions to grant users access to this pre-process. To do this, click on the key icon in the list of pre-processes. This will open a panel where you can configure access permissions for the pre-process.

- If you grant permission to a group, all users within that group will have access.
- To give access to all users on the server, simply assign permission to the public group.
- You can also grant access to specific users from the list.

### Main process and "fuse" configuration

The `process configs` page in the web app for administrators displays the configurations for the main analysis process.
Configurations are essentially parameters for:

- **running Vidjil-algo or other V(D)J analysis software on each sample**,  which generates a .vidjil file for each sample. The default installation includes pre-configured settings that should suit most applications.

- **"Fusing" (ie. merging) these results into a single `.vidjil` file using fuse.py.** By default, the option `-t 100` is used. Additional options can be found in the fuse.py help, with the possibility of adding pre- and post-processing steps (see [below](#pre-and-post-processes-around-fuse)).

You can now set permissions to grant users access to this process configuration. To do this, click on the key icon in the list of configurations. This will open a panel where you can configure access permissions for the configuration.

- If you grant permission to a group, all users within that group will have access.
- To give access to all users on the server, simply assign permission to the public group.
- You can also grant access to specific users from the list.

### Pre and post-processes (around fuse)

It is possible to run further pre- or post-process scripts around the "fusing" of results
by giving `--pre` and/or `--post` options to fuse.
These scripts can also be wrappers for other softwares.
This can be useful to further process the result files, possibly taking into account several result files
as in a MRD setup developed by Joao Medianis (Boldrini center, Brasil).

See [`contrib` repository](https://gitlab.inria.fr/vidjil/contrib) for examples.

#### Adding such a pre-/post-process

- Your script needs to take as an input a `.vidjil` file with `-i` argument, and export another `.vidjil` file with `-o`,
  such as in the call `spike-normalization.py -i res-samples.vidjil -o res-samples.vidjil`

- The script should be available in the path referenced as `PRE_PROCESS_DIR` in `tools/defs.py`.
  The default path is relative to the `defs.py` file, so `.`  will be interpreted as `tools/` directory.

- The script should be referenced in the `Fuse command` field of one "config" in the `processes config` page,
  as for example in `-t 100 --pre spike-normalization.py`.
  A `--pre` script will be called on each `.vidjil` file, before the actual fusing,
  whereas a `--post` script will be called on the combined `.vidjil` file after the fusing.

- Multiple scripts can be called. To do that, concatenate commands to use inside fuse line to call with a '&&' separator.
  `-t 100 --pre 'scriptA --opt optvalA && scriptB --opt optvalB`. This can be done for prefuse and postfuse step.

When the users select this config, these pre- and post-processes will also be called.

## Users, groups, and permissions

### Users

The `users` page allows user to create and monitor users.

It is currently the only way to enroll a new user in Vidjil.

By default, a new user can create sample sets, but will not be able to run an analysis, nor will they be able to access to existing sample sets.

Users can be granted various permissions:

- **Create sample sets** (patients, runs, or generic sets)
- **Edit/Delete sample sets**
- **Upload sequences** to sample sets
- **Run processes** (Vidjil-algo or other analysis programs)
- **Save an analysis**
- **View sample set data** in full detail

These permissions are assigned to [groups](#groups) that users can belong to. When a user is created, they are automatically assigned to a newly created personal group.

A user can belong to multiple groups, granting them access to different sample sets with varying permissions. For example, a user might have permission to edit sample sets in one group but only view them in another.

### Groups  

The `groups` page allows users to create and manage groups.

Groups can be hierarchical: a group can have a parent group. All patients, runs, or sets assigned to a group are also accessible to its child groups. However, other permissions are not inherited from parent to child, and access is not transferred from a child to its parent.

Child groups should be considered roles within the parent group, as they do not have independent access to the parent group's resources. Additionally, child groups cannot have sub-groups of their own. Assigning a new group to a group with a parent transfers the parent-child relationship to the parent group.

### Creating Groups  

When creating groups for an organization, the parent group **must** be created first. A parent cannot be assigned to a group after its creation, and a group's parent cannot be changed later. Users can be created at any time and can be added to or removed from groups as needed.

#### Example: create organization with sub groups/roles

- Create group, for example `lab_xxx` (select `None` for parent group).
- Create sub-group for roles (eg. `Technician`, `Engineer`, `Doctor`). Be sure to select `lab_xxx` as the parent group.
- From the group's detailed view, set the permissions for the newly created groups `Technician`, `Engineer` and `Doctor`. Be sure to assign at least the 'view patient' permission or members will not be able to see any patients from the parent group.
- Invite users to the groups from the detailed view.

Users will now be able, if permissions allow it, to create patients for these groups. Any patient created should automatically be assigned to the parent group. Any patient created for the parent group will be accessible by any member of one of the child groups.

#### Example: converting a previous user account into a group account

Sometimes a user has an account, performs some analyses, and then wants to create accounts for other members of their team. The following procedure ensures that all data uploaded by the user will be available to the entire group:

1. Modify the user's personal group by renaming it to a shared group name, such as `lab_xxx`.
2. Create the new users.
3. Attach them to the first group `lab_xxx`.

If needed, you can also recreate a personal group for the user:

1. Create a new group for the user, reusing the name of the previous personal group. This will be a new group named `user_xxx`, where `xxx` is the user's ID.
2. Set the permissions for the user in their own group.
3. Attach the user to this new group `user_xxx`.

#### Adding roles to an organization

You can use various panel of rights depending of the roles that you want create. For example, in a hospital, you may want that only a subgroup of people, let say `doctors`, are allowed to save an analysis.

Their is no preset of rights defined. You can select manual, inside detailed view of each group and sub-group,
To do this, there is not any preset of permissions, but you rather have to select, inside the detailed view of each group and sub-group, the permissions you want to grant for each of these groups.

### Adding an user to a group

Adding a user to a group gives him access to the data of the group. This should be done only with explicit authorization of the group manager.

### Removing an user from a group

To remove a user from a group, open the corresponding group and click on the cross at the end of the line. ,Data will still be accessible for other users of this group.

If the user should no longer have access to an account, you can after that delete the user or simply remove access by changing his password and/or restrain rights for his personal group.

## Admin page

This page allows to get some information on the current state of the server.

Note the currently some features in this page are not fully functional.

### Database maintenance

In the `Database maintenance` links, admins can use:

- `administration` link to access to a specific dashboard application, which allows to check for some errors in the backend (see [py4web documentation](https://py4web.com/_documentation/static/en/chapter-04.html))
- `clean workers status` link to purge some jobs that may have freezed in a wrong state. This should not affect currently running tasks. This should not be needed, but we had some instabilities with job statuses.

### Logs files

Administrators can access to various logs files content. Note that syslog is currently unavailable trough this interface.

### Workers and tasks

Administrator can check:

- Number of active workers (currently not functional)
- Number of queued, assigned, and running tasks
- Last tasks results (`C` for Completed, `F` for Failed, `Q` for Queued or `W` for Waiting)

### Server status

Various metrics on server machine, including uptime and load average.

### Server disk usage

As stated.

## Impersonation

As an administrator, to be able to check some users issues, you can impersonate a user in the system. To do so, use the `Impersonate` drop-down list in the top right. After this and until you stop impersonation, you will see the same interface as the chosen user.

!!! warning
  This feature must be used with care...

## Server Monitoring

![New with release 2024.12](https://img.shields.io/badge/Release-2024.12-blue)

Some monitoring features are accessible through the web application with the addition of a new dedicated controller, allowing the retrieval of metrics from a Vidjil server instance. A full list of available metrics will be described below.

The goal of these metrics is to be regularly called by an [API instance](https://gitlab.inria.fr/vidjil/metrics/metrics-instance) to be integrated into an external monitoring service. The tools used in our pipeline combine the [Vidjil API](api.md) for metrics requests, [Prometheus](https://prometheus.io/) for metrics storage, and [Grafana](https://grafana.com/) for visualization.

``` mermaid
graph TB
    subgraph Metrics servers
    D[Grafana<br>viewer] -- ask<br>metrics  --> C;
    C -- serve<br>metrics  --> D;
    C -- recurrent<br>requests  --> B;
    B -- formatted<br>metrics --> C[Prometheus<br>DB];
    end

    V1 ~~~ V2;
    V1 ~~~ VX;
    V2 ~~~ VX;

    V1(**Vidjil<br>server 1**) -- raw<br>metrics --> B[API<br>server];
    V2(**Vidjil<br>server 2**) -- raw<br>metrics --> B[API<br>server];
    VX(**Vidjil<br>server X**) -- raw<br>metrics --> B[API<br>server];
    B -- request<br>metrics --> V1;
    B -- request<br>metrics --> V2;
    B -- request<br>metrics --> VX;
```

A dedicated configuration of these tools can be found at this [page](https://gitlab.inria.fr/vidjil/metrics/metrics-server) and could be set up with a simple docker configuration.

### Set up monitoring

A set of three steps/conditions should be filled:

#### Add a dedicated user and group

This new group will only see metrics information.

If you start from a fresh installation initialized from scratch, a dedicated group named *metrics* will be automatically created.  
If not, you will have to create it yourself (see [Creating groups](#creating-groups)), name it *metrics*, and remove all rights in it.

An automatic creation of this user can be set at database initialization. To do this, various metrics variables should be set in `docker/.env.default` at the initialization of the database (`METRICS_USER_PASSWORD`, `METRICS_USER_EMAIL`).  
If you have already initialized the database or done a server upgrade, you can also create a dedicated user and add it to this group.

#### Start a metrics server instance

A metrics server instance should be installed, that will launch the combination of Vidjil API/Prometheus/Grafana to monitor server. More documentation on this last point will be found on [dedicated repository](https://gitlab.inria.fr/vidjil/metrics/metrics-server) and updated regularly with usage adoption.

#### Update some data in database

A call to `set_creator_samples_set` should be done at migration to be able to access previous data more efficiently.

### Available metrics

A complete list of available metrics is listed here, and can be found in `metrics.py` file.

Note that some metrics are more computational intensive than others. We chose to split metrics in 2 lists: `fast`, `long`. Note that metrics server will call `long` metrics less often than `fast` ones.

| Metrics                           | List | Descriptions                                                                                        |
|:----------------------------------|:-----|:----------------------------------------------------------------------------------------------------|
| group_count                       | fast | Get number of groups                                                                                |
| set_patients_count                | fast | Get number of patients for all users                                                                |
| set_runs_count                    | fast | Get number of runs for all users                                                                    |
| set_generics_count                | fast | Get number of generic sets for all users                                                            |
| set_patients_by_user              | fast | Get number of patients split by user id                                                          |
| set_runs_by_user                  | fast | Get number of runs split by user id                                                              |
| set_generics_by_user              | fast | Get number of generic split by user id                                                           |
| sequence_count                    | fast | Get number of sequences files                                                                       |
| results_count                     | fast | Get number of results present on server                                                             |
| sequence_by_user                  | fast | Get number of sequences files by user                                                               |
| sequence_size_by_user             | fast | Get sump of sequence files by users                                                                 |
| config_analysis                   | fast | Get list of analysis split by configurations                                                     |
| config_analysis_by_users_patients | fast | Get list of analysis, split by configurations, only for patients                                 |
| config_analysis_by_users_runs     | fast | Get list of analysis, split by configurations, only for runs                                     |
| config_analysis_by_users_generic  | fast | Get list of analysis, split by configurations, only for generics sets                             |
| login_count                       | fast | Get number of login count, group by user id                                                         |
| status_analysis                   | fast | Get number of analysis grouped by status (allow to see pending, finish, running or failed analysis) |
| set_patients_by_group             | long | Get number of patients split by groups                                                            |
| set_runs_by_group                 | long | Get number of runs split by groups                                                                |
| set_generics_by_group             | long | Get number of generic split by groups                                                             |
| config_analysis_by_groups         | long | Get number of analysis split by configs and by groups                                             |

## Plugins

Some features of vidjil server/client need to add a dedicated script in `browser/js/addons/` directory.  

!!! info
    If you use docker installation, don't forget to link these plugins directory/files to volume declaration.

### Declare our own primers set

A dedicated plugin allow to add your own primer set.
To do this, adapt the following content with your own list of primers sequences:

``` js title='Addon for primer declaration'
setTimeout( () => {
    m.primersSetData.primers_set_XXX = {
        "name": "primers_set_XXX",
        "title": "primers_title",
        "TRB": {
            "primer5" : [
                "VVV","VVV","VVV", // segments V
                "DDD", "DDD"       // segments D
            ],
            "primer3": ["JJJ", "JJJ", "JJJ"] // primer3 complement
        }
    }
    console.default.log( "==> ADDONS PRIMERS  XXX loaded" ) // To control in browser log
    m.buildPrimersMenu()
}, 100)
```

If you want to add multiple primers sets by this way, don't forget to adapt it and avoid duplicate name in `m.primersSetData`.
