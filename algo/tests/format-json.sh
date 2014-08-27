#!/bin/sh

tr "\n" " " | sed "s/}/}\n/g"
