import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const artifactPath = resolve('artifacts/contracts/HarvestLink.sol/HarvestLink.json');
const targetPath = resolve('src/contracts/HarvestLink.json');
const artifact = JSON.parse(await readFile(artifactPath, 'utf8'));
await writeFile(targetPath, `${JSON.stringify({ abi: artifact.abi }, null, 2)}\n`);
console.log(`Synchronized ABI to ${targetPath}`);
