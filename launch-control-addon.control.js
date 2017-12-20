loadAPI(2);

host.defineController("Novation", "Launch Control (as add-on)", "1.0", "e84caa2f-01eb-406c-a044-7d99fffd0d55", "Netsu");
host.defineMidiPorts(1, 1);
host.addDeviceNameBasedDiscoveryPair(["Launch Control"], ["Launch Control"]);

//Load LaunchControl constants containing the status for pages and other constant variables
load("launch-control-addon.constants.js");

var buttonMode = ButtonMode.STOP;

var clipHasContent = 
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

var isTakenOver =
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

function init()
{
	// Setup MIDI in stuff
	host.getMidiInPort(0).setMidiCallback(onMidi);

	// create a trackbank (arguments are tracks, sends, scenes)
	trackBank = host.createMasterTrack(0).createSiblingsTrackBank(NUM_TRACKS, NUM_SENDS, NUM_SCENES, false, false);
	transport = host.createTransport();

	slotBanks = [];

	for (var i = 0; i < NUM_TRACKS; i++)
	{
		slotBanks[i] = trackBank.getChannel(i).getClipLauncherSlots();
		trackBank.getChannel(i).sendBank().getItemAt(0).setIndication(true);
		trackBank.getChannel(i).sendBank().getItemAt(0).markInterested();
		slotBanks[i].addPlaybackStateObserver(playbackObserver(i));
		slotBanks[i].addHasContentObserver(hasContentObserver(i));
		slotBanks[i].setIndication(true);
	}
	
	updatePads();
}

var hasContentObserver = function(channel)
{
    var ch = channel;
    return function (index, hasContent)
		{
			//println(hasContent);
			clipHasContent[ch] = hasContent;
			updatePad(ch);
		}
};

function updatePads()
{
    for (var i = 0; i < 8; i++)
    {
		updatePad(i);
	}
}

function updatePad(pad)
{
	var hasContent = clipHasContent[pad];
	var state = playbackStates[pad];
	
	if (hasContent == false)
	{
		sendMidi(UserPagePads.Page1, ButtonReverseMap[pad], Colour.OFF);
		sendMidi(UserPagePads.Page2, ButtonReverseMap[pad], Colour.OFF);
	}
	else
	{
		sendMidi(UserPagePads.Page1, ButtonReverseMap[pad], PlaybackStateColour[state]);
		sendMidi(UserPagePads.Page2, ButtonReverseMap[pad], PlaybackStateColour[state]);
	}
}

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

function resetTakenOverFlags()
{
	for (i = 0; i < 8; i++)
		isTakenOver[i] = false;
}

function processSideButtons(status, data1, data2)
{
	// Hold buttons for mute or solo mode, release to go back to stop mode
	if (data1 == SideButton.RIGHT)
	{
	}
	else if (data1 == SideButton.LEFT)
	{
	}
	else if (data1 == SideButton.UP)
	{
		if (data2 == 127)
		{
			trackBank.scrollSendsUp();
			resetTakenOverFlags();
			updatePads();
		}
	}
	else if (data1 == SideButton.DOWN)
	{
		if (data2 == 127)
		{
			trackBank.scrollSendsDown();
			resetTakenOverFlags();
			updatePads();
		}
	}
}

function onMidi(status, data1, data2)
{
	//printMidi(status, data1, data2);
	//println(MIDIChannel(status));

	processSideButtons(status, data1, data2);

	// pads launch clips
	if (status == UserPagePads.Page1)
    {
		var ch = ButtonMap[data1];
		slotBanks[ch].launch(0);
	}

	if (status == UserPageKnobs.Page1 && KnobMap[data1] >= 0 && KnobMap[data1] < 8)
	{

	}
	else if (status == UserPageKnobs.Page1 && KnobMap[data1] >= 8 && KnobMap[data1] < 16)
	{
		var channelIdx = KnobMap[data1] % 8;
		if (data2 == 0) data2 = 1;
		
		sendValue = trackBank.getChannel(channelIdx).sendBank().getItemAt(0).get();
		if (Math.abs(data2 - sendValue*127) < 10)
			isTakenOver[channelIdx] = true;
		
		if (isTakenOver[channelIdx])
			trackBank.getChannel(channelIdx).sendBank().getItemAt(0).set(data2, 128);		
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
