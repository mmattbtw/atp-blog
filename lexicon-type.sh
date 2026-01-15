#!/bin/bash
bunx @atproto/lex-cli gen-server ./lexiconTypes $(find ./lexicons -name "*.json" -type f)