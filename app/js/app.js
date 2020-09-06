import { DigiSongTrack, DigiSongSequencer } from "./midi.js"
import {createMainClockSelect, getUserSelection, createTrack} from "./dom_handler.js"



function _run(err) {
    if (err) console.log("An error occured!", err);
    // Setup the main clock source
    const sequencer = new DigiSongSequencer(WebMidi.inputs, WebMidi.outputs);
    // create an initial track stub
    createTrack(sequencer);
    createMainClockSelect(sequencer, 1);
};
WebMidi.enable(_run);



/**
* Create a new DigiSongTrack.
* Called when selected a track device,
*/
function _selectTrackDevice(track_num=0) {
    return function() {

        // use -1 as theres default placeholder in the dropdown which occupies the first index
        const device_element_id = "device" + track_num;
        const device_idx = getUserSelection(device_element_id) - 1;
        const midi_device = WebMidi.outputs[device_idx];

        const midi_track = new DigiSongTrack(midi_device, main_clock_source, track_num);
        // midi_track.queuePattern("A1");
        // midi_track.queuePattern("A2");
        // midi_track.queuePattern("A3");
        // midi_track.queuePattern("A4");
        // midi_track.queuePattern("E4");

        // showPatternQueue(midi_track);
    }
    }
