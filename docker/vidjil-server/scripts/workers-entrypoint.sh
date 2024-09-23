#!/bin/bash

if [[ -n $1 ]]
then
    INSTANCE_TYPE=$1
else
    INSTANCE_TYPE="all"
fi

echo -e "\n\e[34m=========================\e[0m"
echo -e "\e[34m=== Start service workers for $INSTANCE_TYPE\e[0m"
echo -e "\e[34m=== `date +'%Y/%m/%d; %H:%M'`\e[0m\n"

# Set value of workers pool
DEFAULT_POOL=$(($(nproc) - 1))
if [[ -v WORKERS_POOL ]]
then
    POOL="$WORKERS_POOL"
    echo "Pool of worker setted: $POOL"
    # Check if not greater than number of available threads.
    if [[ $POOL -gt $DEFAULT_POOL ]]
    then
        POOL=$DEFAULT_POOL
        echo -e "\033[31mPool value is not valid because it is greater than the number of available threads\033[0m.\nSet value to default computed pool value."
    fi
else
    POOL=$DEFAULT_POOL
    echo "No pool value. Set value to default computed pool value."
fi

user=33
echo "user : `id -nu $user` (id $user)"

# Check if some workers should be dedicated to short jobs
if [[ -v SHORT_JOBS_WORKERS_POOL ]]
then
    # Check if not greater than number of workers -1
    if [[ $SHORT_JOBS_WORKERS_POOL -ge $POOL ]]
    then
        SHORT_JOBS_WORKERS_POOL=$POOL - 1
    fi
fi
if [[ "$INSTANCE_TYPE" == "short" ]]
then
    NB_WORKERS=$SHORT_JOBS_WORKERS_POOL
    QUEUES="short"
else
    NB_WORKERS=($POOL - $SHORT_JOBS_WORKERS_POOL)
    QUEUES="short,long"
fi

if [[ NB_WORKERS -gt 0 ]]
then
    echo "==== Pool of workers: $NB_WORKERS for queues $QUEUES"
    gosu $user bash -c "source /usr/share/vidjil/venv/bin/activate && \
        cd /usr/share/vidjil/server/py4web && celery -b redis://redis:6379/0 -A apps.vidjil.tasks worker -Q $QUEUES--concurrency=$NB_WORKERS"
else
    echo "No workers to start, exiting"
fi
