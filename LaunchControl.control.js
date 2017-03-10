loadAPI(1);

host.defineController("Novation", "Launch Control", "1.0", "05e2b820-177e-11e4-8c21-0800200c9a66");
host.defineMidiPorts(1, 1);
host.addDeviceNameBasedDiscoveryPair(["Launch Control"], ["Launch Control"]);

//Load LaunchControl constants containing the status for pages and other constant variables
load("LaunchControl_constants.js");
load("LaunchControl_common.js");

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

var childTracks = {};

function init()
{
	// Setup MIDI in stuff
	host.getMidiInPort(0).setMidiCallback(onMidi);
	//noteInput = host.getMidiInPort(0).createNoteInput("Launch Control", "80????", "90????");
	//noteInput.setShouldConsumeEvents(false);

	// create a transport section for on Factory Preset 1
	//transport = host.createTransportSection();

	// create a trackbank (arguments are tracks, sends, scenes)
	trackBank = host.createMasterTrack(0).createSiblingsTrackBank(NUM_TRACKS, NUM_SENDS, NUM_SCENES, false, false);

	/*
	// Make CCs 21-48 freely mappable for all 16 Channels
	userControls = host.createUserControlsSection((HIGHEST_CC - LOWEST_CC + 1)*16);

	for (var i = LOWEST_CC; i <= HIGHEST_CC; i++)
	{
			for (var j = 1; j <= 16; j++)
            {
				 // Create the index variable c
				 var c = i - LOWEST_CC + (j-1) * (HIGHEST_CC-LOWEST_CC+1);
				 // Set a label/name for each userControl
				 userControls.getControl(c).setLabel("CC " + i + " - Channel " + j);
			}
	}
	*/

	var slotBanks = {};

	for (var i = 0; i < NUM_TRACKS; i++)
	{
		childTracks[i] = trackBank.getChannel(i).createTrackBank(MAX_CHILD_TRACKS, 0, 0, false, false);
		slotBanks[i] = trackBank.getChannel(i).getClipLauncherSlots();
		slotBanks[i].addPlaybackStateObserver(playbackObserver(i));
		trackBank.getChannel(i).getMute().addValueObserver(muteObserver(i));
		trackBank.getChannel(i).getSolo().addValueObserver(soloObserver(i));
	}
}

function updatePads()
{
    for(var i = 0; i < 8; i++)
    {
		if (buttonMode == ButtonMode.STOP)
		{
			var state = playbackStates[i];
			sendMidi(UserPagePads.Page1, ButtonReverseMap[i], PlaybackStateColour[state]);
		}
		else if (buttonMode == ButtonMode.MUTE)
		{
			if (muteStates[i] == true)
				sendMidi(UserPagePads.Page1, ButtonReverseMap[i], Colour.RED_FULL);
			else
				sendMidi(UserPagePads.Page1, ButtonReverseMap[i], Colour.OFF);
		}
		else if (buttonMode == ButtonMode.SOLO)
		{
			if (soloStates[i] == true)
				sendMidi(UserPagePads.Page1, ButtonReverseMap[i], Colour.YELLOW_FULL);
			else
				sendMidi(UserPagePads.Page1, ButtonReverseMap[i], Colour.OFF);
		}
	}

	if (buttonMode == ButtonMode.SOLO)
		sendMidi(SideButton.STATUS, SideButton.DOWN, Colour.RED_FULL);
	else
		sendMidi(SideButton.STATUS, SideButton.DOWN, Colour.OFF);

	if (buttonMode == ButtonMode.MUTE)
		sendMidi(SideButton.STATUS, SideButton.RIGHT, Colour.RED_FULL);
	else
		sendMidi(SideButton.STATUS, SideButton.RIGHT, Colour.OFF);

	if (buttonMode == ButtonMode.USER)
		sendMidi(SideButton.STATUS, SideButton.LEFT, Colour.RED_FULL);
	else
		sendMidi(SideButton.STATUS, SideButton.LEFT, Colour.OFF);
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
				playbackStates[ch] = PlaybackState.STOPQUEUED;
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
				sendMidi(UserPagePads.Page1, ButtonReverseMap[ch], PlaybackStateColour[state]);
		}
};

