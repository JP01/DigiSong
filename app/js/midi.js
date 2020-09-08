/**
 * This module defines the functions for interacting with the web midi api.
 */
import {updateCurrentBPM} from "./dom_handler.js"

// global to store clock source
var main_clock_source = undefined;
var main_clock_channel = 1;

// Transport Variables
var bpm = 120.0;  // beats per minute
var current_pattern = 0;  // the currently playing pattern
var queued_patterns = {}; // a dictionary of patterns to play next
var ppq = 24;  // midi pulses per quarter note
var bpm_array = new Array(ppq).fill(0.0);  // an array of bpm values for averaging
var previous_clock_time = 0.0;  // time since the last clock tick
var clock_diffs = new Array(ppq).fill(0.0);  // an array of clock clock_diffs for averaging
const banks = ["A", "B", "C", "D", "E", "F", "G", "H"];
const patterns_per_bank = 16;

// Get an array of all integers between a start and endpoint
function range(end, start=1) {
    return Array(end - start + 1).fill().map((_, idx) => start + idx)
}

// Transport Input Functions
/**
 * Callback on clock event, sets bpm based on average tick interval.
 */
function _clockReceive(event) {
    // Get the time difference between this tick and the last
    var clock_diff = event.timestamp - previous_clock_time;
    previous_clock_time = event.timestamp;

    // add the time difference to the front of the array and remove the last item
    clock_diffs.push(clock_diff);
    clock_diffs.shift()

    // get the average difference
    const diff_average = clock_diffs.reduce((a, b) => a + b, 0) / clock_diffs.length;

    // now determine the tempo, we expect 24 (ppq) ticks beat,
    // so we can use this to determine a tempo in beats per minute
    const beat_time = diff_average * ppq;
    const beats_per_second = 1000 / beat_time; //convert to milli seconds
    bpm_array.push(beats_per_second * 60);
    bpm_array.shift();

    // get the average bpm
    const average_bpm = bpm_array.reduce((a, b) => a + b, 0) / bpm_array.length;
    bpm = Math.round(average_bpm * 10) / 10;

    // now show it in the html
    updateCurrentBPM(bpm);
}


/**
 * Callback on midi start event.
 */
function _startReceive(event) {
    console.log("Start: ", event.timestamp);

}
function _startSend(track) {
    console.log("Starting ", track);
    // track.device.sendStart();
}

/**
 * Callback on midi stop event.
 */
function _stopReceive(event) {
    console.log("Stop :", event.timestamp);
}
function _stopSend(track) {
    console.log("Stopping ", track);
    // track.device.sendStop();
}

/**
 * Callback on midi program change event.
 */
function _prgmchangeReceive(event) {
    const pattern_name = _derivePatternName(event.value);
    console.log("recieved pattern: ", pattern_name);
}

/**
 * Setup a list of listeners on a midi device
*/
function _setupListeners(midi_device, listeners) {
    // Remove any existing listeners
    for (const listener of listeners) {
        midi_device.removeListener.apply(midi_device, listener);
        midi_device.addListener.apply(midi_device, listener);
    }
}

/**
 * Setup the input midi event listeners for the main clock source.
 */
function _setupMainClock(midi_device, midi_channel) {
    // Sets the global clock to this
    main_clock_source = midi_device;
    main_clock_channel = midi_channel;
    // Define the listeners
    const clock_channel = midi_channel.toString();
    const clock_listener = ["clock", clock_channel, _clockReceive];
    const start_listener = ["start", clock_channel, _startReceive];
    const stop_listener = ["stop", clock_channel, _stopReceive];
    const prgm_chng_listener = ["programchange", clock_channel, _prgmchangeReceive];

    const main_clk_listeners = [clock_listener, start_listener, stop_listener, prgm_chng_listener];
    // remove all other devices clock listeners
    for (const device of WebMidi.inputs) {
        for (const listener of main_clk_listeners) {
            device.removeListener.apply(device, listener);
        }
    }
    _setupListeners(midi_device, main_clk_listeners);
}


// MidiOutputProcessor Functions
/**
 * Queue a pattern to a midi output processor.
 * Queue a pattern to begin playing once the transport reaches the start position.
 */
function _queuePattern() {
    // queue a default pattern
    this.queued_patterns.push(0);
    console.log("Queued Patterns: ", this.queued_patterns);
}

// Update a pattern in the queue to a new pattern number
function _updatePattern(pattern_index, pattern_num) {
    console.log("Updating pattern ", pattern_index, "to", pattern_num);
    this.queued_patterns[pattern_index] = pattern_num;
}

// callback which is triggered by program change to play the next pattern
function _setNextPattern(track) {
    track.current_pattern += 1;
    // if the pattern is now greater than the length, we have reached the end.
    // if we want to loop we can play from the start averaging
    if (track.current_pattern >= track.queued_patterns.length) {
        track.current_pattern = 0;
    }
    const next_pattern_num = track.queued_patterns[track.current_pattern];
    console.log("Next pattern index ", track.current_pattern, "pattern", next_pattern_num);
    _changePattern(next_pattern_num, track);
}

function _startProcessing() {

    // setup the listeners
    for (const track of this.tracks) {
        // if no device is selected for track, don't process
        if (!track.input_device) continue;

        // Now send a start message to all tracks and add the listeners
        console.log("processing", track.track_num, track.queued_patterns);

        // setup a callback to queue the next pattern to play when a
        // program change event is received.
        const prgm_chng_listener = ["programchange", track.channel, _setNextPattern.bind(this, track)];
        const device_listeners = [prgm_chng_listener];

        // kill any existing listeners so that things don't freak out
        for (const listener of device_listeners) {
            track.input_device.removeListener.apply(track.input_device, listener);
        }

        // set the first pattern
        _setNextPattern(track);

        // // now reset the listeners
        // _setupListeners(track.input_device, device_listeners);
    }

    // trigger the first pattern to start playing
    this.running = true;

    for (const track of this.tracks) {
        // if no device is selected for track, don't process
        if (!track.input_device) continue;
        // _startSend(track);
    }

}

