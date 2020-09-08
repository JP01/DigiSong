import { DigiSongTrack, DigiSongSequencer } from "./midi.js"
import {createMainClockSelect, getUserSelection, createTrack} from "./dom_handler.js"



function _run(err) {
    if (err) console.log("An error occured!", err);
    // Setup the main clock source
    const sequencer = new DigiSongSequencer(WebMidi.inputs, WebMidi.outputs);
    // create an initial track stub
    createMainClockSelect(sequencer, 0);
    createTrack(sequencer);
};
WebMidi.enable(_run);
