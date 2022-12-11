import { ethers } from "hardhat";
import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";
import fs from "fs";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { FlickDropNFT__factory } from "../typechain";
import { utils, BigNumber, constants } from "ethers";

chai.use(solidity);

describe("Minting test", function () {
  let accounts: SignerWithAddress[];
  this.beforeAll(async () => {
    accounts = await ethers.getSigners();
  });

  it.only("bulk mint", async () => {
    const [deployer] = accounts;
    const flickdropFactory = new FlickDropNFT__factory(deployer);
    const flickdrop = await flickdropFactory.deploy(
      "test",
      "test",
      deployer.address,
      500
    );
    await flickdrop.deployed();
    // generate random addresses
    const addresses: string[] = [];
    for (let i = 0; i < 150; i++) {
      addresses.push(utils.getAddress(utils.hexlify(utils.randomBytes(20))));
    }
    // bulk mint
    const tokens = addresses.map((_, i) => i + 1);
    // make sure there are no pending transactions by mining a block with evm_mine
    await ethers.provider.send("evm_mine", []);

    const tx = await flickdrop.bulkMint(addresses);
    await tx.wait();
    // get latest block
    const block = await ethers.provider.getBlock(tx.blockNumber ?? 0);
    // get gas used in block
    const gasUsed = block.gasUsed;
    expect(gasUsed).to.be.lt(BigNumber.from(15000000));

    expect(
      await flickdrop.queryFilter(
        flickdrop.filters.Transfer(constants.AddressZero)
      )
    ).to.have.length(150);

    // expect 100 mint events matching the addresses and tokens
    for (let i = 0; i < addresses.length; i++) {
      const event = await flickdrop.queryFilter(
        flickdrop.filters.Transfer(
          constants.AddressZero,
          addresses[i],
          tokens[i]
        )
      );
      // check block event logs
      expect(event.length, `Failed to verify index: ${i}`).to.be.eq(1);
    }
  });
});
