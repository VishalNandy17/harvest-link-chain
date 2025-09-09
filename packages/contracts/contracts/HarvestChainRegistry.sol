// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title HarvestChainRegistry
 * @dev Main contract for Harvest Chain supply chain management
 * @author Harvest Chain Team
 */
contract HarvestChainRegistry is AccessControl, ReentrancyGuard {
    using Counters for Counters.Counter;
    using Strings for uint256;

    // Role definitions
    bytes32 public constant FARMER_ROLE = keccak256("FARMER_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant RETAILER_ROLE = keccak256("RETAILER_ROLE");
    bytes32 public constant CONSUMER_ROLE = keccak256("CONSUMER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // Structs
    struct User {
        string name;
        string email;
        string organization;
        string location;
        UserRole role;
        bool isVerified;
        uint256 registrationDate;
        uint256 lastActive;
    }

    struct Batch {
        string batchId;
        string cropType;
        string variety;
        string farmRef;
        uint256 quantityKg;
        uint256 basePricePerKgWei;
        uint256 harvestDate;
        string location;
        string description;
        BatchStatus status;
        address currentOwner;
        address farmer;
        address distributor;
        address retailer;
        uint256 createdAt;
        uint256 lastUpdated;
        QualityMetrics qualityMetrics;
        PriceHistory[] priceHistory;
        TransferHistory[] transferHistory;
    }

    struct QualityMetrics {
        uint256 moisture; // in basis points (1% = 100)
        uint256 protein;  // in basis points
        uint256 fiber;    // in basis points
        bool organic;
        uint256 qualityScore; // 0-10000 (100.00%)
        uint256 assessedAt;
        address assessedBy;
    }

    struct PriceHistory {
        uint256 pricePerKgWei;
        uint256 timestamp;
        address setBy;
        string reason;
    }

    struct TransferHistory {
        address from;
        address to;
        uint256 timestamp;
        string location;
        string notes;
        TransferType transferType;
    }

    struct QRCode {
        string batchId;
        string qrHash;
        string traceUrl;
        uint256 generatedAt;
        address generatedBy;
        bool isActive;
    }

    // Enums
    enum UserRole { None, Farmer, Distributor, Retailer, Consumer }
    enum BatchStatus { Created, InTransit, Received, QualityAssessed, Priced, Finalized, Disputed }
    enum TransferType { Harvest, Transfer, Receive, Finalize }

    // State variables
    Counters.Counter private _batchCounter;
    Counters.Counter private _userCounter;

    mapping(address => User) public users;
    mapping(string => Batch) public batches;
    mapping(string => QRCode) public qrCodes;
    mapping(address => string[]) public userBatches;
    mapping(string => address[]) public batchStakeholders;

    // Events
    event UserRegistered(address indexed userAddress, string name, UserRole role);
    event UserRoleUpdated(address indexed userAddress, UserRole oldRole, UserRole newRole);
    event UserVerified(address indexed userAddress, bool verified);
    
    event BatchCreated(string indexed batchId, address indexed farmer, string cropType, uint256 quantityKg);
    event BatchTransferred(string indexed batchId, address from, address to, TransferType transferType);
    event BatchStatusUpdated(string indexed batchId, BatchStatus oldStatus, BatchStatus newStatus);
    event QualityAssessed(string indexed batchId, uint256 qualityScore, address assessedBy);
    event PriceUpdated(string indexed batchId, uint256 newPrice, address setBy);
    
    event QRCodeGenerated(string indexed batchId, string qrHash, address generatedBy);
    event QRCodeScanned(string indexed batchId, address scanner, uint256 timestamp);

    // Modifiers
    modifier onlyRegisteredUser() {
        require(users[msg.sender].role != UserRole.None, "User not registered");
        _;
    }

    modifier onlyRole(UserRole role) {
        require(users[msg.sender].role == role, "Insufficient role permissions");
        _;
    }

    modifier onlyBatchOwner(string memory batchId) {
        require(batches[batchId].currentOwner == msg.sender, "Not batch owner");
        _;
    }

    modifier batchExists(string memory batchId) {
        require(bytes(batches[batchId].batchId).length > 0, "Batch does not exist");
        _;
    }

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    // User Management Functions
    function registerUser(
        string memory name,
        string memory email,
        string memory organization,
        string memory location,
        UserRole role
    ) external {
        require(users[msg.sender].role == UserRole.None, "User already registered");
        require(role != UserRole.None, "Invalid role");

        users[msg.sender] = User({
            name: name,
            email: email,
            organization: organization,
            location: location,
            role: role,
            isVerified: false,
            registrationDate: block.timestamp,
            lastActive: block.timestamp
        });

        _userCounter.increment();
        emit UserRegistered(msg.sender, name, role);
    }

    function updateUserRole(UserRole newRole) external onlyRole(UserRole.None) {
        UserRole oldRole = users[msg.sender].role;
        require(newRole != UserRole.None, "Invalid role");
        
        users[msg.sender].role = newRole;
        users[msg.sender].lastActive = block.timestamp;
        
        emit UserRoleUpdated(msg.sender, oldRole, newRole);
    }

    function verifyUser(address userAddress) external onlyRole(UserRole.Admin) {
        require(users[userAddress].role != UserRole.None, "User not registered");
        users[userAddress].isVerified = true;
        emit UserVerified(userAddress, true);
    }

    // Batch Management Functions
    function createBatch(
        string memory cropType,
        string memory variety,
        string memory farmRef,
        uint256 quantityKg,
        uint256 basePricePerKgWei,
        uint256 harvestDate,
        string memory location,
        string memory description
    ) external onlyRole(UserRole.Farmer) returns (string memory) {
        require(quantityKg > 0, "Quantity must be greater than 0");
        require(basePricePerKgWei > 0, "Price must be greater than 0");
        require(harvestDate <= block.timestamp, "Harvest date cannot be in future");

        _batchCounter.increment();
        string memory batchId = string(abi.encodePacked("BATCH", _batchCounter.current().toString()));

        Batch storage newBatch = batches[batchId];
        newBatch.batchId = batchId;
        newBatch.cropType = cropType;
        newBatch.variety = variety;
        newBatch.farmRef = farmRef;
        newBatch.quantityKg = quantityKg;
        newBatch.basePricePerKgWei = basePricePerKgWei;
        newBatch.harvestDate = harvestDate;
        newBatch.location = location;
        newBatch.description = description;
        newBatch.status = BatchStatus.Created;
        newBatch.currentOwner = msg.sender;
        newBatch.farmer = msg.sender;
        newBatch.createdAt = block.timestamp;
        newBatch.lastUpdated = block.timestamp;

        // Initialize quality metrics
        newBatch.qualityMetrics = QualityMetrics({
            moisture: 0,
            protein: 0,
            fiber: 0,
            organic: false,
            qualityScore: 0,
            assessedAt: 0,
            assessedBy: address(0)
        });

        // Add initial price history
        newBatch.priceHistory.push(PriceHistory({
            pricePerKgWei: basePricePerKgWei,
            timestamp: block.timestamp,
            setBy: msg.sender,
            reason: "Initial price set by farmer"
        }));

        // Add initial transfer history
        newBatch.transferHistory.push(TransferHistory({
            from: address(0),
            to: msg.sender,
            timestamp: block.timestamp,
            location: location,
            notes: "Batch harvested",
            transferType: TransferType.Harvest
        }));

        userBatches[msg.sender].push(batchId);
        batchStakeholders[batchId].push(msg.sender);

        emit BatchCreated(batchId, msg.sender, cropType, quantityKg);
        return batchId;
    }

    function transferBatch(
        string memory batchId,
        address to,
        string memory location,
        string memory notes
    ) external batchExists(batchId) onlyBatchOwner(batchId) {
        require(to != address(0), "Invalid recipient");
        require(users[to].role != UserRole.None, "Recipient not registered");
        require(to != msg.sender, "Cannot transfer to self");

        Batch storage batch = batches[batchId];
        address from = batch.currentOwner;
        
        // Update batch ownership
        batch.currentOwner = to;
        batch.lastUpdated = block.timestamp;

        // Determine transfer type based on recipient role
        TransferType transferType;
        if (users[to].role == UserRole.Distributor) {
            batch.status = BatchStatus.InTransit;
            batch.distributor = to;
            transferType = TransferType.Transfer;
        } else if (users[to].role == UserRole.Retailer) {
            batch.status = BatchStatus.Received;
            batch.retailer = to;
            transferType = TransferType.Transfer;
        } else {
            revert("Invalid transfer recipient");
        }

        // Add transfer history
        batch.transferHistory.push(TransferHistory({
            from: from,
            to: to,
            timestamp: block.timestamp,
            location: location,
            notes: notes,
            transferType: transferType
        }));

        // Update user batches
        userBatches[to].push(batchId);
        batchStakeholders[batchId].push(to);

        emit BatchTransferred(batchId, from, to, transferType);
        emit BatchStatusUpdated(batchId, batch.status, batch.status);
    }

    function assessQuality(
        string memory batchId,
        uint256 moisture,
        uint256 protein,
        uint256 fiber,
        bool organic
    ) external batchExists(batchId) onlyRole(UserRole.Distributor) {
        Batch storage batch = batches[batchId];
        require(batch.currentOwner == msg.sender, "Not batch owner");
        require(batch.status == BatchStatus.Received, "Batch not ready for quality assessment");

        // Calculate quality score (0-10000 for 100.00%)
        uint256 qualityScore = calculateQualityScore(moisture, protein, fiber, organic);

        batch.qualityMetrics = QualityMetrics({
            moisture: moisture,
            protein: protein,
            fiber: fiber,
            organic: organic,
            qualityScore: qualityScore,
            assessedAt: block.timestamp,
            assessedBy: msg.sender
        });

        batch.status = BatchStatus.QualityAssessed;
        batch.lastUpdated = block.timestamp;

        emit QualityAssessed(batchId, qualityScore, msg.sender);
        emit BatchStatusUpdated(batchId, BatchStatus.Received, BatchStatus.QualityAssessed);
    }

    function updatePrice(
        string memory batchId,
        uint256 newPricePerKgWei,
        string memory reason
    ) external batchExists(batchId) onlyRole(UserRole.Distributor) {
        Batch storage batch = batches[batchId];
        require(batch.currentOwner == msg.sender, "Not batch owner");
        require(newPricePerKgWei > 0, "Price must be greater than 0");

        batch.basePricePerKgWei = newPricePerKgWei;
        batch.lastUpdated = block.timestamp;

        // Add to price history
        batch.priceHistory.push(PriceHistory({
            pricePerKgWei: newPricePerKgWei,
            timestamp: block.timestamp,
            setBy: msg.sender,
            reason: reason
        }));

        if (batch.status == BatchStatus.QualityAssessed) {
            batch.status = BatchStatus.Priced;
            emit BatchStatusUpdated(batchId, BatchStatus.QualityAssessed, BatchStatus.Priced);
        }

        emit PriceUpdated(batchId, newPricePerKgWei, msg.sender);
    }

    function finalizeBatch(string memory batchId) external batchExists(batchId) onlyRole(UserRole.Retailer) {
        Batch storage batch = batches[batchId];
        require(batch.currentOwner == msg.sender, "Not batch owner");
        require(batch.status == BatchStatus.Priced, "Batch not ready for finalization");

        batch.status = BatchStatus.Finalized;
        batch.lastUpdated = block.timestamp;

        // Add finalization to transfer history
        batch.transferHistory.push(TransferHistory({
            from: msg.sender,
            to: msg.sender,
            timestamp: block.timestamp,
            location: batch.location,
            notes: "Batch finalized for retail",
            transferType: TransferType.Finalize
        }));

        emit BatchStatusUpdated(batchId, BatchStatus.Priced, BatchStatus.Finalized);
    }

    // QR Code Functions
    function generateQRCode(string memory batchId) external batchExists(batchId) onlyRole(UserRole.Retailer) {
        Batch storage batch = batches[batchId];
        require(batch.currentOwner == msg.sender, "Not batch owner");
        require(batch.status == BatchStatus.Finalized, "Batch not finalized");

        string memory qrHash = generateQRHash(batchId);
        string memory traceUrl = string(abi.encodePacked("https://harvestchain.com/trace/", batchId));

        qrCodes[batchId] = QRCode({
            batchId: batchId,
            qrHash: qrHash,
            traceUrl: traceUrl,
            generatedAt: block.timestamp,
            generatedBy: msg.sender,
            isActive: true
        });

        emit QRCodeGenerated(batchId, qrHash, msg.sender);
    }

    function scanQRCode(string memory batchId) external batchExists(batchId) {
        require(qrCodes[batchId].isActive, "QR code not active");
        emit QRCodeScanned(batchId, msg.sender, block.timestamp);
    }

    // View Functions
    function getUser(address userAddress) external view returns (User memory) {
        return users[userAddress];
    }

    function getBatch(string memory batchId) external view returns (Batch memory) {
        return batches[batchId];
    }

    function getQRCode(string memory batchId) external view returns (QRCode memory) {
        return qrCodes[batchId];
    }

    function getUserBatches(address userAddress) external view returns (string[] memory) {
        return userBatches[userAddress];
    }

    function getBatchStakeholders(string memory batchId) external view returns (address[] memory) {
        return batchStakeholders[batchId];
    }

    function getBatchPriceHistory(string memory batchId) external view returns (PriceHistory[] memory) {
        return batches[batchId].priceHistory;
    }

    function getBatchTransferHistory(string memory batchId) external view returns (TransferHistory[] memory) {
        return batches[batchId].transferHistory;
    }

    function getTotalBatches() external view returns (uint256) {
        return _batchCounter.current();
    }

    function getTotalUsers() external view returns (uint256) {
        return _userCounter.current();
    }

    // Internal Functions
    function calculateQualityScore(
        uint256 moisture,
        uint256 protein,
        uint256 fiber,
        bool organic
    ) internal pure returns (uint256) {
        // Simple quality scoring algorithm
        uint256 score = 0;
        
        // Moisture scoring (optimal range: 10-15%)
        if (moisture >= 1000 && moisture <= 1500) {
            score += 2500; // 25 points for optimal moisture
        } else if (moisture >= 800 && moisture <= 2000) {
            score += 1500; // 15 points for acceptable moisture
        }

        // Protein scoring (higher is better, max 30%)
        if (protein <= 3000) {
            score += (protein * 25) / 3000; // Up to 25 points for protein
        } else {
            score += 2500;
        }

        // Fiber scoring (higher is better, max 20%)
        if (fiber <= 2000) {
            score += (fiber * 20) / 2000; // Up to 20 points for fiber
        } else {
            score += 2000;
        }

        // Organic bonus
        if (organic) {
            score += 3000; // 30 points for organic
        }

        return score;
    }

    function generateQRHash(string memory batchId) internal view returns (string memory) {
        return string(abi.encodePacked(
            "QR_",
            batchId,
            "_",
            block.timestamp.toString(),
            "_",
            uint256(uint160(msg.sender)).toString()
        ));
    }

    // Admin Functions
    function updateUserLastActive(address userAddress) external onlyRole(UserRole.Admin) {
        users[userAddress].lastActive = block.timestamp;
    }

    function emergencyPause() external onlyRole(UserRole.Admin) {
        // Implementation for emergency pause functionality
    }

    function emergencyResume() external onlyRole(UserRole.Admin) {
        // Implementation for emergency resume functionality
    }
}

