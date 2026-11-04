import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import solc from 'solc';

const sourcePath = resolve('contracts/HarvestLink.sol');
const source = await readFile(sourcePath, 'utf8');
const input = {
  language: 'Solidity',
  sources: { 'contracts/HarvestLink.sol': { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 300 },
    evmVersion: 'cancun',
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object'] } },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input), {
  import: (specifier) => {
    try {
      return { contents: readFileSync(resolve('node_modules', specifier), 'utf8') };
    } catch (error) {
      return { error: `Unable to resolve Solidity import ${specifier}: ${error.message}` };
    }
  },
}));

for (const diagnostic of output.errors ?? []) {
  const write = diagnostic.severity === 'error' ? console.error : console.warn;
  write(diagnostic.formattedMessage);
}
if ((output.errors ?? []).some((diagnostic) => diagnostic.severity === 'error')) {
  process.exitCode = 1;
} else {
  const contract = output.contracts['contracts/HarvestLink.sol'].HarvestLink;
  const artifact = {
    contractName: 'HarvestLink',
    sourceName: 'contracts/HarvestLink.sol',
    abi: contract.abi,
    bytecode: `0x${contract.evm.bytecode.object}`,
    deployedBytecode: `0x${contract.evm.deployedBytecode.object}`,
  };
  const artifactPath = resolve('artifacts/contracts/HarvestLink.sol/HarvestLink.json');
  await mkdir(dirname(artifactPath), { recursive: true });
  await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
  console.log(`Compiled HarvestLink with solc ${solc.version()} to ${artifactPath}`);
}
