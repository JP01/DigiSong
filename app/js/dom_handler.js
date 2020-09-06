// Functions which interact with the dom


/**
 * Populate a select element with options.
 * @param {str} element_id - the parent element to fill with options
 * @param {list[str]} options - the options to populate the list with
 * @param {func} onchange_callback - the callback to trigger onchange
 */
export function _createSelectionList(element, options, onchange_callback, placeholder_text="Choose a MIDI device") {
    // Insert the placeholder element
    var ph_element = document.createElement("option");
    ph_element.value = "";
    ph_element.disabled = true;
    ph_element.selected = true;
    ph_element.textContent = placeholder_text;
    element.appendChild(ph_element);

    // create a list of options dropdown
    for (const option of options) {
        var opt_element = document.createElement("option");
        opt_element.textContent = option;
        opt_element.value = option;
        element.appendChild(opt_element);
    }
    element.addEventListener("change", onchange_callback);
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


export function showPatternQueue(device, element_id) {
    console.log(device.name, device.queued_patterns);
    const patterns = document.getElementById(element_id);
    // clear the list
    patterns.innerHTML = "";
    // Now repopulate
    for (const pattern of device.queued_patterns) {
        var item = document.createElement("li");
        item.textContent = pattern;
        patterns.appendChild(item);
    }
}

export function createMainClockSelect(device_list, deviceSelectedCallback){
    var main_clock_element = document.getElementById("main_clock_source");
    _createSelectionList(main_clock_element, device_list, deviceSelectedCallback);
    return main_clock_element;
}

/**
 * Create the main sequencer DOM object.
 */
export function createNewTrackButton(device_list, deviceSelectedCallback) {
    console.log("Creating the sequencer");
    var button = document.getElementById("create_new_track");
    button.addEventListener("click", _createTrack(device_list, deviceSelectedCallback))
}

/**
 * Create a new sequencer track.
 * Args:
 *  deviceSelectedCallback (func): This callback will be triggered when a device is selected.
 */
export function _createTrack(device_list, deviceSelectedCallback) {
return function() { //closure
    console.log("Creating a new sequencer track.");
    var tracks = document.getElementById("tracks");

    // create the track
    var track = document.createElement("li");
    track.id = "track0";

    var device = document.createElement("select");
    device.id = "device0";
    var patterns = document.createElement("ul");
    patterns.id = "patterns0";

    track.appendChild(device);
    track.appendChild(patterns);

    // add the track to tracks list
    tracks.appendChild(track);
    _createSelectionList(device, device_list, deviceSelectedCallback);
}
}
