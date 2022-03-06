import { ethers } from "hardhat";
import colors from "colors";
import inquirer from "inquirer";

const main = async () => {
  const [signer] = await ethers.getSigners();
  const { releaseThreshold, members } = await inquirer.prompt([
    {
      name: "releaseThreshold",
      message: "Release threshold (ethers)",
    },
    {
      name: "members",
      message: "Members (comma separated)",
      default: signer.address,
    },
  ]);

  const DVotte = await ethers.getContractFactory("DVotte");
  const dvotte = await DVotte.deploy(
    ethers.utils.parseEther(releaseThreshold),
    members.split(",")
  );
  await dvotte.deployed();

  console.log("DVotte contract deployed at", colors.blue(dvotte.address));
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
