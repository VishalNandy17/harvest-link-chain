// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title SupplyChainRegistry
 * @notice Tracks batches of crops through the supply chain with roles and events
 */
contract SupplyChainRegistry is AccessControl, ReentrancyGuard, Pausable {
    // Roles
    bytes32 public constant FARMER_ROLE = keccak256("FARMER_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant RETAILER_ROLE = keccak256("RETAILER_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    /**
     * @dev Batch status
     */
    enum Status { Created, InTransit, Received, Finalized }

    /**
     * @dev Batch struct
     */
    struct Batch {
        bytes32 id;
        address origin;
        string cropType;
        string farmRef;
        uint256 quantityKg;
        uint256 basePricePerKgWei;
        uint64 harvestAt;
        address currentHolder;
        Status status;
        bool disputed;
    }

    /**
     * @dev Quality struct
     */
    struct Quality {
        string metric;
        string value;
        string certUri;
        address inspector;
        uint64 at;
    }

    /**
     * @dev Price update struct
     */
    struct PriceUpdate {
        uint256 pricePerKgWei;
        address setter;
        uint64 at;
        string reason;
    }

    // Storage
    mapping(bytes32 => Batch) public batches;
    mapping(bytes32 => Quality[]) public qualities;
    mapping(bytes32 => PriceUpdate[]) public priceHistory;
    mapping(bytes32 => address[]) public custodyTrail;

    // Events
    event BatchCreated(bytes32 indexed id, address indexed farmer);
    event CustodyTransferred(bytes32 indexed id, address indexed from, address indexed to);
    event QualityUpdated(bytes32 indexed id, uint256 idx);
    event PriceUpdated(bytes32 indexed id, uint256 idx);
    event Finalized(bytes32 indexed id);
    event Disputed(bytes32 indexed id, string reason);

    // Custom errors
    error NotAuthorized();
    error InvalidStatus();
    error BatchNotFound();
    error AlreadyFinalized();
    error InvalidAddress();

    /**
     * @notice Constructor sets up roles
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @notice Create a new batch
     * @param id Batch ID
     * @param cropType Crop type
     * @param farmRef Farm reference
     * @param quantityKg Quantity in kg
     * @param basePricePerKgWei Base price per kg in wei
     * @param harvestAt Harvest timestamp
     */
    function createBatch(
        bytes32 id,
        string calldata cropType,
        string calldata farmRef,
        uint256 quantityKg,
        uint256 basePricePerKgWei,
        uint64 harvestAt
    ) external whenNotPaused onlyRole(FARMER_ROLE) {
        if (batches[id].id != 0) revert BatchNotFound();
        batches[id] = Batch({
            id: id,
            origin: msg.sender,
            cropType: cropType,
            farmRef: farmRef,
            quantityKg: quantityKg,
            basePricePerKgWei: basePricePerKgWei,
            harvestAt: harvestAt,
            currentHolder: msg.sender,
            status: Status.Created,
            disputed: false
        });
        custodyTrail[id].push(msg.sender);
        emit BatchCreated(id, msg.sender);
    }

    /**
     * @notice Transfer custody to another address
     * @param id Batch ID
     * @param to New holder
     * @param memo Transfer memo
     */
    function transferCustody(bytes32 id, address to, string calldata memo) external whenNotPaused nonReentrant {
        Batch storage batch = batches[id];
        if (batch.id == 0) revert BatchNotFound();
        if (batch.status == Status.Finalized) revert AlreadyFinalized();
        if (batch.currentHolder != msg.sender) revert NotAuthorized();
        if (to == address(0)) revert InvalidAddress();
        address from = batch.currentHolder;
        batch.currentHolder = to;
        batch.status = Status.InTransit;
        custodyTrail[id].push(to);
        emit CustodyTransferred(id, from, to);
    }

    /**
     * @notice Receive batch (by distributor/retailer)
     * @param id Batch ID
     */
    function receiveBatch(bytes32 id) external whenNotPaused {
        Batch storage batch = batches[id];
        if (batch.id == 0) revert BatchNotFound();
        if (batch.status != Status.InTransit) revert InvalidStatus();
        batch.status = Status.Received;
    }

    /**
     * @notice Update quality metrics
     * @param id Batch ID
     * @param metric Quality metric
     * @param value Metric value
     * @param certUri Certificate URI
     */
    function updateQuality(bytes32 id, string calldata metric, string calldata value, string calldata certUri) external whenNotPaused onlyRole(AUDITOR_ROLE) {
        Batch storage batch = batches[id];
        if (batch.id == 0) revert BatchNotFound();
        if (batch.status == Status.Finalized) revert AlreadyFinalized();
        qualities[id].push(Quality({
            metric: metric,
            value: value,
            certUri: certUri,
            inspector: msg.sender,
            at: uint64(block.timestamp)
        }));
        emit QualityUpdated(id, qualities[id].length - 1);
    }

    /**
     * @notice Update price
     * @param id Batch ID
     * @param pricePerKgWei New price per kg in wei
     * @param reason Reason for update
     */
    function updatePrice(bytes32 id, uint256 pricePerKgWei, string calldata reason) external whenNotPaused {
        Batch storage batch = batches[id];
        if (batch.id == 0) revert BatchNotFound();
        if (batch.status == Status.Finalized) revert AlreadyFinalized();
        priceHistory[id].push(PriceUpdate({
            pricePerKgWei: pricePerKgWei,
            setter: msg.sender,
            at: uint64(block.timestamp),
            reason: reason
        }));
        emit PriceUpdated(id, priceHistory[id].length - 1);
    }

    /**
     * @notice Finalize batch
     * @param id Batch ID
     */
    function finalizeBatch(bytes32 id) external whenNotPaused {
        Batch storage batch = batches[id];
        if (batch.id == 0) revert BatchNotFound();
        if (batch.status == Status.Finalized) revert AlreadyFinalized();
        batch.status = Status.Finalized;
        emit Finalized(id);
    }

    /**
     * @notice Dispute a batch
     * @param id Batch ID
     * @param reason Dispute reason
     */
    function dispute(bytes32 id, string calldata reason) external whenNotPaused {
        Batch storage batch = batches[id];
        if (batch.id == 0) revert BatchNotFound();
        if (batch.status == Status.Finalized) revert AlreadyFinalized();
        batch.disputed = true;
        emit Disputed(id, reason);
    }

    // View getters
    /** @notice Get batch details */
    function getBatch(bytes32 id) external view returns (Batch memory) {
        return batches[id];
    }
    /** @notice Get qualities for batch */
    function getQualities(bytes32 id) external view returns (Quality[] memory) {
        return qualities[id];
    }
    /** @notice Get price history for batch */
    function getPriceHistory(bytes32 id) external view returns (PriceUpdate[] memory) {
        return priceHistory[id];
    }
    /** @notice Get custody trail for batch */
    function getCustodyTrail(bytes32 id) external view returns (address[] memory) {
        return custodyTrail[id];
    }
}
