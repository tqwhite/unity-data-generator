#!/bin/bash
# Smoke test for intelligence-tools CLI
# Tests all three input methods

echo "🧠 Intelligence Tools Smoke Test"
echo "================================="
echo

echo "Test 1: Fetch by refId"
echo "----------------------"
./intelligenceTools.js --refId=155750186191366 --resultCount=3
echo

echo "Test 2: Fetch by XPath"
echo "----------------------"
./intelligenceTools.js --xPath="/Activitys/Activity/Students/StudentPersonalRefId" --resultCount=3
echo

echo "Test 3: Fetch by element name"
echo "------------------------------"
./intelligenceTools.js --element=StartDate --resultCount=3
echo

echo "✅ Smoke tests complete"