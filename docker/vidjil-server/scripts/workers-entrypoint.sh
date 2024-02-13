echo -e "\n\e[34m=========================\e[0m"
echo -e "\e[34m=== Start service workers\e[0m"
echo -e "\e[34m=== `date +'%Y/%m/%d; %H:%M'`\e[0m"; echo

cd usr/share/vidjil/server/py4web

# Change value of pool
DEFAULT_POOL=$(($(nproc) - 1))
if [[ -v WORKERS_POOL ]]; then
    POOL="$WORKERS_POOL"
    echo "Pool of worker setted: $POOL"
    # Check if not greater than number of available threads.
    if [ "$POOL" -gt $(($(nproc) - 1)) ]; then
        POOL=$DEFAULT_POOL
        echo -e "\033[31mPool value is not valid because it is greater than the number of available threads\033[0m.\nSet value to default computed pool value."
    fi
else
    POOL=$DEFAULT_POOL
    echo "No pool value. Set value to default computed pool value."
fi


echo "==== Pool of workers: $POOL"
celery -b redis://redis:6379/0 -A apps.vidjil.tasks worker --loglevel=info --concurrency=$POOL  
