  var context = new webkitAudioContext();
  var recorder;

  function __log(e, data) {
    console.log(e, data);
  }

  function startUserMedia(stream) {
    var input = context.createMediaStreamSource(stream);
    __log('Media stream created.');

    //input.connect(context.destination);
    __log('Input connected to audio context destination.');

    recorder = new Recorder(input, {
                         workerPath: "/js/recorderjs/recorderWorker.js"
                       });
    __log('Recorder initialised.');
  }

  window.onload = function init() {
    try {
      // webkit shim
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;
      window.URL = window.URL || window.webkitURL;
      __log('Audio context set up.');
      __log('navigator.getUserMedia ' + (navigator.getUserMedia ? 'available.' : 'not present!'));
    } catch (e) {
      alert('No web audio support in this browser!');
    }

    navigator.getUserMedia({audio: true}, startUserMedia, function(e) {
      __log('No live audio input: ' + e);
    });
  };

function getBufferCallback( buffers ) {
    var newSource = context.createBufferSource();
    var newBuffer = context.createBuffer( 2, buffers[0].length, context.sampleRate );
    newBuffer.getChannelData(0).set(buffers[0]);
    newBuffer.getChannelData(1).set(buffers[1]);
    newSource.buffer = newBuffer;

    newSource.connect( context.destination );
    newSource.start(0);
}

// some globals
var audioBuffer;
var sourceNode;
var mediaStreamSource;

var osc = context.createOscillator();

var filter = context.createBiquadFilter();
filter.type = 3;
filter.frequency.value = 440;
filter.Q.value = 0;
filter.gain.value = 0;


// state variables
var analyserRunning = false;
var spectrumRunning = false;
var waveRunning = false;
var musicRunning = false;
var micRunning = false;
var sqRunning = false;

// setup a javascript node
var javascriptNode = context.createJavaScriptNode(2048, 1, 1);

// connect to destination, else it isn't called
javascriptNode.connect(context.destination);
// when the javascript node is called
// we use information from the analyzer node
// to draw the volume
javascriptNode.onaudioprocess = function () {

    // get the average for the first channel
    var array = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(array);
    // draw the spectrogram
    if ((musicRunning || micRunning || sqRunning)
            && analyserRunning) {
        drawSpectrogram(array);
    }

    if ((musicRunning || micRunning || sqRunning)
            && spectrumRunning) {
        drawSpectrum(array);
    }

}

// setup a analyzer
var analyser = context.createAnalyser();
analyser.smoothingTimeConstant = 0;
analyser.fftSize = 512;

// create a buffer source node
filter.connect(analyser);
analyser.connect(javascriptNode);

// get the context from the canvas to draw on
var ctx = $("#spectrogram").get()[0].getContext("2d");

// create a temp canvas we use for copying
var tempCanvas = document.createElement("canvas");
tempCanvas.width = 460;
tempCanvas.height = 300;
var tempCtx = tempCanvas.getContext("2d");

// used for color distribution
var hot = new chroma.ColorScale({
    colors:['#000000', '#ff0000', '#ffff00', '#ffffff'],
    positions:[0, .25, .75, 1],
    mode:'rgb',
    limits:[0, 350]
});

$(document).ready(function () {
    setupHandlers();
    loadSound("Marla.mp3");
});

function setupSourceAudio() {
    // create a buffer source node
    sourceNode = context.createBufferSource();

    sourceNode.connect(filter);
    //filter.connect(context.destination);

    // and connect to destination
    //sourceNode.connect(context.destination);
}

