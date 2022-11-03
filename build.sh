#!/bin/bash

sudo dpkg-deb --verbose --debug --build --root-owner-group deb
mv -f deb.deb godot-stable-v3.5.1-mono.deb
