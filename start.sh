#!/bin/bash
cd /home/u530263792/domains/astravac.astravacances.fr/public_html/deploy
export NODE_ENV=production
export PORT=3001
export HOSTNAME=0.0.0.0
node_modules/next/dist/bin/next start -p 3001 -H 0.0.0.0
