import { ethers } from "hardhat";
import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";
import fs from "fs";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { FlickDropNFT__factory } from "../typechain";
import { utils, BigNumber, constants } from "ethers";

chai.use(solidity);
describe("Payments test", function () {
  let accounts: SignerWithAddress;
  this.beforeAll(async () => {
    accounts = await ethers.getSigners();
  });

  it("Returns royalty information", async () => {
    const [deployer, payee] = accounts;
    const flickdropFactory = new FlickDropNFT__factory(deployer);
    const flickdrop = await flickdropFactory.deploy(
      "test",
      "test",
      payee.address,
      500
    );

    // 100 cost
    let [feeReceiver, basisPoints] = await flickdrop.royaltyInfo(1, 100);
    expect(feeReceiver).to.be.eq(payee.address);
    expect(basisPoints).to.be.eq(5);

    // 1000 cost, different token
    [feeReceiver, basisPoints] = await flickdrop.royaltyInfo(2, 1000);
    expect(feeReceiver).to.be.eq(payee.address);
    expect(basisPoints).to.be.eq(50);
  });

  it("Can update royalties", async () => {
    const [deployer, payee1, payee2] = accounts;
    const flickdropFactory = new FlickDropNFT__factory(deployer);
    const flickdrop = await flickdropFactory.deploy(
      "test",
      "test",
      payee1.address,
      750
    );

    await flickdrop.setDefaultRoyalty(payee2.address, 1000);

    // 100 cost
    const [feeReceiver, basisPoints] = await flickdrop.royaltyInfo(1, 100);
    expect(feeReceiver).to.be.eq(payee2.address);
    expect(basisPoints).to.be.eq(10);
  });

  it("Can withdraw payment", async () => {
    const [deployer] = accounts;
    const flickdropFactory = new FlickDropNFT__factory(deployer);
    // generate a random address for the payee
    const payeeAddress = utils.getAddress(utils.hexlify(utils.randomBytes(20)));
    const flickdrop = await flickdropFactory.deploy(
      "test",
      "test",
      payeeAddress,
      750
    );
    await flickdrop.deployed();

    // send some eth to contract
    await deployer.sendTransaction({
      to: flickdrop.address,
      value: utils.parseEther("1"),
    });
    expect(await ethers.provider.getBalance(flickdrop.address)).to.be.eq(
      utils.parseEther("1")
    );

    // withdraw ETH from contract
    const tx = await flickdrop.withdraw();
    expect(await ethers.provider.getBalance(flickdrop.address)).to.be.eq(
      utils.parseEther("0")
    );
    // check balance of payee
    expect(await ethers.provider.getBalance(payeeAddress)).to.be.eq(
      utils.parseEther("1")
    );
  });
});
