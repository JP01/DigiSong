import { MidiInputProcessor, MidiOutputProcessor } from "./midi.js"


function _run(err) {
    if (err) console.log("An error occured!", err);

    // set some default inputs
    var input = WebMidi.inputs[0];
    var output = WebMidi.outputs[0];
    console.log("_run", output);

    // select and setup the main clock
    var main_clock_channel = 1;
    var main_clock_device = new MidiInputProcessor(input, main_clock_channel);

    const midi_processor1 = new MidiOutputProcessor(output, "blah");

    midi_processor1.changePattern("A4");

};

WebMidi.enable(_run);
