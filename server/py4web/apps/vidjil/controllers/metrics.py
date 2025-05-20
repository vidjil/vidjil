import time

from py4web import action, request

from ..common import auth, db, log

#########################################################################
ALL_METRICS = {
    "group_count": {"fast": True, "long": False},
    # "group_count_only_test": {"fast": True,  "long": False},
    "set_patients_count": {"fast": True, "long": False},
    "set_runs_count": {"fast": True, "long": False},
    "set_generics_count": {"fast": True, "long": False},
    "set_runs_by_user": {"fast": True, "long": False},
    "set_generics_by_user": {"fast": True, "long": False},
    "sequence_count": {"fast": True, "long": False},
    "results_count": {"fast": True, "long": False},
    "sequence_by_user": {"fast": True, "long": False},
    "sequence_size_by_user": {"fast": True, "long": False},
    "config_analysis": {"fast": True, "long": False},
    "config_analysis_by_users_patients": {"fast": True, "long": False},
    "config_analysis_by_users_runs": {"fast": True, "long": False},
    "config_analysis_by_users_generic": {"fast": True, "long": False},
    "login_count": {"fast": True, "long": False},
    "set_patients_by_user": {"fast": True, "long": False},
    "status_analysis": {"fast": True, "long": False},
    "set_patients_by_group": {"fast": False, "long": True},
    "set_runs_by_group": {"fast": False, "long": True},
    "set_generics_by_group": {"fast": False, "long": True},
    "config_analysis_by_groups": {"fast": False, "long": True},
}
#########################################################################


def get_config_analysis_by_user(sample_set_type: str):
    return db(
        (db.config.id == db.results_file.config_id)
        & (
            db.results_file.sequence_file_id
            == db.sample_set_membership.sequence_file_id
        )
        & (db.sample_set_membership.sample_set_id == db.sample_set.id)
        & (db.sample_set.sample_type == sample_set_type)
    ).select(
        db.config.name.with_alias("config_name"),
        db.sample_set.creator.with_alias("user_id"),
        db.results_file.config_id.with_alias("config_id"),
        db.results_file.id.count().with_alias("count"),
        groupby=(db.results_file.config_id | db.sample_set.creator),
    )


def getMetricByName(metric_name):
    if (
        "metrics" in auth.groups or auth.is_admin()
        # WARNING !!! Consistency, switch between multiple call to admin/not admin. (tested with API)
    ):
        if metric_name == "users_count":
            return len(db().select(db.auth_user.id.count(), groupby=db.auth_user.id))

        elif metric_name == "group_count":
            return len(db().select(db.auth_group.id.count(), groupby=db.auth_group.id))

        elif metric_name == "login_count":
            # TODO: For the moment, the event are stored in a builded string in "description" field. Can be improve by adding a specific event field
            return db(db.auth_event.user_id == db.auth_user.id).select(
                db.auth_event.user_id,
                db.auth_event.description,
                db.auth_event.id.count(),
                groupby=db.auth_event.user_id | db.auth_event.description,
            )

        # # Patients; runs; sets
        elif metric_name == "set_patients_count":
            return db(db.patient).count()

        elif metric_name == "set_runs_count":
            return db(db.run).count()

        elif metric_name == "set_generics_count":
            return db(db.generic).count()

        # Patients; runs; sets By USER
        elif metric_name == "set_patients_by_user":
            return db(
                (db.patient.sample_set_id == db.sample_set.id)
                & (db.sample_set.sample_type == "patient")
            ).select(
                db.patient.creator.with_alias("user_id"),
                db.patient.id.count().with_alias("count"),
                groupby=db.patient.creator,
            )

        elif metric_name == "set_runs_by_user":
            return db(
                (db.run.sample_set_id == db.sample_set.id)
                & (db.sample_set.sample_type == "run")
            ).select(
                db.run.creator.with_alias("user_id"),
                db.run.id.count().with_alias("count"),
                groupby=db.run.creator,
            )

        elif metric_name == "set_generics_by_user":
            return db(
                (db.generic.sample_set_id == db.sample_set.id)
                & (db.sample_set.sample_type == "generic")
            ).select(
                db.generic.creator.with_alias("user_id"),
                db.generic.id.count().with_alias("count"),
                groupby=db.generic.creator,
            )

        # Samples, analysis Globally
        elif metric_name == "sequence_count":
            return db(db.sequence_file).count()
        elif metric_name == "results_count":
            return db(db.results_file).count()
        elif metric_name == "status_analysis":
            return db(db.scheduler_task.status).select(
                db.scheduler_task.status,
                db.scheduler_task.id.count(),
                db.scheduler_task.task_name,
                groupby=db.scheduler_task.task_name | db.scheduler_task.status,
            )

        # Samples, analysis
        elif metric_name == "sequence_by_user":
            return db().select(
                db.sequence_file.provider.with_alias("user_id"),
                db.sequence_file.id.count().with_alias("count_sequence"),
                groupby=db.sequence_file.provider,
            )
        elif metric_name == "sequence_size_by_user":
            return db().select(
                db.sequence_file.provider.with_alias("user_id"),
                (
                    db.sequence_file.size_file.sum() + db.sequence_file.size_file2.sum()
                ).with_alias("size_file_sum"),
                groupby=db.sequence_file.provider,
            )

        elif metric_name == "config_analysis":
            return db(db.results_file.config_id == db.config.id).select(
                db.results_file.config_id,
                db.config.name,
                db.config.program,
                db.results_file.id.count(),
                groupby=db.results_file.config_id,
            )

        # Patients; runs; sets By GROUP
        elif metric_name == "set_patients_by_group":
            return db(
                (db.sample_set.sample_type == "patient")
                & (db.sample_set.creator == db.auth_membership.user_id)
                & (db.auth_membership.group_id == db.auth_group.id)
                & (db.auth_group.role != "public")
            ).select(
                db.auth_group.id.with_alias("group_id"),
                db.sample_set.id.count().with_alias("count"),
                groupby=db.auth_group.id,
            )

        elif metric_name == "set_runs_by_group":
            return db(
                (db.sample_set.sample_type == "run")
                & (db.sample_set.creator == db.auth_membership.user_id)
                & (db.auth_membership.group_id == db.auth_group.id)
                & (db.auth_group.role != "public")
            ).select(
                db.auth_group.id.with_alias("group_id"),
                db.sample_set.id.count().with_alias("count"),
                groupby=db.auth_group.id,
            )

        elif metric_name == "set_generics_by_group":
            return db(
                (db.sample_set.sample_type == "generic")
                & (db.sample_set.creator == db.auth_membership.user_id)
                & (db.auth_membership.group_id == db.auth_group.id)
                & (db.auth_group.role != "public")
            ).select(
                db.auth_group.id.with_alias("group_id"),
                db.sample_set.id.count().with_alias("count"),
                groupby=db.auth_group.id,
            )

        elif metric_name == "config_analysis_by_groups":
            return db(
                (
                    db.results_file.sequence_file_id
                    == db.sample_set_membership.sequence_file_id
                )
                & (db.sample_set_membership.sample_set_id == db.sample_set.id)
                & (db.sample_set.creator == db.auth_membership.user_id)
                & (db.auth_membership.group_id == db.auth_group.id)
                & (db.config.id == db.results_file.config_id)
            ).select(
                db.config.name,
                db.config.program,
                db.results_file.config_id,
                db.results_file.id.count(),
                db.auth_group.id,
                db.sample_set.sample_type,
                groupby=(
                    db.results_file.config_id
                    | db.auth_group.id
                    | db.sample_set.sample_type
                ),
            )

        elif metric_name == "config_analysis_by_users_patients":
            return get_config_analysis_by_user("patient")

        elif metric_name == "config_analysis_by_users_runs":
            return get_config_analysis_by_user("run")

        elif metric_name == "config_analysis_by_users_generic":
            return get_config_analysis_by_user("generic")

        else:
            raise Exception("Metric name asked don't exist: {metric_name}")
    return None


