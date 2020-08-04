# DigiSong

A web based midi program change sequencer for Elektron's Digitakt and Digitone.

## **User Guide**

### ***Background***

The Digitakt and Digitone do not currently have a song mode feature. On top of this,
sequencing program change has some quirks where you have to send any program change
events just before you intend to, as sending it on the click can result in the change
not happening until the end of the next sequence.

DigiSong is an attempt to create a song mode arranger for the Digi's, which allows for
arranging a song from a number of patterns, and compensates for the strangeness around
pattern changes.

Note: any other midi instrument that supports program change could be sequenced from DigiSong.


### ***Usage***

As the tool is web-based, there’s no need to download any apps, just have a browser that supports web midi.

This means that DigiSong should be useable on any platform, including mobile, which works well with
the latest Digi OS updates DT(1.20) and DN(1.30) which now support USB audo/midi.

<br>

---

<br>

## **Developer Guide**

### ***APIs and Frameworks***
Project uses webmidi.js
https://github.com/djipco/webmidi

### ***Setup***
Requires npm
1. Clone the repo
2. `npm install`

### ***User Stories***
As a user I can
1. Select a master clock midi device
    1. This will control tempo, transport control etc
    2. The tempo will be shown to the user
    3. The transport state (ie playing, paused, stopped) will be shown to the user
2. View an arranger similar to Ableton Live, with bar number markers for lining up new patterns
    1. Grid of empty cells
3. Create a new row for the midi device in the arranger
    1. select the midi device to send pattern change to for the particular row
    2. Select the midi channel for the device
4. Insert a pattern clip onto the row.
    1. Change the length and start point of the pattern.
5. Press play on digi and have the arranger view begin playing along
    1. A scrolling line shows the current position

### ***Stretch Goals***
Things that aren't in the base release but would be nice to have
1. Record pattern changes from the digis.
    1. Play a song live and have the pattern changes recorded for playback.
