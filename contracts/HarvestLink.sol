// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControlDefaultAdminRules} from "@openzeppelin/contracts/access/extensions/AccessControlDefaultAdminRules.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @title HarvestLink
/// @notice Public food-lot traceability and PDS allocation ledger. Personal data must never be stored here.
contract HarvestLink is AccessControlDefaultAdminRules, Pausable {
    bytes32 public constant FARMER_ROLE = keccak256("FARMER_ROLE");
    bytes32 public constant PROCUREMENT_ROLE = keccak256("PROCUREMENT_ROLE");
    bytes32 public constant WAREHOUSE_ROLE = keccak256("WAREHOUSE_ROLE");
    bytes32 public constant TRANSPORTER_ROLE = keccak256("TRANSPORTER_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant RETAILER_ROLE = keccak256("RETAILER_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    enum LotStatus { None, Registered, InTransit, AtWarehouse, Allocated, Depleted, Recalled }

    struct Lot {
        bytes32 id;
        bytes32 parentId;
        bytes32 commodityCode;
        bytes32 dataHash;
        bytes32 unitCode;
        address originator;
        address custodian;
        uint128 quantity;
        uint64 createdAt;
        LotStatus status;
    }

    struct Allocation {
        bytes32 id;
        bytes32 lotId;
        bytes32 period;
        bytes32 dataHash;
        address outlet;
        uint128 allocated;
        uint128 remaining;
        uint64 createdAt;
        bool active;
    }

    mapping(bytes32 => Lot) public lots;
    mapping(bytes32 => Allocation) public allocations;
    mapping(bytes32 => bool) public usedRedemptionNullifiers;
    mapping(bytes32 => bytes32) public entitlementAllocation;
    mapping(bytes32 => bool) public redeemedEntitlements;
    mapping(bytes32 => address[]) private _productOwners;
    mapping(uint256 => Product) public products;
    mapping(uint256 => Batch) public batches;
    mapping(uint256 => string[]) private _batchHistory;

    uint256 public productCount;
    uint256 public batchCount;

    struct Product {
        uint256 id;
        string name;
        string description;
        string imageHash;
        address farmer;
        address currentOwner;
        uint256 price;
        uint256 createdAt;
        uint8 status;
        string[] certificates;
    }

    struct Batch {
        uint256 id;
        uint256[] productIds;
        address currentHandler;
        uint256 createdAt;
        string location;
        uint8 status;
    }

    event LotRegistered(bytes32 indexed lotId, bytes32 indexed commodityCode, address indexed originator, address custodian, uint128 quantity, bytes32 unitCode, bytes32 dataHash, bytes32 parentId);
    event LotSplit(bytes32 indexed parentId, bytes32 indexed childId, uint128 childQuantity, bytes32 dataHash);
    event CustodyTransferred(bytes32 indexed lotId, address indexed from, address indexed to, bytes32 dataHash);
    event StockReceived(bytes32 indexed lotId, address indexed facility, bytes32 facilityCode, uint128 quantity, bytes32 dataHash);
    event AllocationRecorded(bytes32 indexed allocationId, bytes32 indexed lotId, address indexed outlet, uint128 quantity, bytes32 period, bytes32 dataHash);
    event DistributionRecorded(bytes32 indexed allocationId, bytes32 indexed nullifier, uint128 quantity, bytes32 dataHash);
    event EntitlementIssued(bytes32 indexed allocationId, bytes32 indexed commitment);
    event LotRecalled(bytes32 indexed lotId, address indexed actor, bytes32 reasonHash);
    event RecordCorrected(bytes32 indexed subjectId, bytes32 previousHash, bytes32 replacementHash, bytes32 reasonHash, address indexed actor);
    event ProductCreated(uint256 indexed productId, string name, address indexed farmer);
    event BatchCreated(uint256 indexed batchId, uint256[] productIds, address indexed creator);
    event StatusUpdated(uint256 indexed productId, uint8 newStatus);
    event OwnershipTransferred(uint256 indexed productId, address from, address to);
    event BatchLocationUpdated(uint256 indexed batchId, string newLocation, address indexed updatedBy);
    event BatchPurchased(uint256 indexed batchId, address indexed buyer, address indexed seller, uint256 price);

    error ZeroAddress();
    error InvalidId();
    error InvalidQuantity();
    error InvalidState();
    error UnauthorizedCustodian();
    error DuplicateId();
    error InvalidCommitment();

    constructor(address initialAdmin)
        AccessControlDefaultAdminRules(2 days, initialAdmin)
    {
        if (initialAdmin == address(0)) revert ZeroAddress();
        _grantRole(AUDITOR_ROLE, initialAdmin);
    }

    modifier validHash(bytes32 value) {
        if (value == bytes32(0)) revert InvalidCommitment();
        _;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }

    function registerLot(
        bytes32 lotId,
        bytes32 commodityCode,
        uint128 quantity,
        bytes32 unitCode,
        address custodian,
        bytes32 dataHash
    ) external whenNotPaused validHash(dataHash) {
        if (!hasRole(FARMER_ROLE, msg.sender) && !hasRole(PROCUREMENT_ROLE, msg.sender)) revert AccessControlUnauthorizedAccount(msg.sender, FARMER_ROLE);
        if (lotId == bytes32(0) || commodityCode == bytes32(0) || unitCode == bytes32(0)) revert InvalidId();
        if (quantity == 0) revert InvalidQuantity();
        if (custodian == address(0)) revert ZeroAddress();
        if (!_isOperator(custodian)) revert AccessControlUnauthorizedAccount(custodian, DISTRIBUTOR_ROLE);
        if (lots[lotId].status != LotStatus.None) revert DuplicateId();
        lots[lotId] = Lot(lotId, bytes32(0), commodityCode, dataHash, unitCode, msg.sender, custodian, quantity, uint64(block.timestamp), LotStatus.Registered);
        emit LotRegistered(lotId, commodityCode, msg.sender, custodian, quantity, unitCode, dataHash, bytes32(0));
    }

    /// @notice Split stock into a child lot while preserving the total quantity.
    function splitLot(bytes32 parentId, bytes32 childId, uint128 childQuantity, bytes32 dataHash)
        external whenNotPaused validHash(dataHash)
    {
        Lot storage parent = lots[parentId];
        if (parent.status == LotStatus.None || parent.status == LotStatus.Depleted) revert InvalidState();
        if (parent.custodian != msg.sender) revert UnauthorizedCustodian();
        if (!_isOperator(msg.sender)) revert AccessControlUnauthorizedAccount(msg.sender, DISTRIBUTOR_ROLE);
        if (childId == bytes32(0) || lots[childId].status != LotStatus.None) revert DuplicateId();
        if (childQuantity == 0 || childQuantity >= parent.quantity) revert InvalidQuantity();
        parent.quantity -= childQuantity;
        lots[childId] = Lot(childId, parentId, parent.commodityCode, dataHash, parent.unitCode, parent.originator, msg.sender, childQuantity, uint64(block.timestamp), parent.status);
        emit LotSplit(parentId, childId, childQuantity, dataHash);
        emit LotRegistered(childId, parent.commodityCode, parent.originator, msg.sender, childQuantity, parent.unitCode, dataHash, parentId);
    }

    /// @notice Custodian atomically transfers a complete lot to another authorized operator.
    function transferCustody(bytes32 lotId, address recipient, bytes32 dataHash)
        external whenNotPaused validHash(dataHash)
    {
        Lot storage lot = lots[lotId];
        if (lot.status == LotStatus.None || lot.status == LotStatus.Depleted || lot.status == LotStatus.Recalled) revert InvalidState();
        if (lot.custodian != msg.sender) revert UnauthorizedCustodian();
        if (recipient == address(0) || recipient == msg.sender) revert ZeroAddress();
        if (!_isOperator(recipient)) revert AccessControlUnauthorizedAccount(recipient, DISTRIBUTOR_ROLE);
        if (!_isOperator(msg.sender)) revert AccessControlUnauthorizedAccount(msg.sender, DISTRIBUTOR_ROLE);
        address previous = lot.custodian;
        lot.custodian = recipient;
        lot.status = LotStatus.InTransit;
        lot.dataHash = dataHash;
        emit CustodyTransferred(lotId, previous, recipient, dataHash);
    }

    function receiveStock(bytes32 lotId, bytes32 facilityCode, bytes32 dataHash)
        external whenNotPaused onlyRole(WAREHOUSE_ROLE) validHash(dataHash)
    {
        Lot storage lot = lots[lotId];
        if (lot.status != LotStatus.InTransit || lot.custodian != msg.sender) revert InvalidState();
        if (facilityCode == bytes32(0)) revert InvalidId();
        lot.status = LotStatus.AtWarehouse;
        lot.dataHash = dataHash;
        emit StockReceived(lotId, msg.sender, facilityCode, lot.quantity, dataHash);
    }

    function recordAllocation(
        bytes32 allocationId,
        bytes32 lotId,
        address outlet,
        uint128 quantity,
        bytes32 period,
        bytes32 dataHash
    ) external whenNotPaused onlyRole(PROCUREMENT_ROLE) validHash(dataHash) {
        Lot storage lot = lots[lotId];
        if (lot.status == LotStatus.None || lot.status == LotStatus.Depleted || lot.status == LotStatus.Recalled) revert InvalidState();
        if (lot.custodian != msg.sender) revert UnauthorizedCustodian();
        if (allocationId == bytes32(0) || allocations[allocationId].id != bytes32(0)) revert DuplicateId();
        if (outlet == address(0) || !_hasDistributionRole(outlet)) revert ZeroAddress();
        if (quantity == 0 || quantity > lot.quantity) revert InvalidQuantity();
        lot.quantity -= quantity;
        if (lot.quantity == 0) lot.status = LotStatus.Depleted;
        else lot.status = LotStatus.Allocated;
        allocations[allocationId] = Allocation(allocationId, lotId, period, dataHash, outlet, quantity, quantity, uint64(block.timestamp), true);
        emit AllocationRecorded(allocationId, lotId, outlet, quantity, period, dataHash);
    }

    /// @notice Outlet records an anonymous single-use redemption. Eligibility issuance is trusted and remains off chain.
    function issueEntitlement(bytes32 allocationId, bytes32 secret)
        external whenNotPaused onlyRole(PROCUREMENT_ROLE)
    {
        Allocation storage allocation = allocations[allocationId];
        if (!allocation.active || secret == bytes32(0)) revert InvalidState();
        bytes32 commitment = keccak256(abi.encode(allocationId, secret));
        if (entitlementAllocation[commitment] != bytes32(0)) revert DuplicateId();
        entitlementAllocation[commitment] = allocationId;
        emit EntitlementIssued(allocationId, commitment);
    }

    function recordDistribution(bytes32 allocationId, bytes32 secret, uint128 quantity, bytes32 dataHash)
        external whenNotPaused validHash(dataHash)
    {
        Allocation storage allocation = allocations[allocationId];
        if (!allocation.active || allocation.outlet != msg.sender) revert UnauthorizedCustodian();
        if (secret == bytes32(0)) revert InvalidId();
        bytes32 nullifier = keccak256(abi.encode(allocationId, secret));
        if (entitlementAllocation[nullifier] != allocationId || redeemedEntitlements[nullifier] || usedRedemptionNullifiers[nullifier]) revert DuplicateId();
        if (quantity == 0 || quantity > allocation.remaining) revert InvalidQuantity();
        redeemedEntitlements[nullifier] = true;
        usedRedemptionNullifiers[nullifier] = true;
        allocation.remaining -= quantity;
        if (allocation.remaining == 0) allocation.active = false;
        emit DistributionRecorded(allocationId, nullifier, quantity, dataHash);
    }

    function recallLot(bytes32 lotId, bytes32 reasonHash) external whenNotPaused onlyRole(AUDITOR_ROLE) validHash(reasonHash) {
        Lot storage lot = lots[lotId];
        if (lot.status == LotStatus.None || lot.status == LotStatus.Depleted) revert InvalidState();
        lot.status = LotStatus.Recalled;
        emit LotRecalled(lotId, msg.sender, reasonHash);
    }

    function correctRecord(bytes32 subjectId, bytes32 previousHash, bytes32 replacementHash, bytes32 reasonHash)
        external whenNotPaused onlyRole(AUDITOR_ROLE) validHash(previousHash) validHash(replacementHash) validHash(reasonHash)
    {
        if (subjectId == bytes32(0)) revert InvalidId();
        emit RecordCorrected(subjectId, previousHash, replacementHash, reasonHash, msg.sender);
    }

    function getProductWithHistory(uint256 productId) external view returns (Product memory, address[] memory) {
        if (productId == 0 || productId > productCount) revert InvalidId();
        return (products[productId], _productOwners[bytes32(productId)]);
    }

    function getProductOwners(uint256 productId) external view returns (address[] memory) {
        if (productId == 0 || productId > productCount) revert InvalidId();
        return _productOwners[bytes32(productId)];
    }

    function createProduct(string calldata name, string calldata description, string calldata imageHash, uint256 price)
        external whenNotPaused onlyRole(FARMER_ROLE) returns (uint256 id)
    {
        if (bytes(name).length == 0) revert InvalidId();
        id = ++productCount;
        Product storage product = products[id];
        product.id = id;
        product.name = name;
        product.description = description;
        product.imageHash = imageHash;
        product.farmer = msg.sender;
        product.currentOwner = msg.sender;
        product.price = price;
        product.createdAt = block.timestamp;
        product.status = 0;
        _productOwners[bytes32(id)].push(msg.sender);
        emit ProductCreated(id, name, msg.sender);
        emit StatusUpdated(id, 0);
    }

    function createBatch(uint256[] calldata productIds, string calldata location)
        external whenNotPaused onlyRole(FARMER_ROLE) returns (uint256 id)
    {
        if (productIds.length == 0 || bytes(location).length == 0) revert InvalidQuantity();
        for (uint256 i; i < productIds.length; ++i) {
            if (productIds[i] == 0 || productIds[i] > productCount || products[productIds[i]].farmer != msg.sender) revert InvalidId();
        }
        id = ++batchCount;
        batches[id] = Batch(id, productIds, msg.sender, block.timestamp, location, 0);
        _batchHistory[id].push("Batch created");
        emit BatchCreated(id, productIds, msg.sender);
    }

    function updateBatchLocation(uint256 batchId, string calldata newLocation) external whenNotPaused onlyRole(DISTRIBUTOR_ROLE) {
        Batch storage batch = batches[batchId];
        if (batchId == 0 || batchId > batchCount || bytes(newLocation).length == 0) revert InvalidId();
        batch.location = newLocation;
        _batchHistory[batchId].push(newLocation);
        emit BatchLocationUpdated(batchId, newLocation, msg.sender);
    }

    /// @dev Legacy product/batch handoff only. No ETH payments are accepted or implied.
    function purchaseBatch(uint256 batchId) external whenNotPaused onlyRole(RETAILER_ROLE) {
        Batch storage batch = batches[batchId];
        if (batchId == 0 || batchId > batchCount || batch.currentHandler == msg.sender) revert InvalidId();
        address seller = batch.currentHandler;
        batch.currentHandler = msg.sender;
        batch.status = 1;
        _batchHistory[batchId].push("Batch handler transferred to retailer");
        emit BatchPurchased(batchId, msg.sender, seller, 0);
    }

    function verifyProduct(uint256 productId) external view returns (Product memory, address[] memory) {
        if (productId == 0 || productId > productCount) revert InvalidId();
        return (products[productId], _productOwners[bytes32(productId)]);
    }

    function addCertificate(uint256 productId, string calldata certificateHash) external whenNotPaused onlyRole(FARMER_ROLE) {
        Product storage product = products[productId];
        if (productId == 0 || productId > productCount || product.farmer != msg.sender || bytes(certificateHash).length == 0) revert InvalidId();
        product.certificates.push(certificateHash);
    }

    function getBatchHistory(uint256 batchId) external view returns (string[] memory) {
        if (batchId == 0 || batchId > batchCount) revert InvalidId();
        return _batchHistory[batchId];
    }

    function getBatchDetail(uint256 batchId) external view returns (Batch memory) {
        if (batchId == 0 || batchId > batchCount) revert InvalidId();
        return batches[batchId];
    }

    function setRole(bytes32 role, address account, bool enabled) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (account == address(0)) revert ZeroAddress();
        if (enabled) _grantRole(role, account);
        else _revokeRole(role, account);
    }

    function _isOperator(address account) private view returns (bool) {
        return hasRole(FARMER_ROLE, account) || hasRole(PROCUREMENT_ROLE, account) || hasRole(WAREHOUSE_ROLE, account) || hasRole(TRANSPORTER_ROLE, account) || hasRole(DISTRIBUTOR_ROLE, account) || hasRole(RETAILER_ROLE, account);
    }

    function _hasDistributionRole(address account) private view returns (bool) {
        return hasRole(DISTRIBUTOR_ROLE, account) || hasRole(RETAILER_ROLE, account);
    }
}
