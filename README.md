Novation Launch Control Bitwig Script
=====================================

This Bitwig Studio controller script is very simple and does just a few things:
- The eight columns on the controller correspond to the first eight tracks in
  the project. If the track is a group, then both the group and all it's
  children are controlled by this one column.
- In 'User Mode 1' the knobs control the first two remote controls of the first device on each track.
- In 'User Mode 2' the knobs control the first two sends of each track.
- The pads indicate the state of the clip launcher for the track:
    + bright green means a clip is queued
    + dark green means it is playing
    + yellow means it is queued for stop
    + no colour means all clips are stopped
- Press the pad to stop clips on the corresponding track.
- While holding the LEFT directional button you can use the pads to solo tracks.
- While holding the RIGHT button you can use them to mute tracks.
- The UP and DOWN buttons control tempo.

The script needs the Launch Control to be in 'User 1' or 'User 2' mode.
