const discoveryCommand = require("./commands/discovery");
const rawCommandCommand = require("./commands/raw-command");
const Tools = require("./utils/Tools");
const { Command } = require("commander");

const version = `${Tools.GET_VERSION()} (${Tools.GET_COMMIT_ID()})`;


const program = new Command();

program
    .name("valetudo-helper-miio")
    .description("Miio toolbox")
    .version(version);


program.command("discover")
    .description("Discovers robots on your local network")
    .action(() => {
        discoveryCommand();
    });

program.command("raw-command")
    .description("Execute a raw miio command")
    .argument("<command>", "miio command")
    .argument("[params]", "command parameters")
    .requiredOption("-d, --deviceId <1234567>", "DeviceId of the unprovisioned robot")
    .requiredOption("-t, --token <XXX>", "16-Byte Token of the robot")
    .requiredOption("-a, --address <192.168.8.1>", "address of the robot")
    .action((command, params, options) => {
        rawCommandCommand(command, params, options).catch(err => {
            console.error("Error during execution of raw-command command", err);
            process.exit(-1);
        });
    });



program.parse();
