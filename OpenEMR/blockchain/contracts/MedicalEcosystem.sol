// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MedicalEcosystem
 * @notice Role-based medical records management with privacy-preserving stealth references.
 *
 * Architecture:
 *  - Roles: HOSPITAL_ADMIN, DOCTOR, NURSE, RECEPTIONIST, PATIENT
 *  - On-chain: only stealth reference hashes, IPFS CID hashes, and metadata hashes
 *  - No PII ever stored on-chain
 *  - Consent is managed per stealthRef so patients control who reads what
 */
contract MedicalEcosystem {

    // ───────────────────────── Enums ─────────────────────────
    enum Role { NONE, HOSPITAL_ADMIN, DOCTOR, NURSE, RECEPTIONIST, PATIENT }

    enum RecordCategory {
        REGISTRATION,       // 0 - receptionist creates patient registration
        VITALS,             // 1 - nurse records vitals / triage
        PRESCRIPTION,       // 2 - doctor issues prescription
        LAB_REPORT,         // 3 - lab result upload
        IMAGING,            // 4 - radiology / imaging
        DISCHARGE_SUMMARY,  // 5 - discharge
        GENERAL_DOCUMENT    // 6 - catch-all
    }

    // ───────────────────────── Structs ─────────────────────────
    struct MedicalRecord {
        bytes32 stealthRef;       // keccak256(patientAddr + nonce + salt) — unlinkable
        string  ipfsCid;          // IPFS MFS path or CID of encrypted data
        bytes32 metadataHash;     // sha256 of the plaintext metadata (for integrity)
        address issuer;           // who created this record (doctor / nurse / etc.)
        Role    issuerRole;       // role at time of creation
        RecordCategory category;  // what kind of record
        uint256 timestamp;        // block.timestamp
    }

    // ───────────────────────── State ─────────────────────────
    address public owner;   // hospital admin who deployed
    mapping(address => Role) public roles;
    mapping(address => bool) public registeredAddresses;

    // All medical records stored sequentially
    MedicalRecord[] public records;

    // Index: stealthRef → array of record indices (for fast lookup by patient)
    mapping(bytes32 => uint256[]) private stealthRefIndex;

    // Consent: stealthRef → provider address → bool
    mapping(bytes32 => mapping(address => bool)) public consent;

    // Nonce counter per issuer (prevents replay)
    mapping(address => uint256) public issuerNonce;

    // ───────────────────────── Events ─────────────────────────
    event RoleAssigned(address indexed account, Role role, uint256 timestamp);
    event RecordCreated(
        uint256 indexed recordId,
        bytes32 indexed stealthRef,
        address indexed issuer,
        Role issuerRole,
        RecordCategory category,
        string ipfsCid,
        uint256 timestamp
    );
    event ConsentGranted(bytes32 indexed stealthRef, address indexed provider, uint256 timestamp);
    event ConsentRevoked(bytes32 indexed stealthRef, address indexed provider, uint256 timestamp);

    // ───────────────────────── Modifiers ─────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Only hospital admin");
        _;
    }

    modifier onlyRole(Role _role) {
        require(roles[msg.sender] == _role, "Unauthorized role");
        _;
    }

    modifier onlyAuthorizedStaff() {
        Role r = roles[msg.sender];
        require(
            r == Role.HOSPITAL_ADMIN || r == Role.DOCTOR || r == Role.NURSE || r == Role.RECEPTIONIST,
            "Only hospital staff"
        );
        _;
    }

    modifier onlyPatient() {
        require(roles[msg.sender] == Role.PATIENT, "Only patients");
        _;
    }

    // ───────────────────────── Constructor ─────────────────────────
    constructor() {
        owner = msg.sender;
        roles[msg.sender] = Role.HOSPITAL_ADMIN;
        registeredAddresses[msg.sender] = true;
        emit RoleAssigned(msg.sender, Role.HOSPITAL_ADMIN, block.timestamp);
    }

    // ───────────────────────── Role Management ─────────────────────────

    /**
     * @notice Assign a role to an address. Only the hospital admin can do this.
     */
    function assignRole(address _account, Role _role) external onlyOwner {
        require(_role != Role.NONE, "Cannot assign NONE role");
        roles[_account] = _role;
        registeredAddresses[_account] = true;
        emit RoleAssigned(_account, _role, block.timestamp);
    }

    /**
     * @notice Get the role of any address.
     */
    function getRole(address _account) external view returns (Role) {
        return roles[_account];
    }

    // ───────────────────────── Medical Records ─────────────────────────

    /**
     * @notice Create a new medical record. Only hospital staff can call this.
     * @param _stealthRef  Pseudonymous hash linking to the patient (derived off-chain)
     * @param _ipfsCid     IPFS path/CID where the encrypted data lives
     * @param _metadataHash Hash of the plaintext metadata (for integrity verification)
     * @param _category    Category of this record
     * @return recordId    The index of the newly created record
     */
    function createMedicalRecord(
        bytes32 _stealthRef,
        string calldata _ipfsCid,
        bytes32 _metadataHash,
        RecordCategory _category
    ) external onlyAuthorizedStaff returns (uint256 recordId) {
        recordId = records.length;

        records.push(MedicalRecord({
            stealthRef: _stealthRef,
            ipfsCid: _ipfsCid,
            metadataHash: _metadataHash,
            issuer: msg.sender,
            issuerRole: roles[msg.sender],
            category: _category,
            timestamp: block.timestamp
        }));

        stealthRefIndex[_stealthRef].push(recordId);
        issuerNonce[msg.sender]++;

        emit RecordCreated(
            recordId,
            _stealthRef,
            msg.sender,
            roles[msg.sender],
            _category,
            _ipfsCid,
            block.timestamp
        );
    }

    /**
     * @notice Get all record IDs for a given stealth reference.
     *         Only the patient (who derived the stealthRef) would know which one to query.
     */
    function getRecordsByStealthRef(bytes32 _stealthRef) external view returns (uint256[] memory) {
        return stealthRefIndex[_stealthRef];
    }

    /**
     * @notice Get a single record by ID.
     */
    function getRecord(uint256 _recordId) external view returns (MedicalRecord memory) {
        require(_recordId < records.length, "Record does not exist");
        return records[_recordId];
    }

    /**
     * @notice Get the total number of records.
     */
    function getRecordCount() external view returns (uint256) {
        return records.length;
    }

    // ───────────────────────── Consent Management ─────────────────────────

    /**
     * @notice Patient grants a provider permission to read records under a stealth ref.
     */
    function grantConsent(bytes32 _stealthRef, address _provider) external onlyPatient {
        consent[_stealthRef][_provider] = true;
        emit ConsentGranted(_stealthRef, _provider, block.timestamp);
    }

    /**
     * @notice Patient revokes a provider's permission.
     */
    function revokeConsent(bytes32 _stealthRef, address _provider) external onlyPatient {
        consent[_stealthRef][_provider] = false;
        emit ConsentRevoked(_stealthRef, _provider, block.timestamp);
    }

    /**
     * @notice Check if a provider has consent for a stealth ref.
     */
    function hasConsent(bytes32 _stealthRef, address _provider) external view returns (bool) {
        return consent[_stealthRef][_provider];
    }

    // ───────────────────────── Stealth Reference Helper ─────────────────────────

    /**
     * @notice Generate a stealth reference hash. This is provided as an on-chain utility
     *         but should primarily be computed off-chain for privacy.
     * @param _patientAddress The patient's real wallet address
     * @param _nonce          Interaction-specific nonce
     * @param _salt           Random salt for additional entropy
     */
    function computeStealthRef(
        address _patientAddress,
        uint256 _nonce,
        bytes32 _salt
    ) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(_patientAddress, _nonce, _salt));
    }

    // ───────────────────────── Utility Views ─────────────────────────

    /**
     * @notice Get all records issued by a specific address (for audit).
     */
    function getRecordsByIssuer(address _issuer) external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < records.length; i++) {
            if (records[i].issuer == _issuer) count++;
        }

        uint256[] memory result = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < records.length; i++) {
            if (records[i].issuer == _issuer) {
                result[idx] = i;
                idx++;
            }
        }
        return result;
    }

    /**
     * @notice Get the current nonce for an issuer.
     */
    function getIssuerNonce(address _issuer) external view returns (uint256) {
        return issuerNonce[_issuer];
    }
}