function setupHandlers() {
    $("#music-start").click(function () {
        setupSourceAudio();
        sourceNode.buffer = audioBuffer;
        console.log(audioBuffer);
        sourceNode.start(0);
        sourceNode.loop = true;
        musicRunning=true;

        $("#music-start").addClass("disabled");
        $("#music-stop").removeClass("disabled");

    });

    $("#music-stop").click(function () {
        sourceNode.stop(0);

        musicRunning = false;
        $("#music-stop").addClass("disabled");
        $("#music-start").removeClass("disabled");
    });

    $("#sq-start").click(function () {
        // play record
        recorder.getBuffer(getBufferCallback);
       //console.log(recording);
       // sqRunning=true;

      //  $("#sq-stop").removeClass("disabled");
      //  $("#sq-start").addClass("disabled");
    });

    $("#sq-stop").click(function () {

        sqRunning=false;

        $("#sq-stop").addClass("disabled");
        $("#sq-start").removeClass("disabled");
    });


    $("#mic-start").click(function () {
            recorder.clear();
            recorder.record();
            micRunning = true;
            $("#mic-start").addClass("disabled");
            $("#mic-stop").removeClass("disabled");


    });

    $("#mic-stop").click(function () {
        recorder.stop();
        micRunning = false;


        $("#mic-stop").addClass("disabled");
        $("#mic-start").removeClass("disabled");
    });




    $("#spectro-start").click(function () {

        analyserRunning = true;

        $("#spectro-start").addClass("disabled");
        $("#spectro-stop").removeClass("disabled");
    });

    $("#spectro-stop").click(function () {
        analyserRunning = false;

        $("#spectro-start").removeClass("disabled");
        $("#spectro-stop").addClass("disabled");
    });

    $("#freq-start").click(function() {

        spectrumRunning = true;
        $("#freq-start").addClass("disabled");
        $("#freq-stop").removeClass("disabled");

    });

    $("#freq-stop").click(function() {

        spectrumRunning = false;
        $("#freq-start").removeClass("disabled");
        $("#freq-stop").addClass("disabled");
    });


    $("#wave-start").click(function() {

        waveRunning = true;
        $("#wave-start").addClass("disabled");
        $("#wave-stop").removeClass("disabled");

    });

    $("#wave-stop").click(function() {

        waveRunning = false;
        $("#wave-start").removeClass("disabled");
        $("#wave-stop").addClass("disabled");
    });

    $("#spk-start").click(function() {

        filter.connect(context.destination);
        $("#spk-start").addClass("disabled");
        $("#spk-stop").removeClass("disabled");

    });

    $("#spk-stop").click(function() {

        filter.disconnect(context.destination);
        filter.connect(analyser);
        $("#spk-start").removeClass("disabled");
        $("#spk-stop").addClass("disabled");
    });

    // and update the filter type
  //  filter.type = currentFilterType;
}

// load the specified sound
function loadSound(url) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';

    // When loaded decode the data
    request.onload = function () {

        // decode the data
        context.decodeAudioData(request.response, function (buffer) {
            // when the audio is decoded play the sound
            audioBuffer = buffer;
        }, onError);
    }
    request.send();
}

function playSound(buffer) {
    sourceNode.buffer = buffer;
    sourceNode.noteOn(0);
}

// log if an error occurs
function onError(e) {
    console.log(e);
}

function drawSpectrum(array) {
    var ctx = $("#spectrum").get()[0].getContext("2d");
    ctx.fillStyle = "#ffffff"
    ctx.clearRect(0, 0, 300, 256);


    for ( var i = 0; i < (array.length); i++ ){
        var value = array[i];

        ctx.fillRect(i*2,300-value,1,300);
    }
};

function drawSpectrogram(array) {

    // copy the current canvas onto the temp canvas
    var canvas = document.getElementById("spectrogram");

    tempCtx.drawImage(canvas, 0, 0, 300, 256);

    // iterate over the elements from the array
    for (var i = 0; i < array.length; i++) {
        // draw each pixel with the specific color
        var value = array[i];
        ctx.fillStyle = hot.getColor(value).hex();

        // draw the line at the right side of the canvas
        ctx.fillRect(300 - 1, 256 - i, 1, 1);
    }

    // set translate on the canvas
    ctx.translate(-1, 0);
    // draw the copied image
    ctx.drawImage(spectrogram, 0, 0, 300, 256, 0, 0, 300, 256);

    // reset the transformation matrix
    ctx.setTransform(1, 0, 0, 1, 0, 0);

}

