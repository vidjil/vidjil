#!/bin/bash
get_user_of_results() {
    if [ -d /mnt/result/results ]; then
        user=$(stat -c '%u' /mnt/result/results)
    else
        user=www-data
    fi
    echo $user
}

