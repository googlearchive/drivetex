# Deprecated

This sample is no longer maintained. No further updates will be made.

# DriveTeX
A cloud LaTeX editor. Live at [drivetex.appspot.com](https://drivetex.appspot.com/). Inspired by [LaTeX Lab][1] by Bobby Soares.

[1]: https://code.google.com/p/latex-lab/

## User Manual

Right now, it's a little bit more difficult to get started with DriveTeX that it ought to be.

1. Go to [drivetex.appspot.com](https://drivetex.appspot.com/). If this is your first visit, you'll be
   prompted to authorize DriveTeX to access Google Drive files that you specifically give permission to access.
2. Visit [drive.google.com](https://drive.google.com/). (If you just authorized DriveTeX, you might have to reload.)
   Find a `.tex` file to edit, right click, "Open With" -> DriveTeX.
3. Your file opens up in the DriveTeX editor. You can make changes, save and generate a preview.

If you find that your situation doesn't work with DriveTeX (multiple source files, additional LaTeX plugins, etc.),
let me know!

## Getting started with development

### One-time system setup

* Install [npm](https://docs.npmjs.com/getting-started/installing-node)
    * Windows or Mac: Download [NodeJS](https://nodejs.org/download/)
    * Ubuntu/Debian: `sudo apt-get install npm`
    * Depending on your system setup, you may want to reference [this StackOverflow answer](http://stackoverflow.com/a/21712034/587091) about installing NPM global packages without administrative priviledge and [this one](http://askubuntu.com/a/521571/129686) about `node: command not found`
* `npm install -g bower grunt-cli http-server`
* Install [Google Cloud SDK](https://cloud.google.com/sdk/) (only needed for pushing to production)
 * `gcloud auth login`
 * `gcloud config set project drivetex`

### Clean repo build

* `npm install`
* `grunt cleanDeps`
* `grunt`

### Test locally

* `cd public; http-server`
* Visit <http://localhost:8080/>

### Deploy to App Engine

* `gcloud preview app deploy public/app.yaml --version=3 --promote`


## Open Source Credits
DriveTeX makes use of many high quality open source libraries, including:

* [texlive.js](https://github.com/manuels/texlive.js) (Many thanks to Manuel for his support!)
* [Polymer](https://www.polymer-project.org/)
* [CodeMirror](https://codemirror.net/)


## Disclaimers and Licensing
This is not an official Google product (experimental or otherwise), it is just code that happens to
be owned by Google. It is licensed under
[Apache 2.0](http://www.apache.org/licenses/LICENSE-2.0.txt);
see the `LICENSE` file for full details.
