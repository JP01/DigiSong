// Functions which interact with the dom

// Main clock information
var _sequencer = undefined;
var trackDeviceList = [];
var trackDeviceSelectCallback = undefined;

// hard coded because dynamically getting this is overly complicated.
var midi_channel_options = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];

/**
 * Populate a select element with options.
 * @param {str} element_id - the parent element to fill with options
 * @param {list[str]} options - the options to populate the list with
 * @param {func} onchange_callback - the callback to trigger onchange
 */
export function _createSelectionList(id, options, onchange_callback=undefined, placeholder_text="") {
    // Insert the placeholder element
    var selection_element = document.createElement("select");
    selection_element.id = id;
    if (placeholder_text) {
        var ph_element = document.createElement("option");
        ph_element.value = "";
        ph_element.disabled = true;
        ph_element.selected = true;
        ph_element.textContent = placeholder_text;
        selection_element.appendChild(ph_element);
    }
    // create a list of options dropdown
    for (const option of options) {
        var opt_element = document.createElement("option");
        opt_element.textContent = option;
        opt_element.value = option;
        selection_element.appendChild(opt_element);
    }
    if (onchange_callback) {
        selection_element.onchange = ()=>onchange_callback();
    }

    return selection_element;
}

// Get the selection from the list
export function getUserSelection(element_id) {
    const options = document.getElementById(element_id);
    return options.selectedIndex;
}

/**
 * Update the current BPM element to show the current bpm.
 */
export function updateCurrentBPM(bpm) {
    document.getElementById("current_bpm").innerHTML = bpm;
}


/**
 * Show all patterns queued for the current device.
 */
export function showPatternQueue(track) {
    console.log(track.name, track.queued_patterns);
    const patterns = document.getElementById("patterns" + track.track_num);
    // clear the list
    patterns.innerHTML = "";
    // Now repopulate
    for (const pattern of track.queued_patterns) {
        var item = document.createElement("li");
        item.textContent = pattern;
        patterns.appendChild(item);
    }
}

/*

Main Clock / Sequencer

*/

// the start button element
function elemStartButton() {
    var start_button = document.createElement("button");
    start_button.id = "start_button";
    start_button.textContent = "Play";
    start_button.onclick = ()=>_sequencer.start();
    return start_button;
}

// the stop button element
function elemStopButton() {
    var stop_button = document.createElement("button");
    stop_button.id = "stop_button";
    stop_button.textContent = "Stop";
    stop_button.onclick = ()=>_sequencer.stop();
    return stop_button;
}

function selectMainClock() {
    // use -1 as theres default placeholder in the dropdown which occupies the first index
    const device_idx = getUserSelection("main_clock_device") - 1;
    // this one is zero indexed but it actually needs to start at 1!
    const main_clock_channel = getUserSelection("main_clock_channel") + 1;

    // Once a selection is made, setup the stuff.
    const main_clock_device = WebMidi.inputs[device_idx];
    console.log("main clock device:", main_clock_device.name);

    // setup the sequencer object
    _sequencer.setClockSource(main_clock_device, main_clock_channel);
}

export function createMainClockSelect(sequencer, default_device=-1) {
    // set the global sequencer
    _sequencer = sequencer;

    // Setup the device selected callback
    const deviceSelectedCallback = () => selectMainClock();

    // create a list of device names for populating dropdown
    const device_names = []
    for (const device of sequencer.midi_inputs) {
        device_names.push(device.name);
    }
    // now setup the main clock selector
    var main_clock_element = document.getElementById("main_clock");
    var main_clock_device = _createSelectionList(
        "main_clock_device",
        device_names,
        deviceSelectedCallback,
        "Choose a MIDI device.",
    );
    main_clock_element.appendChild(main_clock_device);

    // channel selector
    var main_clock_channel = _createSelectionList(
        "main_clock_channel", midi_channel_options, deviceSelectedCallback
    );
    main_clock_element.appendChild(main_clock_channel);

    // transport control buttons
    const play_button = elemStartButton();
    const stop_button = elemStopButton();
    main_clock_element.appendChild(play_button);
    main_clock_element.appendChild(stop_button);


    // select a default device and trigger the callback
    if (default_device >= 0) {
        main_clock_device.value = device_names[default_device];
        selectMainClock();
    }

    return main_clock_element;
}

/*

Track Creation

*/
// Button element for creating tracks
function elemAddTrackButton(track_element) {
    var create_track_button = document.createElement("button");
    create_track_button.id = "track_create_" + track_element.track_num;
    create_track_button.textContent = "Create New Track";
    create_track_button.onclick = () => createTrackClicked(track_element);
    return create_track_button;
}

// Div element for all the midi options for the track
function elemTrackMidiOptions(track_element) {
    var track_midi_options = document.createElement("div");
    track_midi_options.id = "track_midi_options_" + track_element.track_num;

    // create a list of output midi device names
    var device_names = []
    for (const device of track_element.device_list) {
        device_names.push(device.name);
    }
    // create the device selector
    var track_device_element = "track_device_" + track_element.track_num;
    track_device_element = _createSelectionList(
        track_device_element,
        device_names,
        track_element.deviceSelectedCallback,
        "Choose a MIDI device."

    )
    track_midi_options.appendChild(track_device_element);

    // create the channel selector
    var track_channel_element = "track_channel_" + track_element.track_num;
    track_channel_element = _createSelectionList(
        track_channel_element,
        midi_channel_options,
        track_element.deviceSelectedCallback,
    )
    track_midi_options.appendChild(track_channel_element);
    return track_midi_options;
}

