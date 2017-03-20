loadAPI(1);

host.defineController("Novation", "Launch Control - Netsu", "1.0", "e84caa2f-01eb-406c-a044-7d99fffd0d55", "Netsu");
host.defineMidiPorts(1, 1);
host.addDeviceNameBasedDiscoveryPair(["Launch Control"], ["Launch Control"]);

//Load LaunchControl constants containing the status for pages and other constant variables
load("launch-control.constants.js");

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
		updatePad(i);
	}

	sendMidi(SideButton.STATUS, SideButton.DOWN, SideButtonColour[buttonMode == ButtonMode.SOLO ? 1 : 0]);
	sendMidi(SideButton.STATUS, SideButton.RIGHT, SideButtonColour[buttonMode == ButtonMode.MUTE ? 1 : 0]);
}

function updatePad(pad)
{
	if (buttonMode == ButtonMode.STOP)
	{
		var state = playbackStates[pad];
		sendMidi(UserPagePads.Page1, ButtonReverseMap[pad], PlaybackStateColour[state]);
	}
	else if (buttonMode == ButtonMode.MUTE)
	{
		sendMidi(UserPagePads.Page1, ButtonReverseMap[pad], MuteColour[muteStates[pad] ? 1 : 0]);
	}
	else if (buttonMode == ButtonMode.SOLO)
	{
		sendMidi(UserPagePads.Page1, ButtonReverseMap[pad], SoloColour[soloStates[pad] ? 1 : 0]);
	}
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
				//println("countObs " + ch + " " + i);
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

			updatePad(ch);
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
		var ch = ButtonMap[data1];
		if (buttonMode == ButtonMode.STOP)
		{
			trackBank.getChannel(ch).stop();
			// hack for groups that don't send stop info to observer
			playbackStates[ch] = PlaybackState.STOPDUE;
			updatePad(ch);
		}
		else if (buttonMode == ButtonMode.MUTE)
		{
			trackBank.getChannel(ch).getMute().toggle();
		}
		else if (buttonMode == ButtonMode.SOLO)
		{
			trackBank.getChannel(ch).getSolo().toggle(false);
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
