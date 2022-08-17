const createMiioHeader = require("../miio/MiioHeader");
const dgram = require("dgram");
const MiioSocket = require("../miio/MiioSocket");


module.exports = async (command, params, options) => {
    let token;
    let paramsForMiio = [];

    if (/^[\da-fA-F]{32}$/.test(options.token)) {
        token = Buffer.from(options.token, "hex");
    } else {
        token = Buffer.from(options.token);
    }

    if (
        (/^[\da-fA-F]{32}$/.test(options.token) && options.token === "ffffffffffffffffffffffffffffffff") ||
        token.length !== 16
    ) {
        console.error(`ERROR: "${options.token}" is not a valid token.`);

        console.log("\n\nExiting..");
        process.exit(-1);
    }

    if (!/^\d+$/.test(options.deviceId)) {
        console.error(`ERROR: "${options.deviceId}" is not a valid deviceId.`);

        console.log("\n\nExiting..");
        process.exit(-1);
    }

    if (params !== undefined) {
        try {
            paramsForMiio = JSON.parse(params);
        } catch (e) {
            console.error(`ERROR: Params "${params}" is not valid json.`);
            console.error("Are you using the powershell?\nIf so, you will need to do \"\"foo\"\" as single double quotes will be stripped :(");

            console.log("\n\nExiting..");
            process.exit(-1);
        }
    }


    const socket = dgram.createSocket("udp4");
    socket.bind();

    const miioSock = new MiioSocket({
        socket: socket,
        token: token,
        deviceId: options.deviceId,
        rinfo: {address: options.address, port: MiioSocket.PORT},
        timeout: 5000,
        name: "local",
        isCloudSocket: false,
    });

    // Handshake before sending any command
    let handshakeDone = false;

    miioSock.onEmptyPacket = () => {
        handshakeDone = true;
    };

    const packet = createMiioHeader();
    socket.send(packet, 0, packet.length, MiioSocket.PORT, options.address);

    let i = 0;
    while (i <= 30) {
        if (handshakeDone === true) {
            break;
        }

        await new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, 100);
        });

        i++;
    }

    if (handshakeDone !== true) {
        console.error("ERROR: Failed to successfully handshake with the robot.");

        console.log("\n\nExiting..");

        process.exit(-1);
    }


    try {
        const res = await miioSock.sendMessage({
            "method": command,
            params: paramsForMiio
        });

        console.log("Response from robot:");
        console.log(res);

        process.exit(0);
    } catch (e) {
        console.error("ERROR: Error while sending command to robot\nError:");
        console.error(e);

        console.log("\n\nExiting..");

        process.exit(-1);
    }
};