// callback when a track midi device is selected
function trackMidiSelected(track_element) {
    // get the selectede midi options
    const device_idx = getUserSelection("track_device_" + track_element.track_num) - 1;
    const channel_idx = getUserSelection("track_channel_" + track_element.track_num);
    const device = track_element.device_list[device_idx];
    const channel = midi_channel_options[channel_idx];

    // now apply it to the track object
    track_element.track.setDevice(device);
    track_element.track.setChannel(channel);
}

// Create a track for the given sequencer
export function createTrack() {
    if (!_sequencer) {
        console.log("No Main Clock Source defined, please select a clock source!");
        return;
    }
    var new_track = _sequencer.createTrack();
    var track_element = new TrackElement(new_track);
    return track_element;
}

// callback when create track button is clicked.
function createTrackClicked(track_element) {
    // Set the current track to active
    track_element.create_track_button.hidden = true;
    track_element.midi_options.hidden = false;
    track_element.pattern_chain.hidden = false;

    // and create a new track stub
    createTrack();
}


export function TrackElement(track) {
    /* This object represents the DOM Track element and all the nested
    * track elements.
    */
    var self = this;
    this.track = track;
    this.track_num = this.track.track_num;
    this.device_list = _sequencer.midi_outputs;
    this.deviceSelectedCallback = () => trackMidiSelected(self);

    console.log("Creating a new sequencer track ", this.track_num);
    var track_elements = document.getElementById("tracks");

    // create the track
    var track_item = document.createElement("li");
    track_item.id = "track_" + this.track_num;

    // create the 'create track' button
    this.create_track_button = elemAddTrackButton(self);
    track_item.appendChild(this.create_track_button);

    // Create the midi selector
    this.midi_options = elemTrackMidiOptions(self);
    this.midi_options.hidden = true;
    track_item.appendChild(this.midi_options);

    // Create the pattern sequencer
    this.pattern_chain = PatternChainElement(self);
    this.pattern_chain.hidden = true;
    track_item.appendChild(this.pattern_chain);

    // Add the track to the tracks
    track_elements.appendChild(track_item);
    return track_item;
}


/*
    Track Patterns
*/
function createPatternClicked(button_element, track_element) {
    // Queue the default pattern
    track_element.track.queuePattern();

    // create a pattern selector in the current slot
    var current_pattern_slot = button_element.parentElement;
    const select_name =  current_pattern_slot.id + "_select";

    var pattern_select = _createSelectionList(
        select_name,
        track_element.track.pattern_options,
        patternSelected.bind(this, track_element, current_pattern_slot)
    );
    current_pattern_slot.appendChild(pattern_select);

    // Hide the create pattern button of the current slot
    button_element.hidden = true;

    // Create the new pattern and fill it with a create button
    const new_pattern_slot = PatternSlotElement(track_element);
    track_element.pattern_chain.appendChild(new_pattern_slot);
}

// Add a pattern to the track element
function elemAddPatternButton(track_element) {
    var add_pattern_button = document.createElement("button");
    add_pattern_button.id = "pattern_create_" + track_element.track_num;
    add_pattern_button.textContent = "Create New Pattern";
    add_pattern_button.onclick = () => createPatternClicked(add_pattern_button, track_element);
    return add_pattern_button;
}

// callback which gets triggered when a pattern is selected
function patternSelected(track_element, pattern_slot_element) {

    // Get an array of all the slot elements and use this to determine
    // the current slotnum
    const all_slots = Array.from(pattern_slot_element.parentElement.children);
    const slot_num = all_slots.indexOf(pattern_slot_element);

    // get the selected pattern and set it in the track
    const pattern_select = pattern_slot_element.getElementsByTagName("select")[0];
    const selection = getUserSelection(pattern_select.id);
    track_element.track.updatePattern(slot_num, selection);
    console.log("Selected pattern", selection);
}

// Represent a pattern slot element
function PatternSlotElement(track_element) {
    const slot_num = track_element.track.queued_patterns.length;
    var pattern_slot = document.createElement("li");
    pattern_slot.id = "pattern_" + track_element.track_num + "_" + slot_num;

    // add the creation button
    const add_pattern_button = elemAddPatternButton(track_element);
    pattern_slot.appendChild(add_pattern_button);

    return pattern_slot;
}

// Represent the chain of patterns element
function PatternChainElement(track_element) {
    // create a new pattern chain
    var pattern_chain = document.createElement("ul");
    pattern_chain.id = "patterns_" + track_element.track_num;

    // Create the first slot
    var pattern_slot = PatternSlotElement(track_element);
    pattern_chain.appendChild(pattern_slot);
    return pattern_chain;
}
