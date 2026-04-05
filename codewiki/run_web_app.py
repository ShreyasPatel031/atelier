#!/usr/bin/env python3
"""
Startup script for CodeWiki Web Application
"""

import os
import sys

# Repo layout: atelier/codewiki/run_web_app.py → package root is parent of `codewiki/`
_pkg_dir = os.path.dirname(os.path.abspath(__file__))
_repo_root = os.path.dirname(_pkg_dir)
_src_dir = os.path.join(_pkg_dir, "src")
sys.path.insert(0, _repo_root)
sys.path.insert(0, _src_dir)

from codewiki.src.fe.web_app import main

if __name__ == "__main__":
    main()