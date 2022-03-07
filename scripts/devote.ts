import { ethers } from "hardhat";
import colors from "colors";
import inquirer from "inquirer";
import { utils } from "ethers";

const main = async () => {
  const [signer] = await ethers.getSigners();
  const { address, amount, note } = await inquirer.prompt([
    {
      name: "address",
      message: "Contract address",
    },
    {
      name: "amount",
      message: "Amount in ether",
      type: "number",
    },
    {
      name: "note",
      message: "Note",
    },
  ]);

  const DVotte = await ethers.getContractFactory("DVotte");
  const contract = DVotte.attach(address);
  await contract.devote(note ?? "", {
    value: ethers.utils.parseEther(amount.toString()),
  });

  console.log("Devoted at", colors.blue(address));
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
