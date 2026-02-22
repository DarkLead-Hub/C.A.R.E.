const hre = require("hardhat");

async function main() {
    const MedicalEcosystem = await hre.ethers.getContractFactory("MedicalEcosystem");
    // Get the deployed contract address from the deployment.json which we know is 0xAF0755e67CA968c39Cb41eaf09fa9DDFAb2EFc63
    const contract = MedicalEcosystem.attach("0xAF0755e67CA968c39Cb41eaf09fa9DDFAb2EFc63");

    const count = await contract.getRecordCount();
    console.log(`Total Records: ${count.toString()}`);

    if (count > 0) {
        // Get the latest record
        const record = await contract.getRecord(count - 1n);
        console.log("Latest Record:");
        console.log(` - stealthRef: ${record.stealthRef}`);
        console.log(` - ipfsCid:    ${record.ipfsCid}`);
        console.log(` - issuer:     ${record.issuer}`);
        console.log(` - category:   ${record.category}`); // 0 is REGISTRATION
        console.log(` - timestamp:  ${new Date(Number(record.timestamp) * 1000).toISOString()}`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
