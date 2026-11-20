import { ethers } from 'ethers';
const p = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/alch_85BacZtapOQPfIwVVcp9v');
const b = await p.getBalance('0x01a35D2A021D101A03C3d5f4bD4235A6643614D9');
console.log('Balance:', ethers.formatEther(b), 'ETH');
