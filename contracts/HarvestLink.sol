// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract HarvestLink is AccessControl, ReentrancyGuard {
    // Role definitions
    bytes32 public constant FARMER_ROLE = keccak256("FARMER_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant RETAILER_ROLE = keccak256("RETAILER_ROLE");
    bytes32 public constant CONSUMER_ROLE = keccak256("CONSUMER_ROLE");
    
    // Product status enum
    enum ProductStatus { 
        Harvested,      // 0
        Processed,      // 1
        Packed,         // 2
        ForSale,        // 3
        Sold,           // 4
        Shipped,        // 5
        Received,       // 6
        Purchased       // 7
    }
    
    // Product structure
    struct Product {
        uint256 id;
        string name;
        string description;
        string imageHash; // IPFS hash for product image
        address farmer;
        address currentOwner;
        uint256 price;
        uint256 createdAt;
        ProductStatus status;
        string[] certificates; // IPFS hashes for certificates
    }
    
    // Batch structure
    struct Batch {
        uint256 id;
        uint256[] productIds;
        address currentHandler;
        uint256 createdAt;
        string location;
    }
    
    // Mapping from product ID to Product
    mapping(uint256 => Product) public products;
    
    // Mapping from batch ID to Batch
    mapping(uint256 => Batch) public batches;
    
    // Track product ownership history
    mapping(uint256 => address[]) public productOwnershipHistory;
    
    // Track batch history
    mapping(uint256 => string[]) public batchHistory;
    
    // Counters
    uint256 public productCount = 0;
    uint256 public batchCount = 0;
    
    // Events
    event ProductCreated(uint256 indexed productId, string name, address indexed farmer);
    event BatchCreated(uint256 indexed batchId, uint256[] productIds, address indexed creator);
    event StatusUpdated(uint256 indexed productId, ProductStatus newStatus);
    event OwnershipTransferred(uint256 indexed productId, address from, address to);
    
    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    // Modifiers
    modifier onlyRoleMember(bytes32 role) {
        require(hasRole(role, msg.sender), "Caller is not a role member");
        _;
    }
    
    // Farmer functions
    function createProduct(
        string memory _name,
        string memory _description,
        string memory _imageHash,
        uint256 _price
    ) public onlyRoleMember(FARMER_ROLE) returns (uint256) {
        productCount++;
        
        Product storage product = products[productCount];
        product.id = productCount;
        product.name = _name;
        product.description = _description;
        product.imageHash = _imageHash;
        product.farmer = msg.sender;
        product.currentOwner = msg.sender;
        product.price = _price;
        product.createdAt = block.timestamp;
        product.status = ProductStatus.Harvested;
        
        // Add to ownership history
        productOwnershipHistory[productCount].push(msg.sender);
        
        emit ProductCreated(productCount, _name, msg.sender);
        emit StatusUpdated(productCount, ProductStatus.Harvested);
        
        return productCount;
    }
    
    function createBatch(uint256[] memory _productIds, string memory _location) 
        public 
        onlyRoleMember(FARMER_ROLE) 
        returns (uint256) 
    {
        require(_productIds.length > 0, "Batch must contain at least one product");
        
        batchCount++;
        
        Batch storage batch = batches[batchCount];
        batch.id = batchCount;
        batch.productIds = _productIds;
        batch.currentHandler = msg.sender;
        batch.createdAt = block.timestamp;
        batch.location = _location;
        
        // Log batch creation
        batchHistory[batchCount].push(string(abi.encodePacked(
            "Batch created at ", 
            _location, 
            " with ", 
            _productIds.length, 
            " products"
        )));
        
        emit BatchCreated(batchCount, _productIds, msg.sender);
        
        return batchCount;
    }
    
    // Distributor functions
    function updateBatchLocation(uint256 _batchId, string memory _newLocation) 
        public 
        onlyRoleMember(DISTRIBUTOR_ROLE)
    {
        require(_batchId > 0 && _batchId <= batchCount, "Invalid batch ID");
        Batch storage batch = batches[_batchId];
        
        // Update location
        string memory oldLocation = batch.location;
        batch.location = _newLocation;
        
        // Log location update
        batchHistory[_batchId].push(string(abi.encodePacked(
            "Location updated from ",
            oldLocation,
            " to ",
            _newLocation
        )));
    }
    
    // Retailer functions
    function purchaseBatch(uint256 _batchId) 
        public 
        payable 
        onlyRoleMember(RETAILER_ROLE)
        nonReentrant
    {
        require(_batchId > 0 && _batchId <= batchCount, "Invalid batch ID");
        Batch storage batch = batches[_batchId];
        
        // In a real implementation, you would check the price and transfer funds here
        // For simplicity, we'll just update the current handler
        batch.currentHandler = msg.sender;
        
        // Log purchase
        batchHistory[_batchId].push("Batch purchased by retailer");
    }
    
    // Consumer functions
    function verifyProduct(uint256 _productId) 
        public 
        view 
        returns (Product memory, address[] memory) 
    {
        require(_productId > 0 && _productId <= productCount, "Invalid product ID");
        return (products[_productId], productOwnershipHistory[_productId]);
    }
    
    // Utility functions
    function addCertificate(uint256 _productId, string memory _certificateHash) 
        public 
        onlyRoleMember(FARMER_ROLE)
    {
        require(_productId > 0 && _productId <= productCount, "Invalid product ID");
        Product storage product = products[_productId];
        require(product.farmer == msg.sender, "Only the original farmer can add certificates");
        
        product.certificates.push(_certificateHash);
    }
    
    function getBatchHistory(uint256 _batchId) 
        public 
        view 
        returns (string[] memory) 
    {
        require(_batchId > 0 && _batchId <= batchCount, "Invalid batch ID");
        return batchHistory[_batchId];
    }
    
    function getProductOwners(uint256 _productId) 
        public 
        view 
        returns (address[] memory) 
    {
        require(_productId > 0 && _productId <= productCount, "Invalid product ID");
        return productOwnershipHistory[_productId];
    }
    
    // Admin functions
    function grantRoleToUser(bytes32 role, address account) 
        public 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        grantRole(role, account);
    }
}
