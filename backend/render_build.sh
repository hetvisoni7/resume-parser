#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "--- Upgrading Build Tools ---"
pip install -U pip setuptools wheel

echo "--- Installing Binary Wheels for Core Libs ---"
# Force binary installs to avoid compilation (gcc/g++) errors
pip install --only-binary=:all: blis>=0.7.11 thinc>=8.2.0 spacy>=3.7.0 pydantic>=2.0 numpy<2.0

echo "--- Installing Remaining Dependencies ---"
pip install -r requirements.txt

echo "--- Downloading Spacy Model ---"
python -m spacy download en_core_web_sm
