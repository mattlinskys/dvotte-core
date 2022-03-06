import { ethers } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { TransactionResponse } from "@ethersproject/abstract-provider";

describe("DVotte", () => {
  let releaseTreshold = ethers.utils.parseEther("0.1");
  let dvotte: Contract;
  let owner: SignerWithAddress;

  before(async () => {
    [owner] = await ethers.getSigners();
  });

  it("Should deploy DVotte contract", async () => {
    const DVotte = await ethers.getContractFactory("DVotte");
    dvotte = await DVotte.deploy(releaseTreshold, [owner.address]);
    await dvotte.deployed();
  });

  it("Should add/remove members accordingly", async () => {
    const [, memberToAdd] = await ethers.getSigners();

    await dvotte.addMember(memberToAdd.address);
    expect(await dvotte.getMembers()).to.be.eql([
      owner.address,
      memberToAdd.address,
    ]);

    await dvotte.removeMember(memberToAdd.address);
    expect(await dvotte.getMembers()).to.be.eql([owner.address]);
  });

  it("Should set release threshold and limit it", async () => {
    const newThreshold = releaseTreshold.add(BigNumber.from(100));

    await expect(dvotte.setReleaseThreshold(newThreshold)).to.be.reverted;

    await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);
    await dvotte.setReleaseThreshold(newThreshold);

    expect(await dvotte.releaseThreshold()).to.equal(newThreshold);

    await expect(dvotte.setReleaseThreshold(newThreshold)).to.be.reverted;
  });

  it("Should add devoted value to balance", async () => {
    const value = ethers.utils.parseEther("1");
    const balance = (await dvotte.balance()) as BigNumber;

    await dvotte.devote("", { value });

    expect(await dvotte.balance()).to.equal(balance.add(value));
  });

  it("Should share balance between members", async () => {
    const [, memberToAdd] = await ethers.getSigners();

    await dvotte.addMember(memberToAdd.address);
    await dvotte.devote("", { value: ethers.utils.parseEther("1") });

    const balance = await dvotte.balance();
    await dvotte.share();

    expect(await dvotte.balance()).to.equal(0);

    expect(await dvotte.membersBalances(memberToAdd.address)).to.equal(
      balance.div(BigNumber.from((await dvotte.getMembers()).length))
    );
  });

  it("Should release balance to members", async () => {
    const members = ((await dvotte.getMembers()) as string[]).slice().reverse();
    console.log(members);

    const getBalancesToRelease = async () =>
      (await Promise.all(
        members.map((member) => dvotte.membersBalances(member))
      )) as BigNumber[];
    const getBalances = async () =>
      await Promise.all(
        members.map((member) => ethers.provider.getBalance(member))
      );

    const balancesToReleaseBefore = await getBalancesToRelease();
    const balancesBefore = await getBalances();

    const receipt = await (
      (await dvotte.releaseAll()) as TransactionResponse
    ).wait();

    expect(
      (await getBalancesToRelease()).map((balance) => balance.toString())
    ).to.eql(balancesToReleaseBefore.map(() => "0"));

    for (const [i, balance] of (await getBalances()).entries()) {
      const diff = balancesToReleaseBefore[i].sub(
        balance.sub(balancesBefore[i])
      );
      if (members[i] === owner.address) {
        expect(diff).to.eql(
          receipt.cumulativeGasUsed.mul(receipt.effectiveGasPrice)
        );
      } else {
        expect(diff).to.eql(BigNumber.from(0));
      }
    }
  });
});
