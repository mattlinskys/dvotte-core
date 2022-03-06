import { task, HardhatUserConfig } from "hardhat/config";
import fse from "fs-extra";
import path from "path";
import "@nomiclabs/hardhat-waffle";
import "hardhat-gas-reporter";

task("gen-abi", "Generate ABI fragments")
  .addParam("dir", "Output directory")
  .setAction(async ({ dir }: { dir: string }, hre) => {
    const artifactNames = await hre.artifacts.getAllFullyQualifiedNames();
    const filteredNames = artifactNames.filter(
      (name) => !name.startsWith("@openzeppelin") && !name.endsWith("console")
    );
    const writeDir = dir.startsWith("/") ? dir : path.join(process.cwd(), dir);

    await fse.ensureDir(writeDir);
    await Promise.all(
      filteredNames.map(async (name) => {
        const { contractName, abi, bytecode } =
          await hre.artifacts.readArtifact(name);
        await fse.writeFile(
          path.join(writeDir, `${name.split(":").pop()}.json`),
          JSON.stringify({
            contractName,
            abi,
            bytecode,
          })
        );
      })
    );
  });

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.4",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
};

export default config;
