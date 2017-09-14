loadAPI(2);

host.defineController("Novation", "Launch Control", "1.0", "e84caa2f-01eb-406c-a044-7d99fffd0d55", "Netsu");
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

var deviceCursors			= [];
var controlPageCursors 		= [];
var childTracks 			= [];
var childTrackCount 		= [];
var childDeviceCursors		= [];
var childControlPageCursors	= [];

function init()
{
	// Setup MIDI in stuff
	host.getMidiInPort(0).setMidiCallback(onMidi);

	// create a trackbank (arguments are tracks, sends, scenes)
	trackBank = host.createMasterTrack(0).createSiblingsTrackBank(NUM_TRACKS, NUM_SENDS, NUM_SCENES, false, false);
	transport = host.createTransport();

	var slotBanks = [];

	for (var i = 0; i < NUM_TRACKS; i++)
	{
		// create main device cursor for the track
		//deviceCursors[i] = trackBank.getTrack(i).getPrimaryDevice();
		deviceCursors[i] = trackBank.getChannel(i).createDeviceBank(1);
		controlPageCursors[i] = deviceCursors[i].getDevice(0).createCursorRemoteControlsPage(2);

		childTracks[i] = trackBank.getChannel(i).createTrackBank(MAX_CHILD_TRACKS, 0, 0, false);
		childTracks[i].addChannelCountObserver(childrenCountObserver(i));

		// create child track cursors for the track, one for each potential child
		var childDeviceCursorsArray = [];
		var childControlPageCursorsArray = [];
		for (var j = 0; j < MAX_CHILD_TRACKS; j++)
		{
			childDeviceCursorsArray[j] = childTracks[i].getChannel(j).createDeviceBank(1);
			//childDeviceCursorsArray[j] = childTracks[i].getChannel(j).createCursorDevice("LaunchControl track " + i + ":" + j);
			childControlPageCursorsArray[j] = childDeviceCursorsArray[j].getDevice(0).createCursorRemoteControlsPage(2);
		}
		childDeviceCursors[i] = childDeviceCursorsArray;
		childControlPageCursors[i] = childControlPageCursorsArray;

		slotBanks[i] = trackBank.getChannel(i).getClipLauncherSlots();
		slotBanks[i].addPlaybackStateObserver(playbackObserver(i));

		trackBank.getChannel(i).getMute().addValueObserver(muteObserver(i));
		trackBank.getChannel(i).getSolo().addValueObserver(soloObserver(i));
	}
}

function updatePads()
{
    for (var i = 0; i < 8; i++)
    {
		updatePad(i);
	}

	sendMidi(SideButton.STATUS, SideButton.LEFT, SideButtonColour[buttonMode == ButtonMode.SOLO ? 1 : 0]);
	sendMidi(SideButton.STATUS, SideButton.RIGHT, SideButtonColour[buttonMode == ButtonMode.MUTE ? 1 : 0]);
}

function updatePad(pad)
{
	//println(pad);
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
    var ch = channel;
    return function (mute)
		{
			muteStates[ch] = mute;
			if (buttonMode == ButtonMode.MUTE)
			{
				//println(mute);
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
	// Hold buttons for mute or solo mode, release to go back to stop mode
	if (data1 == SideButton.RIGHT)
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
	else if (data1 == SideButton.LEFT)
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
	else if (data1 == SideButton.UP)
	{
		if (data2 == 127)
		{
			transport.getTempo().incRaw(1);
		}
	}
	else if (data1 == SideButton.DOWN)
	{
		if (data2 == 127)
		{
			transport.getTempo().incRaw(-1);
		}
	}
}

function onMidi(status, data1, data2)
{
	//printMidi(status, data1, data2);
	//println(MIDIChannel(status));

	if (status == SideButton.STATUS)
	{
		processSideButtons(status, data1, data2);
	}

	// pads function is mode dependent
	if (status == UserPagePads.Page1 || status == UserPagePads.Page2)
    {
		var ch = ButtonMap[data1];
		if (buttonMode == ButtonMode.STOP)
		{
			trackBank.getChannel(ch).stop();
			// hack for groups that don't send stop info to observer
			if (playbackStates[ch] == PlaybackState.PLAYING)
			{
				playbackStates[ch] = PlaybackState.STOPDUE;
				updatePad(ch);
			}
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

		//println(childTrackCount[channelIdx]);

		deviceCursors[channelIdx].scrollTo(0);
		controlPageCursors[channelIdx].getParameter(macro).set(data2, 128);
		for (var i = 0; i < childTrackCount[channelIdx]; i++)
		{
			childDeviceCursors[channelIdx][i].scrollTo(0);
			childControlPageCursors[channelIdx][i].getParameter(macro).set(data2, 128);
		}
	}
	// Page two control first two sends
	if (status == UserPageKnobs.Page2 && KnobMap[data1] >= 0 && KnobMap[data1] <= 15)
	{
		var channelIdx = KnobMap[data1] % 8;
		var send = KnobMap[data1] / 8;

		trackBank.getChannel(channelIdx).sendBank().getItemAt(send).set(data2, 128);
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
