// example usage: _2DNote.play(...) or _2DNote.update(...)

var _2DNote = (function () {
  var audioContext = new AudioContext();
  var note = null;

  var viewXRange = [0, document.documentElement.clientWidth];
  var viewYRange = [0, document.documentElement.clientHeight];

  var comfyFrequencyRange = [150, 400];
  var comfyVolumeRange = [0, 0.5]; // technically gain (ranges from 0 to 1)

  function setAs2DArea(e, callbackUponUpdate) {
    // e = event or element
    // example usage: _2DNote.setAs2DArea(document.getElementById('2d-area', callbackUponUpdate));
    this.callbackUponUpdate = callbackUponUpdate;
    const element = e ? e : document.body;
    element.addEventListener("mousedown", this.play.bind(this));
    element.addEventListener("mouseup", this.stop.bind(this));
    element.addEventListener("mousemove", this.update.bind(this));
    element.addEventListener("touchstart", this.play.bind(this));
    element.addEventListener("touchend", this.stop.bind(this));
    element.addEventListener("touchmove", this.update.bind(this));
    this.setupExitedViewDetection(element);
  }

  function play(e) {
    // e = event or element
    // example usage: <body onmousedown="_2DNote.play(event);" style="width: 100vw; height: 100vh;" ontouchstart="_2DNote.play(event);"></body>
    this.stop();
    this.setupExitedViewDetection(e);
    var frequency = this.getFrequency(e);
    var volume = this.getVolume(e);
    var volumeSetup = this.audioContext.createGain();
    volumeSetup.connect(this.audioContext.destination);
    volumeSetup.gain.value = isNaN(volume) ? 0.5 : volume;
    var oscillator = this.audioContext.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = isNaN(frequency) ? 400 : frequency;
    oscillator.connect(volumeSetup);
    // instead of oscillator.connect(this.audioContext.destination);
    oscillator.start();
    // var delayThatAvoidsCrazyReverbs = 1;
    // oscillator.stop(this.audioContext.currentTime + delayThatAvoidsCrazyReverbs);
    this.note = {
      oscillator: oscillator,
      volumeSetup: volumeSetup,
    };
  }

  var callbackUponUpdate = null;
  function update(e, callback) {
    // e = event or element
    if (!this.note) return;
    var frequency = this.getFrequency(e);
    var volume = this.getVolume(e);
    var volumeSetup = this.note.volumeSetup;
    volumeSetup.gain.value = volume;
    var oscillator = this.note.oscillator;
    oscillator.frequency.value = frequency;
    if (callback) {
      callback(volume, frequency);
    } else if (this.callbackUponUpdate) {
      this.callbackUponUpdate(volume, frequency);
    }
  }

  function stop() {
    // example usage: <body onmouseup="_2DNote.stop();" style="width: 100vw; height: 100vh;" ontouchend="_2DNote.stop();"></body>
    if (this.note == null) return;
    var oscillator = this.note.oscillator;
    oscillator.stop(this.audioContext.currentTime);
    this.note = null;
  }

  function setupExitedViewDetection(e) {
    // TODO: only continue if detect does not already exist
    const element = e ? e : document.body;
    console.log(element);
    if (element.removeEventListener && element.addEventListener) {
      element.removeEventListener("mouseleave", this.warnExitedView);
      element.removeEventListener("touchcancel", this.warnExitedView);
      element.addEventListener("mouseleave", this.warnExitedView);
      element.addEventListener("touchcancel", this.warnExitedView);
    }
  }

  function warnExitedView(e) {
    const element = e ? e : document.body;
    var screenWidth = element.clientWidth;
    var screenHeight = element.clientHeight;
    var simulatedCenterClick = {
      // center: guaranteed != edge
      currentTarget: true,
      clientX: screenWidth / 2,
      clientY: screenHeight / 2,
    };
    _2DNote.play(simulatedCenterClick);
    setTimeout(function () {
      _2DNote.stop();
      if (element.removeEventListener) {
        element.removeEventListener("mouseleave", _2DNote.warnExitedView);
        element.removeEventListener("touchcancel", _2DNote.warnExitedView);
      }
    }, 100);
  }

  function getFrequency(e) {
    // e = event or element
    var x = this.getX(e);
    var frequency = this.normalize(
      x,
      this.viewXRange,
      this.comfyFrequencyRange
    );
    return frequency;
  }

  function getVolume(e) {
    // e = event or element
    var y = this.getY(e);
    // technically getting gain (which ranges 0 to 1)
    var volume = this.normalize(y, this.viewYRange, this.comfyVolumeRange);
    return volume;
  }

  function getX(e) {
    // e = event or element
    var isMouseEvent = e.currentTarget && e.clientX;
    var isTouchEvent = e.touches;
    if (isMouseEvent) {
      return e.clientX;
    } else if (isTouchEvent) {
      return e.touches[0].clientX;
    } else {
      // element
      return e.offsetLeft;
    }
  }

  function getY(e) {
    // e = event or element
    var isMouseEvent = e.currentTarget && e.clientY;
    var isTouchEvent = e.touches;
    if (isMouseEvent) {
      return e.clientY;
    } else if (isTouchEvent) {
      return e.touches[0].clientY;
    } else {
      // element
      return e.offsetTop;
    }
  }

  function normalize(
    value,
    [inputRangeMin, inputRangeMax],
    [outputRangeMin, outputRangeMax]
  ) {
    var inputBias = value - inputRangeMin;
    var ratioAdjustment =
      (outputRangeMax - outputRangeMin) / (inputRangeMax - inputRangeMin);
    var outputBias = outputRangeMin;
    return inputBias * ratioAdjustment + outputBias;
  }

  function copy() {
    /**
     * If you want to play multiple notes at the same time,
     * you can use this to create more instances.
     */
    return recursiveDeepCopy(this);
    function recursiveDeepCopy(object) {
      if (object === null || typeof object !== "object") {
        return object;
      } else if (Array.isArray(object)) {
        var arrayCopy = [];
        object.forEach(function (element) {
          arrayCopy.push(recursiveDeepCopy(element));
        });
        return arrayCopy;
      } else {
        var objectCopy = {};
        for (var property in object) {
          if (object.hasOwnProperty(property)) {
            if (property === "audioContext") {
              objectCopy.audioContext = new AudioContext();
            } else {
              objectCopy[property] = recursiveDeepCopy(object[property]);
            }
          }
        }
        return objectCopy;
      }
    }
  }

  return {
    audioContext: audioContext,
    note: note,
    viewXRange: viewXRange,
    viewYRange: viewYRange,
    comfyFrequencyRange: comfyFrequencyRange,
    comfyVolumeRange: comfyVolumeRange,
    setAs2DArea: setAs2DArea,
    play: play,
    update: update,
    stop: stop,
    setupExitedViewDetection: setupExitedViewDetection,
    warnExitedView: warnExitedView,
    getFrequency: getFrequency,
    getVolume: getVolume,
    getX: getX,
    getY: getY,
    normalize: normalize,
    copy: copy,
  };
})();

if (window) {
  window._2DNote = _2DNote;
}

if (module) {
  module.exports = _2DNote;
}
