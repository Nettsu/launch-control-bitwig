var LOWEST_CC = 21;
var HIGHEST_CC = 48;

var NUM_TRACKS = 8;
var NUM_SENDS = 2;
var NUM_SCENES = 32;
var MAX_CHILD_TRACKS = 16;

var Colour = // Novation are from the UK
{
   OFF:12,
   RED_LOW:13,
   RED_FULL:15,
   AMBER_LOW:29,
   AMBER_FULL:63,
   YELLOW_FULL:62,
   YELLOW_LOW: 0x2D,
   ORANGE:39,
   LIME:0x3D,
   GREEN_LOW:28,
   GREEN_FULL:60,
   RED_FLASHING:11,
   AMBER_FLASHING:59,
   YELLOW_FLASHING:58,
   GREEN_FLASHING:56
};

var PlaybackState =
{
	QUEUED:0,
	STOPQUEUED:1,
	STOPPED:2,
	PLAYING:3,
};

var SideButton =
{
   STATUS:176,
   UP:114,
   DOWN:115,
   LEFT:116,
   RIGHT:117,
};

var ButtonMode =
{
	STOP:0,
	SOLO:1,
	MUTE:2,
	USER:3,
};

var ButtonMap =
{
	'9' :0,
	'10':1,
	'11':2,
	'12':3,
	'25':4,
	'26':5,
	'27':6,
	'28':7
};

var ButtonReverseMap =
{
	'0':9,
	'1':10,
	'2':11,
	'3':12,
	'4':25,
	'5':26,
	'6':27,
	'7':28
};

var UserPageKnobs =
{
	Page1:176,
	Page2:177,
	Page3:178,
	Page4:179,
	Page5:180,
	Page6:181,
	Page7:182,
	Page8:183
};

var FactoryPageKnobs =
{
	Page1:184,
	Page2:185,
	Page3:186,
	Page4:187,
	Page5:188,
	Page6:189,
	Page7:190,
	Page8:191
};

var UserPagePads =
{
	Page1:144,
	Page2:145,
	Page3:146,
	Page4:147,
	Page5:148,
	Page6:149,
	Page7:150,
	Page8:151
};

var FactoryPagePads =
{
	Page1:152,
	Page2:153,
	Page3:154,
	Page4:155,
	Page5:156,
	Page6:157,
	Page7:158,
	Page8:159
};

var LED =
{
   GRID:0,
   CURSORS:1,

   CURSOR_UP:0,
   CURSOR_DOWN:1,
   CURSOR_LEFT:2,
   CURSOR_RIGHT:3,
};
