require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: "0.8.24",
    networks: {
        ganache: {
            url: "http://127.0.0.1:7545",
            accounts: [
                "0x563ca3fda0858c287af4bbb7e25875883a8aed344e36cbc9c7e4e84316b7abfa", // Hospital
                "0x262901570ab908778930303571cc42f4f0b21d7e708fcc102a9fe677b73a05bb", // Doctor
                "0x64f3d0f06c6d8361633c86cd6e9d4bc4960274ac89162d30e14091eab397262d", // Nurse
                "0x35e5fb375531b76e3e4797ce18904c850e165d99bc92a590b0b207108789629d", // Receptionist
                "0xb7704b041864983a1ba91bb91cd2c487ac9a53dd188b467a477656037b5d9c8b", // Patient 1
                "0x5273e0645bc4ea1de5d5317224ddbd9242e559656d50528808a13ff065410908", // Patient 2
            ],
        },
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts",
    },
};
