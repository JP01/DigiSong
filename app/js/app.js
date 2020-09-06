import { MidiInputProcessor, DigiSongTrack } from "./midi.js"
import {createMainClockSelect, createNewTrackButton, getUserSelection, showPatternQueue} from "./dom_handler.js"

// Main clock information
var main_clock_channel = 1;
var main_clock_source = undefined;

// Contains a reference to each track
var tracks = []


function _selectMainClock() {
    // use -1 as theres default placeholder in the dropdown which occupies the first index
    const device_idx = getUserSelection("main_clock_source") - 1;
    const input = WebMidi.inputs[device_idx];

    // Once a selection is made, setup the stuff.
    // set some default inputs
    console.log("main clock device:", input.name);

    // select and setup the main clock
    main_clock_channel = 1;
    main_clock_source = new MidiInputProcessor(
        input, main_clock_channel, true
    );
}

/**
* Create a new DigiSongTrack.
* Called when selected a track device,
*/
function _selectTrackDevice(track_num) {
return function() {

    // use -1 as theres default placeholder in the dropdown which occupies the first index
    const device_element_id = "device" + track_num;
    const device_idx = getUserSelection(device_element_id) - 1;
    const midi_device = WebMidi.outputs[device_idx];

    const midi_track = new DigiSongTrack(midi_device, main_clock_source);
    tracks.push(midi_track)
    midi_track.queuePattern("A1");
    midi_track.queuePattern("A2");
    midi_track.queuePattern("A3");
    midi_track.queuePattern("A4");
    midi_track.queuePattern("E4");

    const pattern_element = "patterns0";
    showPatternQueue(midi_track, pattern_element);
}
}

/**
 * Create a new sequencer track.
 * Called when the create new button is pressed.
 */
function _createSeqTrack() {
    
}

function _run(err) {
    if (err) console.log("An error occured!", err);
    console.log(WebMidi.inputs);
    console.log(WebMidi.outputs);

    // Setup the main clock source
    var main_clock_options = [];
    for (const input of WebMidi.inputs) {
        main_clock_options.push(input.name);
    }
    var main_clock_element = createMainClockSelect(main_clock_options, _selectMainClock);
    main_clock_element.value = "Elektron Digitakt"
    _selectMainClock();

    // now setup a track
    var output_options = [];
    for (const output of WebMidi.outputs) {
        output_options.push(output.name);
    }
    createNewTrackButton(output_options, _selectTrackDevice(0));
};
WebMidi.enable(_run);
