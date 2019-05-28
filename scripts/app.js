// set up basic variables for app
var initializeMediastream = document.querySelector('.initialize-mediastream');
var getStorageInfo = document.querySelector('.get-storage-info');
var record = document.querySelector('.record');
var stop = document.querySelector('.stop');
var logSection = document.querySelector('.log-section');
var clearLogsButton = document.querySelector('.clear-logs-button');
var clearStorageButton = document.querySelector('.clear-storage-button');
var mainSection = document.querySelector('.main-controls');

var chunks = [];
var blobNumber = 0;
var startTimestamp = 0;

clearLogsButton.onclick = clearLogs;
clearStorageButton.onclick = clearDb;
initializeMediastream.onclick = onInitializeMediastreamClicked;
getStorageInfo.onclick = onGetStorageInfoClicked;
// disable buttons until onInitialize is called
record.disabled = true;
stop.disabled = true;

function msToTime(duration) {
  var milliseconds = parseInt((duration % 1000) / 100),
    seconds = Math.floor((duration / 1000) % 60),
    minutes = Math.floor((duration / (1000 * 60)) % 60),
    hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

  hours = (hours < 10) ? "0" + hours : hours;
  minutes = (minutes < 10) ? "0" + minutes : minutes;
  seconds = (seconds < 10) ? "0" + seconds : seconds;

  return hours + ":" + minutes + ":" + seconds + "." + milliseconds;
}

function clearDb() {
  idbKeyval.keys().then((keys) => keys.forEach((key) => idbKeyval.del(key)));
}

function log(message) {
  var entry = document.createElement("div");
  entry.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
  logSection.appendChild(entry);
}

function clearLogs() {
  while (logSection.firstChild) {
    logSection.removeChild(logSection.firstChild);
  }
}

function onGetStorageInfoClicked() {
  if (navigator.storage &&  navigator.storage.estimate) {
    navigator.storage.estimate().then((estimate) => {
      log(`Storage estimate for this site. Used approximately ${(estimate.usage / 1000000).toFixed(2)} MB. Quota is approximately ${(estimate.quota / 1000000).toFixed(2)} MB.`);
    })
  } else {
    log("StorageManager API not available!  Cannot query storage quota.");
  }
}
  
function onInitializeMediastreamClicked() {
  initializeMediastream.disabled = true;
  record.disabled = false;

  //main block for doing the audio recording

  if (navigator.mediaDevices.getUserMedia) {
    log('getUserMedia supported.');

    var constraints = { audio: true };

    navigator.mediaDevices.getUserMedia(constraints).then(onUserMediaSuccess, (err) => log('The following error occured: ' + err));

  } else {
    log('getUserMedia not supported on your browser!');
  }
}

function onUserMediaSuccess(stream) {
    if (!MediaRecorder) {
      log("MediaRecorder API not supported on your browser!");
      return;
    }
    var mediaRecorder = new MediaRecorder(stream);

    record.onclick = function() {
      mediaRecorder.start();
      startTimestamp = Date.now();
      log("recorder state: " + mediaRecorder.state);
      record.style.background = "red";

      stop.disabled = false;
      record.disabled = true;
    }

    stop.onclick = function() {
      mediaRecorder.stop();
      log("recorder state: " + mediaRecorder.state);
      log(`Length of recording: ${msToTime(Date.now() - startTimestamp)}`);
      record.style.background = "";
      record.style.color = "";
      // mediaRecorder.requestData();

      stop.disabled = true;
      record.disabled = false;
    }

    mediaRecorder.onstop = function(e) {
      log("data available after MediaRecorder.stop() called.");
      
      var blob = new Blob(chunks, { 'type' : mediaRecorder.mimeType });
      log(`Size of saved blob: ${(blob.size / 1000000).toFixed(2)} MB`);
      chunks = [];
      var name = "audioClip_" + Math.random + ++blobNumber;
      idbKeyval.set(name, blob).then(
        () => log(`Successfully saved ${name} to indexedDb`),
        () => log(`Failed to save ${name} to indexedDb`)
      );
    }

    mediaRecorder.ondataavailable = function(e) {
      chunks.push(e.data);
    }
}
