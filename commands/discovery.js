const Codec = require("../miio/Codec");
const dgram = require("dgram");
const Tools = require("../utils/Tools");

const HELO = Buffer.from("21310020ffffffffffffffffffffffffffffffffffffffffffffffffffffffff", "hex");


module.exports = () => {
    const discoveredInstances = [];
    console.log("Starting discovery for 5s...");

    const broadcastAddresses = Tools.GET_NETWORK_INTERFACES().filter(i => {
        return i.family === "IPv4";
    }).map(i => {
        //Adapted from https://github.com/aal89/broadcast-address
        var addr_splitted = i.address.split(".");
        var netmask_splitted = i.netmask.split(".");

        // bitwise OR over the splitted NAND netmask, then glue them back together with a dot character to form an ip
        // we have to do a NAND operation because of the 2-complements; getting rid of all the 'prepended' 1's with & 0xFF
        return addr_splitted.map((e, i) => {
            return (~netmask_splitted[i] & 0xFF) | e;
        }).join(".");
    });

    const socket = dgram.createSocket("udp4");
    socket.bind();

    socket.on("listening", () => {
        socket.setBroadcast(true); //required for linux

        broadcastAddresses.forEach(addr => {
            socket.send(HELO, 54321, addr);
        });

        setTimeout(() => {
            broadcastAddresses.forEach(addr => {
                socket.send(HELO, 54321, addr);
            });
        }, 1000);

        setTimeout(() => {
            broadcastAddresses.forEach(addr => {
                socket.send(HELO, 54321, addr);
            });
        }, 3000);

    });

    socket.on("message", (incomingMsg, rinfo) => {
        const codec = new Codec({token: Buffer.from("ffffffffffffffffffffffffffffffff")});
        let decoded;

        try {
            decoded = codec.decodeIncomingMiioPacket(incomingMsg);
        } catch (e) {
            console.error("Error while decoding discovery response", {
                err: e,
                rinfo: rinfo,
                incomingMsg: incomingMsg
            });

            return;
        }

        if (!discoveredInstances.find(i => {
            return i.deviceId === decoded.deviceId;
        })) {
            discoveredInstances.push({
                deviceId: decoded.deviceId,
                token: decoded.token,
                address: rinfo.address
            });

            console.log(`Discovered ${discoveredInstances.length} robots...`);
        }
    });


    setTimeout(() => {
        console.log(`Scan done. Found ${discoveredInstances.length} robots:\n`);

        discoveredInstances.forEach(instance => {
            const stringToken = instance.token.toString("hex");

            if (stringToken !== "ffffffffffffffffffffffffffffffff") {
                console.log([
                    "\tUnprovisioned robot",
                    `\t\tDeviceId: ${instance.deviceId}`,
                    `\t\tIP: ${instance.address}`,
                    `\t\tToken: ${stringToken}`,
                    ""
                ].join("\n"));
            } else {
                console.log([
                    "\tProvisioned robot",
                    `\t\tDeviceId: ${instance.deviceId}`,
                    `\t\tIP: ${instance.address}`,
                    ""
                ].join("\n"));
            }
        });


        console.log("Exiting..");
        socket.close();

        process.exit(0);
    }, 5000);
};
