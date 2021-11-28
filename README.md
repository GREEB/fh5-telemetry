
# FH5 Node JS Telemetry
![screenshot2](https://i.imgur.com/rTFYhH3.png)
Simple fh5 Telemetry parser and three.js pointcloud to display data.

This is very simple just to get some height data visualized




## Help / Demo

If you wanna help put this url: `securityb.us:5300` as your data out. Watch live [here](securityb.us) how the cloudmap gets more data added.

## Features

We can get some labed data with the Telemetry from FH5, as we have 

`SurfaceRumble` - Not really sure but how rumbly the surface is? 0 = asphalt/flat or non rumbly i guess

`WheelInPuddle` - As the name sais, used to detect water

`NormSuspensionTravel` - Used to detect if suspesion is fully expended, used to detect if flying

`PositionZ` - As title sais

- Surface
    - Detect Dirt, Water and Asphalt
- Flying
    - Detect if car is flying
- Parse data from FH5 and save it to DB
- Filter data a bit
- Visualize


## Limitations

Nothing will be 100% the data we get is good but we compress it a lot to handle it better.

We only detect surface if all 4 wheels/suspensions are 0/1