def getMetricsList(metrics_list, auth):
    if (
        "metrics" in auth.groups or auth.is_admin()
        # WARNING !!! Inconsistency, switch between multiple call to admin/not admin. (tested with API)
    ):
        message = "status METRICS"
        start_time = time.time()
        delta_time = time.time()
        data = {"request_times": {}}
        data["message"] = message

        for metric in metrics_list:
            data[metric] = getMetricByName(metric)
            data["request_times"][metric] = time.time() - delta_time
            delta_time = time.time()

        data["request_times"]["total"] = time.time() - start_time
        log.debug("METRICS loaded (%.3fs)" % (time.time() - start_time))
    else:
        data = {"message": "status NOT in metrics group"}
    return data


@action("/vidjil/metrics_fast", method=["POST", "GET"])
@action.uses(auth, db)
def metricsFast():
    fast_metrics = [key for key in ALL_METRICS.keys() if ALL_METRICS[key]["fast"]]
    return getMetricsList(fast_metrics, auth)


@action("/vidjil/metrics_long", method=["POST", "GET"])
@action.uses(auth, db)
def metricsLong():
    long_metrics = [key for key in ALL_METRICS.keys() if ALL_METRICS[key]["long"]]
    return getMetricsList(long_metrics, auth)


@action("/vidjil/metrics_all", method=["POST", "GET"])
@action.uses(auth, db)
def metricsAll():
    all_metrics = [key for key in ALL_METRICS.keys()]
    return getMetricsList(all_metrics, auth)


@action("/vidjil/metrics_by_name", method=["POST", "GET"])
@action.uses(auth, db)
def metricsByName():
    """Allow to get metrics asked by a given list in url (',' jointure')"""
    metrics = request.params["metric"].split(",")
    print(f"Ask metrics list: {metrics}")
    return getMetricsList(metrics, auth)


#########################################################################


@action.uses(auth, db)
def set_creator_samples_set():
    """
    Function to launch to fill creator field of sample_set table from content of field creator of each set type
    Fill only empty value.
    To be launch once at release 2024.12
    After that, this field will be filled automatically at each set creation
    """

    # Get data for each sample_set
    for set_type in ["patient", "run", "generic"]:
        subquery_patient = db(
            (db.sample_set.sample_type == set_type)
            & (db.sample_set.creator == None)  # noqa: E711
            & (db.sample_set.id == db[set_type].sample_set_id)
            & (db[set_type].creator == db.auth_user.id)
        ).select(
            db.sample_set.id,
            db.sample_set.creator,
            db[set_type].id,
            db[set_type].creator,
            db.auth_user.id,
        )

        # Update sample_set creator
        for elt in subquery_patient:
            db.sample_set[elt.sample_set.id].update_record(creator=elt.auth_user.id)
            db.commit()
    return
