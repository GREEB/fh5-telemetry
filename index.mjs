import dotenv from 'dotenv'
dotenv.config()
import throttle from 'lodash.throttle'
import dgram from 'dgram';
import mongoose from 'mongoose'
import logUpdate from 'log-update';
import * as fs from 'fs';

const server = dgram.createSocket('udp4');

// Mongodb Stuff

mongoose.connect(process.env.MONGOURL);
const posSchema = new mongoose.Schema({ x: 'number', y: 'number', z: 'number', surface: 'number' }); // 0=asphalt 1=dirt 2=water
const pos = mongoose.model('Position', posSchema);
posSchema.index({ x: 1, y: 1, z: 1 }, { unique: true });
const infoSchema = new mongoose.Schema({count: 'number', minX: 'number', maxX: 'number', minY: 'number', maxY: 'number', minY: 'number', maxZ: 'number', minZ: 'number'})
const map = mongoose.model('Map', infoSchema);

let lastsavedpos = 0
let lastpos = 0
let maP = { points: 0, x: {}, y: {}, z: {} }

async function getInitInfo() {

    // Look if we have a map
    const count = await pos.count().exec(); map.points = count

    if (count === 0) {
        return;
    }

    const minX = await pos.find({}).sort({ x: 1 }).limit(1).exec(); maP.x.min = minX[0].x
    const maxX = await pos.find({}).sort({ x: -1 }).limit(1).exec(); maP.x.max = maxX[0].x
    const minY = await pos.find({}).sort({ y: 1 }).limit(1).exec(); maP.y.min = minY[0].y
    const maxY = await pos.find({}).sort({ y: -1 }).limit(1).exec(); maP.y.max = maxY[0].y
    const minZ = await pos.find({}).sort({ z: 1 }).limit(1).exec(); maP.z.min = minZ[0].z
    const maxZ = await pos.find({}).sort({ z: -1 }).limit(1).exec(); maP.z.max = maxZ[0].z
    const mapCount = await map.count().exec()
    if (mapCount == 0){
        const newmap = new map({
            count: count,
            minX: maP.x.min,
            maxX: maP.x.max,
            minY: maP.y.min,
            maxY: maP.y.max,
            minZ: maP.z.min,
            maxZ: maP.z.max
        })
        newmap.save(function (err) {
            if (err) console.log(err);
        });
    
    }else{
        const mapUpdate = await map.findOne();

        // Delete the document so Mongoose won't be able to save changes
        
        mapUpdate.minX = maP.x.min
        mapUpdate.maxX = maP.x.max
        mapUpdate.minY = maP.y.min
        mapUpdate.maxY = maP.y.max
        mapUpdate.minZ = maP.z.min
        mapUpdate.maxZ = maP.z.max
        await mapUpdate.save();
    }

}

getInitInfo();


// TODO: log by moving speed or distnace
const throttledwrite = throttle(function (x, y, z, surface, flying) {
    if (flying === 0) { return }
    if (x == 0 && y == 0 && z == 0){ return }
    if (lastpos === x + y + z) {
        logUpdate(`Last pos was same, stop logging`)
    } else {
        lastpos = x + y + z
        const newpos = new pos({ x: x, y: y, z: z, surface: surface });
        newpos.save(function (err) {
            if (err) console.log('duplicate dont send');
            lastsavedpos = `New Position saved x:${x} y:${y} z:${z} surface: ${surface}`

        });
    }
}, 500);

server.on('message', (msg) => {
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

    throttledwrite(x, y, z, surface, flying)

    // logUpdate(`
    // Data xyz/FL,FR,BL,BR

    // Surface: ${surface}
    // Posistion: ${x} ${y} ${z}
    // WheelsOnGround: ${nstFL} ${nstFR} ${nstRL} ${nstRR}
    // WheelsOndirt: ${srFL} ${srFR} ${srRL} ${srRR}
    // Lastsavedpos: ${lastsavedpos}

    // Flying: ${flying}

    // `);

});


    // FIXME: Delete this add redis cache to server
let lastwrite = 0
setInterval(() => {
    pos.find({}, function(err, result) {
        if (err) {
          console.log(err);
        } else {
            let list = ``
            let count = 0
            result.forEach(e => {
                count++
                list += `${e.x} ${e.y} ${e.z} ${e.surface}\n`
            });
            if (count === lastwrite){
                logUpdate('nothing changed');
                return;
            }
            fs.writeFile('./public/pos.txt', list, (err) => {
                if (err) throw err;
                logUpdate('Pos saved!: ' + count);
                lastwrite = count
                count = 0
            });
        }
      });
}, 2500);


server.on('error', (err) => {
    logUpdate(`server error:\n${err.stack}`);
    server.close();
});

server.on('listening', () => {
    const address = server.address();
    logUpdate(`server listening ${address.address}:${address.port}`);
});

server.bind(5300);