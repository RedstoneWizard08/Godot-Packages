#!/bin/bash

sudo dpkg-deb --build --root-owner-group deb
mv deb.deb godot-stable-v3.5.1-mono.deb
