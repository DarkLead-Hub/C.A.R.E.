const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const wallets = JSON.parse(
        fs.readFileSync(path.join(__dirname, "../config/wallets.json"), "utf8")
    );

    console.log("🏥 Deploying MedicalEcosystem contract...");
    console.log(`   Network: ${hre.network.name}`);
    console.log(`   Hospital Admin: ${wallets.roles.hospital.address}`);

    // Deploy contract (msg.sender = first account = hospital admin)
    const MedicalEcosystem = await hre.ethers.getContractFactory("MedicalEcosystem");
    const contract = await MedicalEcosystem.deploy();
    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    console.log(`✅ MedicalEcosystem deployed at: ${contractAddress}`);

    // Assign roles
    const roleEntries = [
        { key: "doctor", roleId: 2 },
        { key: "nurse", roleId: 3 },
        { key: "receptionist", roleId: 4 },
        { key: "patient1", roleId: 5 },
        { key: "patient2", roleId: 5 },
    ];

    for (const entry of roleEntries) {
        const addr = wallets.roles[entry.key].address;
        const roleName = wallets.roles[entry.key].role;
        const tx = await contract.assignRole(addr, entry.roleId);
        await tx.wait();
        console.log(`   ✅ ${roleName} role assigned to ${addr}`);
    }

    // Verify all roles
    console.log("\n📋 Role Verification:");
    const roleNames = ["NONE", "HOSPITAL_ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST", "PATIENT"];
    for (const [key, info] of Object.entries(wallets.roles)) {
        const role = await contract.getRole(info.address);
        console.log(`   ${key}: ${info.address} → ${roleNames[Number(role)]}`);
    }

    // Save deployment info
    const deploymentInfo = {
        contractAddress,
        network: hre.network.name,
        deployer: wallets.roles.hospital.address,
        deployedAt: new Date().toISOString(),
        roles: {},
    };

    for (const [key, info] of Object.entries(wallets.roles)) {
        deploymentInfo.roles[key] = { address: info.address, role: info.role };
    }

    const deploymentPath = path.join(__dirname, "../config/deployment.json");
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\n📄 Deployment info saved to: ${deploymentPath}`);

    // Copy ABI
    const artifactPath = path.join(__dirname, "../artifacts/contracts/MedicalEcosystem.sol/MedicalEcosystem.json");
    if (fs.existsSync(artifactPath)) {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
        const abiPath = path.join(__dirname, "../config/abi.json");
        fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
        console.log(`📄 ABI saved to: ${abiPath}`);
    }

    console.log("\n🎉 Deployment complete!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
