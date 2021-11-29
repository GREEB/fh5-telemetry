import dotenv from 'dotenv'
dotenv.config()
import throttle from 'lodash.throttle'
import dgram from 'dgram';
import mongoose from 'mongoose'
import * as fs from 'fs';
import path from 'path';
import express from 'express';
import http from 'http'
import https from 'https'

const __dirname = path.resolve()

// Servers 8080 and 5300
const webServer = express();
const udpServer = dgram.createSocket('udp4');

// Mongodb Stuff
mongoose.connect(process.env.MONGOURL);
const posSchema = new mongoose.Schema({
    x: 'number',
    y: 'number',
    z: 'number',
    surface: 'number'
}); // 0=asphalt 1=dirt 2=water
const pos = mongoose.model('Position', posSchema);
posSchema.index({
    x: 1,
    y: 1,
    z: 1
}, {
    unique: true
});
const infoSchema = new mongoose.Schema({
    count: 'number',
    minX: 'number',
    maxX: 'number',
    minY: 'number',
    maxY: 'number',
    minY: 'number',
    maxZ: 'number',
    minZ: 'number'
})
const map = mongoose.model('Map', infoSchema);

let lastSavedPos = 0
let maP = {
    points: 0,
    x: {},
    y: {},
    z: {}
}

async function getInitInfo() {
    // Look if we have any points
    const count = await pos.count().exec();
    map.points = count
    if (count === 0) {
        return;
    }

    // If we do have points find MIN MAX
    const minX = await pos.find({}).sort({
        x: 1
    }).limit(1).exec();
    maP.x.min = minX[0].x
    const maxX = await pos.find({}).sort({
        x: -1
    }).limit(1).exec();
    maP.x.max = maxX[0].x
    const minY = await pos.find({}).sort({
        y: 1
    }).limit(1).exec();
    maP.y.min = minY[0].y
    const maxY = await pos.find({}).sort({
        y: -1
    }).limit(1).exec();
    maP.y.max = maxY[0].y
    const minZ = await pos.find({}).sort({
        z: 1
    }).limit(1).exec();
    maP.z.min = minZ[0].z
    const maxZ = await pos.find({}).sort({
        z: -1
    }).limit(1).exec();
    maP.z.max = maxZ[0].z

    // Look if we have a map
    const mapCount = await map.count().exec()

    // If no Map create and save one
    if (mapCount == 0) {
        const newMap = new map({
            count: count,
            minX: maP.x.min,
            maxX: maP.x.max,
            minY: maP.y.min,
            maxY: maP.y.max,
            minZ: maP.z.min,
            maxZ: maP.z.max
        })
        newMap.save(function (err) {
            if (err) console.log(err);
        }); // FIXME: Throws errors on duplicates.
    } else {
        // If we have a map update it
        const mapUpdate = await map.findOne();
        mapUpdate.minX = maP.x.min;
        mapUpdate.maxX = maP.x.max;
        mapUpdate.minY = maP.y.min;
        mapUpdate.maxY = maP.y.max;
        mapUpdate.minZ = maP.z.min;
        mapUpdate.maxZ = maP.z.max;
        await mapUpdate.save();
    }
}

getInitInfo();

// TODO: log by moving speed or distnace
const throttledWrite = throttle(function (x, y, z, surface, flying) {
    if (flying === 0) return // Abort if flying
    if (x == 0 && y == 0 && z == 0) return // Abort if 000 chord
    const newPos = new pos({
        x: x,
        y: y,
        z: z,
        surface: surface
    });
    newPos.save(function (err) {
        if (err) console.log('duplicate dont send');
        lastSavedPos = `New Position saved x:${x} y:${y} z:${z} surface: ${surface}`

    });
}, 500);

