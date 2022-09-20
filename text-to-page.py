#!/usr/bin/python3.7

from string import Template
import sys
import os

dryrun = False
if len(sys.argv) > 1 and sys.argv[1] == '--dryrun':
  dryrun = True

with open("html-related/txtcmd-page-template.html", "r") as file:
  html_template = Template(file.read())

def make_html_from_txtc(filename):
  with open(filename, "r") as file:
    contents = file.read()
  (root, ext) = os.path.splitext(filename)
  if(dryrun):
    print(contents)
  else:
    with open(root + '.html', "w") as file:
      file.write(html_template.substitute(mainbody=contents))

for (path, dirs, files) in os.walk('.'):
  for filename in files:
    (_, ext) = os.path.splitext(filename)
    if ext == '.txtc':
      if dryrun:
        print(path)
        print(filename)
      make_html_from_txtc(path + '/' + filename)