var muteObserver = function(channel)
{
	println
    var ch = channel;
    return function (mute)
		{
			if (mute)
			{
				muteStates[ch] = true;
				if (buttonMode == ButtonMode.MUTE)
					sendMidi(UserPagePads.Page1, ButtonReverseMap[ch], Colour.RED_FULL);
			}
			else
			{

				muteStates[ch] = false;
				if (buttonMode == ButtonMode.MUTE)
					sendMidi(UserPagePads.Page1, ButtonReverseMap[ch], Colour.OFF);
			}
		}
};

var soloObserver = function(channel)
{
    var ch = channel;
    return function (solo)
		{
			if (solo)
			{
				soloStates[ch] = true;
				if (buttonMode == ButtonMode.SOLO)
					sendMidi(UserPagePads.Page1, ButtonReverseMap[ch], Colour.YELLOW_FULL);
			}
			else
			{
				soloStates[ch] = false;
				if (buttonMode == ButtonMode.SOLO)
					sendMidi(UserPagePads.Page1, ButtonReverseMap[ch], Colour.OFF);
			}
		}
};

function processSideButtons(status, data1, data2)
{
	// User Preset 1, side buttons change mode
	// Hold buttons for mute or solo mode, release to go back to stop mode
	/*if (status == SideButton.STATUS && data1 == SideButton.UP)
	{
		//println("stop mode\n");
		buttonMode = ButtonMode.STOP;
		sendMidi(status, data1, Colour.RED_FULL);
		updatePads();
	}
	else*/ if (status == SideButton.STATUS && data1 == SideButton.RIGHT)
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
	/*else if (status == SideButton.STATUS && data1 == SideButton.LEFT)
	{
		//println("user mode\n");
		if (data2 == 127)
		{
			buttonMode = ButtonMode.USER;
		}
		else if (data2 == 0 && buttonMode == ButtonMode.USER)
		{
			buttonMode = ButtonMode.STOP;
		}
		updatePads();
	}*/
}

function onMidi(status, data1, data2)
{

	printMidi(status, data1, data2);
	println(MIDIChannel(status));

	/*
	// make Pads green when pressed in user mode
	if (data1 >= 9 && data1 <= 28 && data2 == 127 && buttonMode == ButtonMode.USER)
	{
		sendMidi(status, data1, Colour.GREEN_FULL);
	}
	else if (data1 >= 9 && data1 <= 28 && data2 == 0 && buttonMode == ButtonMode.USER)
	{
		sendMidi(status, data1, Colour.OFF);
	}*/

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
	if (status == UserPageKnobs.Page1)
	{
		if (data1 >= 21 && data1 <= 28)
		{
			var channelIdx = data1 - 21;
			var macro = 0;
		}
		else if (data1 >= 41 && data1 <= 48)
		{
			var channelIdx = data1 - 41;
			var macro = 1;
		}

		trackBank.getChannel(channelIdx).getPrimaryDevice().getMacro(macro).getAmount().set(data2, 128);
		for (var i = 0; i <= MAX_CHILD_TRACKS; i++)
		{
			childTracks[channelIdx].getChannel(i).getPrimaryDevice().getMacro(macro).getAmount().set(data2, 128);
		}
	}

    /*
	// Factory Preset 1 = Setup knobs to control Macros and Parameters
	if (status == FactoryPageKnobs.Page1)
	{
		if (data1 >= 21 && data1 <= 28)
		{
			var knobIndexTop = data1 - 21;
			primaryDevice.getParameter(knobIndexTop).set(data2, 128);
		}
		else if (data1 >= 41 && data1 <= 48)
		{
			var knobIndexBottom = data1 - 41;
			primaryDevice.getMacro(knobIndexBottom).getAmount().set(data2, 128);
		}
	}

	// If not on a Factory Bank already assigned then make the knobs assignable
	if (isChannelController(status))
	{
		if (data2 != 127 && data1 >= LOWEST_CC && data1 <= HIGHEST_CC)
		{
			var index = data1 - LOWEST_CC + (HIGHEST_CC * MIDIChannel(status));
			userControls.getControl(index).set(data2, 128);
		}

   }*/
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
