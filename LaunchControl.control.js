loadAPI(1);

host.defineController("Novation", "Launch Control", "1.0", "05e2b820-177e-11e4-8c21-0800200c9a66");
host.defineMidiPorts(1, 1);
host.addDeviceNameBasedDiscoveryPair(["Launch Control"], ["Launch Control"]);

//Load LaunchControl constants containing the status for pages and other constant variables
load("LaunchControl_constants.js");

var buttonMode = ButtonMode.STOP;

var playbackStates =
[
	PlaybackState.STOPPED,
	PlaybackState.STOPPED,
	PlaybackState.STOPPED,
	PlaybackState.STOPPED,
	PlaybackState.STOPPED,
	PlaybackState.STOPPED,
	PlaybackState.STOPPED,
	PlaybackState.STOPPED
];

var muteStates =
[
	false,
	false,
	false,
	false,
	false,
	false,
	false,
	false
];

var soloStates =
[
	false,
	false,
	false,
	false,
	false,
	false,
	false,
	false
];

var deviceCursors 	= [];
var childTracks 	= [];
var childTrackCount = [];
var childDevices 	= [];

function init()
{
	// Setup MIDI in stuff
	host.getMidiInPort(0).setMidiCallback(onMidi);

	// create a trackbank (arguments are tracks, sends, scenes)
	trackBank = host.createMasterTrack(0).createSiblingsTrackBank(NUM_TRACKS, NUM_SENDS, NUM_SCENES, false, false);

	var slotBanks = [];

	for (var i = 0; i < NUM_TRACKS; i++)
	{
		childTracks[i] = trackBank.getTrack(i).createTrackBank(MAX_CHILD_TRACKS, 0, 0, false);
		childTracks[i].addChannelCountObserver(childrenCountObserver(i));

		slotBanks[i] = trackBank.getTrack(i).getClipLauncherSlots();
		slotBanks[i].addPlaybackStateObserver(playbackObserver(i));

		// create main device cursor for the track
		deviceCursors[i] = trackBank.getTrack(i).createCursorDevice("Primary" + i);

		// create child track cursors for the track, one for each potential child
		var childDevicesArray = [];
		for (var j = 0; j < MAX_CHILD_TRACKS; j++)
		{
			childDevicesArray[j] = trackBank.getTrack(i).createCursorDevice("Child" + i + ":" + j);
		}
		childDevices[i] = childDevicesArray;

		trackBank.getTrack(i).getMute().addValueObserver(muteObserver(i));
		trackBank.getTrack(i).getSolo().addValueObserver(soloObserver(i));
	}
}

function updatePads()
{
    for (var i = 0; i < 8; i++)
    {
		if (buttonMode == ButtonMode.STOP)
		{
			var state = playbackStates[i];
			sendMidi(UserPagePads.Page1, ButtonReverseMap[i], PlaybackStateColour[state]);
		}
		else if (buttonMode == ButtonMode.MUTE)
		{
			sendMidi(UserPagePads.Page1, ButtonReverseMap[i], MuteColour[muteStates[i] ? 1 : 0]);
		}
		else if (buttonMode == ButtonMode.SOLO)
		{
			sendMidi(UserPagePads.Page1, ButtonReverseMap[i], SoloColour[soloStates[i] ? 1 : 0]);
		}
	}

	sendMidi(SideButton.STATUS, SideButton.DOWN, SideButtonColour[buttonMode == ButtonMode.SOLO ? 1 : 0]);
	sendMidi(SideButton.STATUS, SideButton.RIGHT, SideButtonColour[buttonMode == ButtonMode.MUTE ? 1 : 0]);
}

var childrenCountObserver = function(channel)
{
    var ch = channel;
    return function (count)
		{
			if (count > MAX_CHILD_TRACKS)
			{
				count = MAX_CHILD_TRACKS;
			}
			childTrackCount[ch] = count;
			for (var i = 0; i < count; i++)
			{
				var child_channel = childTracks[ch].getChannel(i);
				childDevices[ch][i].selectFirstInChannel(child_channel);
			}
		}
};

