/**
 * This module defines the functions for interacting with the web midi api.
 */
// Transport Variables
var bpm = 120.0;  // beats per minute
var current_pattern = 0;  // the currently playing pattern
var queued_patterns = []; // an array of patterns to play next
var ppq = 24;  // midi pulses per quarter note
var bpm_array = new Array(ppq).fill(0.0);  // an array of bpm values for averaging
var previous_clock_time = 0.0;  // time since the last clock tick
var clock_diffs = new Array(ppq).fill(0.0);  // an array of clock clock_diffs for averaging
const banks = ["A", "B", "C", "D", "E", "F", "G", "H"];
const patterns_per_bank = 16;


// Transport Input Functions
/**
 * Callback on clock event, sets bpm to an average of the last
 * number of ticks.
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

    // now determine the tempo, we expect 24 ticks beat,
    // so we can use this to determine a tempo in beats per minute
    const beat_time = diff_average * 24;
    const beats_per_second = 1000 / beat_time;
    bpm_array.push(beats_per_second * 60);
    bpm_array.shift();

    // get the average bpm
    const average_bpm = bpm_array.reduce((a, b) => a + b, 0) / bpm_array.length;
    bpm = Math.round(average_bpm * 10) / 10;

    // now show it in the html
    document.getElementById("current_bpm").innerHTML = bpm;
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


function _prgmchangeReceive(event) {
    const pattern_name = _derivePatternName(event.value);
    console.log("recieved pattern: ", pattern_name);
    // now show it
    document.getElementById("current_pattern").innerHTML = pattern_name;
}


/**
 * Setup the input event listeners.
 */
function _setupInputListeners(main_clock_device, main_clock_channel) {

    // Define the listeners
    main_clock_device.addListener("clock", main_clock_channel.toString(), _clockReceive);
    main_clock_device.addListener("start", main_clock_channel.toString(), _startReceive);
    main_clock_device.addListener("stop", main_clock_channel.toString(), _stopReceive);
    main_clock_device.addListener("programchange", main_clock_channel.toString(), _prgmchangeReceive);
}


// Output Functions
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


/**
 * Queue a pattern to begin playing once the transport reaches the start position.
 */
function _queuePattern(midi_device, pattern_name, start_position, offset=0) {

}


// Base midi processor
// function MidiProcessor(midi_device) {

//     const init = function (midi_device) {
//         this.device = midi_device;
//     }


//     return {init}
// }


// Public API
// Input
export function MidiInputProcessor(input_device, channel) {
    this.device = input_device;
    this.channel = channel;
    _setupInputListeners(this.device, this.channel);
}


// Output
export function MidiOutputProcessor(output_device, clock_source) {
    this.device = output_device;
}


/**
 * Given a digi-form pattern_name (eg A12, B14), send a program change message
 * to the given midi device.
 */
MidiOutputProcessor.prototype.changePattern = function(pattern_name) {
    console.log("changing pattern of device", this);
    const program_number = _deriveProgramNumber(pattern_name);
    this.device.sendProgramChange(program_number);
    console.log("Switched to :", pattern_name, "--- prg:", program_number);
}
