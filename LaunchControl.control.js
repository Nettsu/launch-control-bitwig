loadAPI(1);

host.defineController("Novation", "Launch Control", "1.0", "05e2b820-177e-11e4-8c21-0800200c9a66");
host.defineMidiPorts(1, 1);
host.addDeviceNameBasedDiscoveryPair(["Launch Control"], ["Launch Control"]);

//Load LaunchControl constants containing the status for pages and other constant variables
load("LaunchControl_constants.js");
//load("LaunchControl_common.js");

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

var playbackStateColour = {};

var childTracks = {};
var childTrackCount = {};

function init()
{
	// Setup MIDI in stuff
	host.getMidiInPort(0).setMidiCallback(onMidi);
	//noteInput = host.getMidiInPort(0).createNoteInput("Launch Control", "80????", "90????");
	//noteInput.setShouldConsumeEvents(false);

	// create a trackbank (arguments are tracks, sends, scenes)
	trackBank = host.createMasterTrack(0).createSiblingsTrackBank(NUM_TRACKS, NUM_SENDS, NUM_SCENES, false, false);
	deviceCursor = trackBank.getTrack(0).createCursorDevice("Primary");

	var slotBanks = {};

	playbackStateColour[PlaybackState.STOPPED] = Colour.OFF;
	playbackStateColour[PlaybackState.PLAYING] = Colour.GREEN_LOW;
	playbackStateColour[PlaybackState.STOPQUEUED] = Colour.YELLOW_FULL;
	playbackStateColour[PlaybackState.QUEUED] = Colour.GREEN_FULL;

	for (var i = 0; i < NUM_TRACKS; i++)
	{
		childTracks[i] = trackBank.getTrack(i).createTrackBank(MAX_CHILD_TRACKS, 0, 0, false);
		childTracks[i].addChannelCountObserver(childrenCountObserver(i));

		slotBanks[i] = trackBank.getTrack(i).getClipLauncherSlots();
		slotBanks[i].addPlaybackStateObserver(playbackObserver(i));

		trackBank.getTrack(i).getMute().addValueObserver(muteObserver(i));
		trackBank.getTrack(i).getSolo().addValueObserver(soloObserver(i));
	}
}

function updatePads()
{
    for(var i = 0; i < 8; i++)
    {
		if (buttonMode == ButtonMode.STOP)
		{
			var state = playbackStates[i];
			sendMidi(UserPagePads.Page1, ButtonReverseMap[i], playbackStateColour[state]);
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

var childrenCountObserver = function(channel)
{
    var ch = channel;
    return function (count)
		{
			childTrackCount[ch] = count;
			//println(ch + ", children: " + count);
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
				sendMidi(UserPagePads.Page1, ButtonReverseMap[ch], playbackStateColour[state]);
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
	if (status == UserPageKnobs.Page1)
	{
		if (data1 >= 21 && data1 <= 28)
		{
			//println("upper knob");
			var channelIdx = data1 - 21;
			var macro = 0;
		}
		else if (data1 >= 41 && data1 <= 48)
		{
			//println("lower knob");
			var channelIdx = data1 - 41;
			var macro = 1;
		}

		deviceCursor.selectFirstInChannel(trackBank.getChannel(channelIdx));
		deviceCursor.getMacro(macro).getAmount().set(data2, 128);

		for (var i = 0; i < childTrackCount[channelIdx]; i++)
		{
			var child_channel = childTracks[channelIdx].getChannel(i);
			deviceCursor.selectFirstInChannel(child_channel);
			deviceCursor.getMacro(macro).getAmount().set(data2, 128);
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