var playbackObserver = function(channel)
{
    var ch = channel;
    return function (slot, state, queued)
		{
			//println(ch + " " + slot + " " + state + " " + queued);
			if (state == 0 && !queued)
			{
				playbackStates[ch] = PlaybackState.STOPPED;
			}
			else if (state == 0 && queued)
			{
				playbackStates[ch] = PlaybackState.STOPDUE;
			}
			else if (state == 1 && queued)
			{
				playbackStates[ch] = PlaybackState.QUEUED;
			}
			else if (state == 1 && !queued)
			{
				playbackStates[ch] = PlaybackState.PLAYING;
			}

			var state = playbackStates[ch];
			if (buttonMode == ButtonMode.STOP)
			{
				sendMidi(UserPagePads.Page1, ButtonReverseMap[ch], PlaybackStateColour[state]);
			}
		}
};

var muteObserver = function(channel)
{
	println
    var ch = channel;
    return function (mute)
		{
			muteStates[ch] = mute;
			if (buttonMode == ButtonMode.MUTE)
			{
				println(mute);
				sendMidi(UserPagePads.Page1, ButtonReverseMap[ch], MuteColour[mute ? 1 : 0]);
			}
		}
};

var soloObserver = function(channel)
{
    var ch = channel;
    return function (solo)
		{
			soloStates[ch] = solo;
			if (buttonMode == ButtonMode.SOLO)
			{
				sendMidi(UserPagePads.Page1, ButtonReverseMap[ch], SoloColour[solo ? 1 : 0]);
			}
		}
};

function processSideButtons(status, data1, data2)
{
	// User Preset 1, side buttons change mode
	// Hold buttons for mute or solo mode, release to go back to stop mode
	if (status == SideButton.STATUS && data1 == SideButton.RIGHT)
	{
		//println("mute mode\n");
		if (data2 == 127)
		{
			buttonMode = ButtonMode.MUTE;
		}
		else if (data2 == 0 && buttonMode == ButtonMode.MUTE)
		{
			buttonMode = ButtonMode.STOP;
		}
		updatePads();
	}
	else if (status == SideButton.STATUS && data1 == SideButton.DOWN)
	{
		//println("solo mode\n");
		if (data2 == 127)
		{
			buttonMode = ButtonMode.SOLO;
		}
		else if (data2 == 0 && buttonMode == ButtonMode.SOLO)
		{
			buttonMode = ButtonMode.STOP;
		}
		updatePads();
	}
}

function onMidi(status, data1, data2)
{
	//printMidi(status, data1, data2);
	//println(MIDIChannel(status));

	processSideButtons(status, data1, data2);

	// User Preset 1 = pads function is mode dependent
	if (status == UserPagePads.Page1)
    {
		if (buttonMode == ButtonMode.STOP)
		{
			trackBank.getChannel(ButtonMap[data1]).stop();
		}
		else if (buttonMode == ButtonMode.MUTE)
		{
			trackBank.getChannel(ButtonMap[data1]).getMute().toggle();
		}
		else if (buttonMode == ButtonMode.SOLO)
		{
			trackBank.getChannel(ButtonMap[data1]).getSolo().toggle(false);
		}
	}

	// Knobs control first two macros of each channel
	if (status == UserPageKnobs.Page1 && KnobMap[data1] >= 0 && KnobMap[data1] <= 15)
	{
		var channelIdx = KnobMap[data1] % 8;
		var macro = KnobMap[data1] / 8;

		deviceCursors[channelIdx].getMacro(macro).getAmount().set(data2, 128);
		for (var i = 0; i < childTrackCount[channelIdx]; i++)
		{
			childDevices[channelIdx][i].getMacro(macro).getAmount().set(data2, 128);
		}
	}
}

//Works
function exit()
{
   sendMidi(0xB8, 0x00, 0x00);
}

function setSideLED(index, colour)
{
   sendMidi(0xb8, (72 + index), colour);
}