udpServer.on('message', (msg) => {
    let flying = 1;
    let surface = 0
    // Road edgde detection build in?  WheelOnRumbleStripFl(this byte[] bytes) { return GetSingle(bytes, 116)

    // Get Dirt tele to see if not on real road
    // SurfaceRumbleRr(this byte[] bytes) { return GetSingle(bytes, 160)
    let srFL = parseFloat(msg.readFloatLE(148))
    let srFR = parseFloat(msg.readFloatLE(152))
    let srRL = parseFloat(msg.readFloatLE(156))
    let srRR = parseFloat(msg.readFloatLE(160))


    // If all 4 Wheels are in a puddle add as water point
    // public static float WheelInPuddleRr(this byte[] bytes) { return GetSingle(bytes, 144)
    let wipFL = parseInt(msg.readFloatLE(132))
    let wipFR = parseInt(msg.readFloatLE(136))
    let wipRL = parseInt(msg.readFloatLE(140))
    let wipRR = parseInt(msg.readFloatLE(144))

    // Get suspension to check if wheel in the air?
    // public static float NormSuspensionTravelRr(this byte[] bytes) { return GetSingle(bytes, 80)
    let nstFL = parseFloat(msg.readFloatLE(68)).toFixed(1)
    let nstFR = parseFloat(msg.readFloatLE(72)).toFixed(1)
    let nstRL = parseFloat(msg.readFloatLE(76)).toFixed(1)
    let nstRR = parseFloat(msg.readFloatLE(80)).toFixed(1)

    // Car XYZ
    // public static float PositionZ(this byte[] bytes) { return GetSingle(bytes, 240 + BufferOffset)
    let x = parseFloat(msg.readFloatLE(232 + 12)).toFixed(1)
    let y = parseFloat(msg.readFloatLE(236 + 12)).toFixed(1)
    let z = parseFloat(msg.readFloatLE(240 + 12)).toFixed(1)


    flying = nstFL + nstFR + nstRL + nstRR

    if (wipFL + wipFR + wipRL + wipRR == 4) {
        surface = 2
    } else if (srFL !== 0 && srFR !== 0 && srRL !== 0 && srRR) { // FIXME: Flickers to 0 this is probably how it should work
        surface = 1
    } else {
        surface = 0
    }

    throttledWrite(x, y, z, surface, flying)

    // console.log(`
    // Data xyz/FL,FR,BL,BR

    // Surface: ${surface}
    // Posistion: ${x} ${y} ${z}
    // WheelsOnGround: ${nstFL} ${nstFR} ${nstRL} ${nstRR}
    // WheelsOndirt: ${srFL} ${srFR} ${srRL} ${srRR}
    // lastSavedPos: ${lastSavedPos}

    // Flying: ${flying}

    // `);

});


// FIXME: Delete this add redis cache to udpServer
let lastWrite = 0
setInterval(() => {
    pos.find({}, function (err, result) {
        if (err) {
            console.log(err);
        } else {
            let list = ``
            let count = 0
            result.forEach(e => {
                count++
                list += `${e.x} ${e.y} ${e.z} ${e.surface}\n`
            });
            if (count === lastWrite) {
                return;
            }
            fs.writeFile(path.join(__dirname + '/build') + "/pos.txt", list, (err) => {
                if (err) throw err;
                console.log('Pos saved!: ' + count);
                lastWrite = count
                count = 0
            });
        }
    });
}, 2500);

// Listen both http & https ports

if (process.env.PROD === true) {
    const httpsServer = https.createServer({
        key: fs.readFileSync('/etc/letsencrypt/live/' + process.env.URL + '/privkey.pem'),
        cert: fs.readFileSync('/etc/letsencrypt/live/' + process.env.URL + '/fullchain.pem'),
    }, webServer);
    httpsServer.listen(process.env.SSLPORT, () => {
        console.log('HTTPS Server running on port ' + process.env.SSLPORT);
    });
}

webServer.use(express.static(path.join(__dirname + '/build')));
const httpServer = http.createServer(webServer);
httpServer.listen(process.env.HTTPPORT, () => {
    console.log('HTTP Server running on port ' + process.env.HTTPPORT);
});




// webServer.listen(8080, () => console.log('WebServer listening on  0.0.0.0:8080'));

// webServer.on('error', (err) => {
//     console.log(`webServer error:\n${err.stack}`);
//     webServer.close();
// });

udpServer.on('error', (err) => {
    console.log(`udpServer error:\n${err.stack}`);
    udpServer.close();
});

udpServer.on('listening', () => {
    const address = udpServer.address();
    console.log(`udpServer listening ${address.address}:${address.port}`);
});

udpServer.bind(5300);