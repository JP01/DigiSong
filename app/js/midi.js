/**
 * This module defines the functions for interacting with the web midi api.
 */
import {updateCurrentBPM} from "./dom_handler.js"

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


/**
 * Callback on midi stop event.
 */
function _stopReceive(event) {
    console.log("Stop :", event.timestamp);
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
    // Define the listeners
    const clock_channel = midi_channel.toString();
    const clock_listener = ["clock", clock_channel, _clockReceive];
    const start_listener = ["start", clock_channel, _startReceive];
    const stop_listener = ["stop", clock_channel, _stopReceive];
    const main_clk_listeners = [clock_listener, start_listener, stop_listener]
    // remove all other devices clock listeners
    for (const device of WebMidi.inputs) {
        for (const listener of main_clk_listeners) {
            device.removeListener.apply(device, listener);
        }
    }
    const prgm_chng_listener = ["programchange", clock_channel, _prgmchangeReceive]
    _setupListeners(midi_device, main_clk_listeners);
}


// MidiOutputProcessor Functions
/**
 * Queue a pattern to a midi output processor.
 * Queue a pattern to begin playing once the transport reaches the start position.
 */
function _queuePattern(pattern_name) {
    const pattern_num = _deriveProgramNumber(pattern_name);
    this.queued_patterns.push(pattern_num);
}

function _processPatternQueue(midi_device) {

}

/**
 * Given a digi-form pattern_name (eg A12, B14), send a program change message
 * to the given midi device.
 */
function _changePattern(midi_device, pattern_name) {
    console.log("changing pattern of device", midi_device);
    const program_number = _deriveProgramNumber(pattern_name);
    midi_device.sendProgramChange(program_number);
    console.log("Switched to :", pattern_name, "--- prg:", program_number);
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
// Base midi processor
function MidiProcessor(midi_device, channel) {
    this.device = midi_device;
    this.channel = channel;
    this.name = this.device.name;
}

// Public API
// Input
export function MidiInputProcessor(input_device, channel, main_clock=false) {
    MidiProcessor.call(this, input_device, channel);

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
export function DigiSongTrack(midi_device, clock_source) {
    MidiProcessor.call(this, midi_device, clock_source.channel);
    this.clock_source = clock_source;
    this.running = false;
    this.queued_patterns = []
}
DigiSongTrack.prototype.queuePattern = function(pattern_name) {
    _queuePattern.call(this, pattern_name);
}
DigiSongTrack.prototype.clearPatterns = function() {
    this.queued_patterns = [];
}
DigiSongTrack.prototype.changePattern = function(pattern_name) {
    _changePattern(this.device, pattern_name);
}