function _stopProcessing() {
    this.running = false;

}

/**
 * Given a digi-form pattern_name (eg A12, B14), send a program change message
 * to the given midi device.
 */
function _changePattern(pattern_num, track=undefined) {
    if (!track) {
        track = this;
    }
    console.log("changing pattern of device", track.device, "to", pattern_num);
    track.device.sendProgramChange(pattern_num);
    console.log("Switched to :", _derivePatternName(pattern_num), "--- prg:", pattern_num);
}

// HELPER FUNCTIONS
/**
 * Derive the program change number from the pattern name
 */
function _deriveProgramNumber(pattern_name) {
    // extract the bank and pattern number from the pattern_name
    const bank_pattern = pattern_name.match(/\b([A-Z]){1}(\d+)\b/);
    const bank_value = banks.indexOf(bank_pattern[1]) * patterns_per_bank;
    const pattern = parseInt(bank_pattern[2] - 1); // must be 0 indexed!

    // if the pattern doesn't exist then don't do anything.
    if (bank_value == undefined || !(0 <= pattern <= 15)) {
        console.log(bank_value);
        console.log(pattern);
        console.log("Error, pattern doesn't exist: ", pattern_name)
        return 0;
    }

    // sum the bank and the pattern number to get the actual midi value
    // to send as program change.
    const program_number = bank_value + pattern;
    return program_number;
}


/**
 * Derive the program name from a program number.
 */
function _derivePatternName(program_number) {
    // program number must be between 1 and 127
    if (!(0 <= program_number <= 127)) {
        console.log("invalid program number", program_number);
        return "";
    }
    const bank = Math.floor(program_number / patterns_per_bank);
    const bank_string = banks[bank];

    // we need to adjust to account for pattern names being 1 indexed instead of 0
    const adjusted_prg_num = program_number + 1;
    const pattern_num = adjusted_prg_num % patterns_per_bank || 16;
    const pattern_string = pattern_num.toString();
    return bank_string + pattern_string;
}


// MIDI processors

// Input
function MidiInputProcessor(input_device, channel, main_clock=false) {
    this.device = input_device;
    this.channel = channel;
    this.name = this.device.name;
    // if this is the main clock source, then set it up
    if (main_clock) {
        _setupMainClock(this.device, this.channel)
    }
    // _setupInputListeners(this.device, this.channel);
}


// Output
/**
 * A track of DigiSong, this represents all the information about a single
 * track, such as midi device, and patterns.
*/
export function DigiSongTrack(track_num) {
    // the device we will listen to for program changes,
    // this is currently always the webmidi "Input" object which corresponds
    // to the track output device. IE INPUT == OUTPUT device, but because
    // webmidi treats them as different type of object, we need to keep a
    // reference to both.
    this.input_device = undefined;
    this.device = undefined;
    this.channel = 1;
    this.name = "";
    this.clock_source_device = main_clock_source;
    this.clock_source_channel = main_clock_channel;
    this.track_num = track_num;

    // patterns
    this.pattern_options = banks.flatMap(d => range(patterns_per_bank).map(v => d + v));
    this.queued_patterns = [];
    this.current_pattern = 0;
}
DigiSongTrack.prototype.queuePattern = function(pattern_name) {
    _queuePattern.call(this, pattern_name);
}
DigiSongTrack.prototype.clearPatterns = function() {
    this.queued_patterns = [];
}
DigiSongTrack.prototype.updatePattern = function(pattern_index, pattern_num) {
    // Update a pattern at index to the new pattern
    _updatePattern.call(this, pattern_index, pattern_num);
}
DigiSongTrack.prototype.changePattern = function(pattern_name) {
    const pattern_num = _deriveProgramNumber(pattern_name);
    _changePattern.call(this, pattern_num);
}
DigiSongTrack.prototype.setDevice = function(midi_device) {
    console.log("Track: ", this.track_num, " Device", midi_device.name);
    this.device = midi_device;
    this.name = this.device.name;

    // TODO: This needs to support multiple of the same device!
    for (const device of WebMidi.inputs) {
        if (device.name == this.name) {
            this.input_device = device;
        }
    }
}
DigiSongTrack.prototype.setChannel = function(channel) {
    console.log("Track: ", this.track_num, " Channel", channel);
    this.channel = channel;
}

/**
 * The main sequencer object which maintains references to tracks.
 */
export function DigiSongSequencer(midi_inputs, midi_outputs) {
    // assign the possible midi devices
    this.midi_inputs = midi_inputs;
    this.midi_outputs = midi_outputs;

    // now assign the other internal vars
    this.tracks = [];
    this.running = false;
}
DigiSongSequencer.prototype.setClockSource = function(main_clock_device,main_clock_channel) {
    this.clock_source = new MidiInputProcessor(
        main_clock_device, main_clock_channel, true
    );
}
DigiSongSequencer.prototype.createTrack = function() {
    const next_tracknum = this.tracks.length;
    var new_track = new DigiSongTrack(next_tracknum)
    this.tracks.push(new_track);
    return new_track;
}
DigiSongSequencer.prototype.start = function() {
    _startProcessing.call(this);
}
DigiSongSequencer.prototype.stop = function() {
    _stopProcessing.call(this);
}
