// Copyright 2015 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var filenameEl;
var drawerPanel;
var editorEl;
var editorTextArea;
var previewEl;
var loadButton;
var saveButton;
var generatePreviewButton;
var driveApi;

var apiReady = false;
var dirtyBit = false;
var documentId;
var documentMetadata;
var pdf_dataurl;

var authRetryCount = 0;
var metadataRetryCount = 0;
var contentRetryCount = 0;

var GoogleDriveConfig = {
  clientId: '372253995078-fujhepcvc9am9tfguq6ec61dku8p7ah9.apps.googleusercontent.com',
  scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive.install']
};

document.addEventListener('DOMContentLoaded', function () {
  filenameEl = document.getElementById('filename');
  drawerPanel = document.getElementById('drawerPanel');
  editorEl = document.getElementById('editor');
  editorTextArea = document.getElementById('editor-text');
  previewEl = document.getElementById('preview');
  loadButton = document.getElementById('loadButton');
  saveButton = document.getElementById('saveButton');
  generatePreviewButton = document.getElementById('generatePreviewButton');
  driveApi = document.getElementById('driveApi');
  documentId = getParameterByName('gdriveid');

  drawerPanel.forceNarrow = true;
  loadButton.addEventListener('click', function (e) {
    drawerPanel.closeDrawer();
    populateUI();
  });
  saveButton.addEventListener('click', function (e) {
    drawerPanel.closeDrawer();
    saveAction();
  });
  generatePreviewButton.addEventListener('click', function(e) {
    compile();
  });

  document.addEventListener('keydown', function (e) {
    if (e.keyCode == 83 && (navigator.platform.match('Mac') ? e.metaKey : e.ctrlKey)) {
      e.preventDefault();
      drawerPanel.closeDrawer();
      saveAction();
    }
  }, false);

  editorTextArea.addEventListener('keydown', function (e) {
    dirtyBit = true;
  });
  editorTextArea.bindValue = "\\documentclass{minimal}\n"
                             + "\\begin{document}\n"
                             + "Your \\LaTeX document goes here!\n"
                             + "\\end{document}\n";

  window.onbeforeunload = function (e) {
    if (dirtyBit) {
      return 'You have unsaved changes.';
    }
  };

  driveApi.addEventListener('google-api-load', onDriveApiLoad);
});

var clearChildren = function (element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
};

var getParameterByName = function (name) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
    results = regex.exec(location.search);
  return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
};

var onDriveApiLoad = function () {
  driveApi.auth.authorize(
    {
      'client_id': GoogleDriveConfig.clientId,
      'scope': GoogleDriveConfig.scopes,
      'immediate': true
    },
    handleAuthResult);
};

var handleAuthResult = function (authResult) {
  if (authResult && !authResult.error) {
    apiReady = true;
    populateUI();
  } else {
    authRetryCount++;
    if (authRetryCount > 5) {
      console.log('WARNING: Auth failed');
      return;
    }
    // TODO: make this exponentially back off
    driveApi.auth.authorize(
      {
        'client_id': GoogleDriveConfig.clientId,
        'scope': GoogleDriveConfig.scopes,
        'immediate': false
      },
      handleAuthResult);
  }
};

var populateUI = function () {
  if (!apiReady) {
    return;
  }
  if (!documentId) {
    console.log('No doc ID');
    return;
  }
  fetchMetadataRequest(documentId).then(populateMetadata, handleGetMetadataFailed);
  fetchContentRequest(documentId).then(populateContent, handleGetContentFailed);
};

var fetchMetadataRequest = function (fileId) {
  return driveApi.api.files.get({'fileId': fileId});
};

var fetchContentRequest = function (fileId) {
  return driveApi.api.files.get({
    'fileId': fileId,
    'alt': 'media'
  });
};

var handleGetMetadataFailed = function () {
  metadataRetryCount++;
  if (metadataRetryCount > 5) {
    console.log('WARNING: Metadata fetch failed');
    return;
  }
  // TODO: make this exponentially back off
  fetchMetadataRequest(documentId).then(populateMetadata, handleGetMetadataFailed);
};

var handleGetContentFailed = function () {
  contentRetryCount++;
  if (contentRetryCount > 5) {
    console.log('WARNING: Content fetch failed');
    return;
  }
  // TODO: make this exponentially back off
  fetchContentRequest(documentId).then(populateContent, handleGetContentFailed);
};

var populateMetadata = function (driveResponse) {
  documentMetadata = driveResponse.result;
  clearChildren(filenameEl);
  filenameEl.appendChild(document.createTextNode(documentMetadata.title));
  document.title = driveResponse.result.title + ' - DriveTeX';
};

var populateContent = function (driveResponse) {
  editorTextArea.bindValue = driveResponse.body;
};

var saveAction = function () {
  updateFile(documentId, documentMetadata, editorTextArea.bindValue)
      .then(saveSuccessful, saveFailed);
};

var updateFile = function (fileId, fileMetadata, fileData) {
  const boundary = '-------314159265358979323846';
  const delimiter = "\r\n--" + boundary + "\r\n";
  const close_delim = "\r\n--" + boundary + "--";

  // Updating the metadata is optional and you can instead use the value from drive.files.get.
  var base64Data = btoa(fileData);
  var multipartRequestBody =
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(fileMetadata) +
    delimiter +
    'Content-Type: ' + fileMetadata.mimeType + '\r\n' +
    'Content-Transfer-Encoding: base64\r\n' +
    '\r\n' +
    base64Data +
    close_delim;

  var request = window.gapi.client.request({
    'path': '/upload/drive/v2/files/' + fileId,
    'method': 'PUT',
    'params': {'uploadType': 'multipart', 'alt': 'json'},
    'headers': {
      'Content-Type': 'multipart/mixed; boundary="' + boundary + '"'
    },
    'body': multipartRequestBody
  });
  return request;
};

var saveSuccessful = function (response) {
  document.getElementById('savedToast').show();
  dirtyBit = false;
};

var saveFailed = function (response) {
  document.getElementById('saveFailedToast').show();
  dirtyBit = false;
};

var compile = function () {
  var source_code = editorTextArea.bindValue;
  var compileProgress = document.getElementById('compileProgress');
  compileProgress.style.display = 'block';

  var pdftex = new PDFTeX('third_party/texlivejs/pdftex-worker.js');
  pdftex.set_TOTAL_MEMORY(80 * 1024 * 1024).then(function () {

    pdftex.on_stdout = appendOutput;
    pdftex.on_stderr = appendOutput;

    var start_time = new Date().getTime();

    pdftex.compile(source_code).then(function (pdf_dataurl) {
      var end_time = new Date().getTime();
      console.log("Execution time: " + (end_time - start_time) / 1000 + ' sec');

      if (pdf_dataurl) {
        previewEl.querySelector('iframe').setAttribute('src', pdf_dataurl);
      } else {
        previewEl.querySelector('iframe').setAttribute('src', 'about:blank');
        document.getElementById('compileProblemToast').show();
      }
      compileProgress.style.display = 'none';
    });
  });
};

var appendOutput = function (msg) {
  console.log(msg);
};
