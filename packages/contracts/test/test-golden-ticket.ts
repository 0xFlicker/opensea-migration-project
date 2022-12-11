import { ethers } from "hardhat";
import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";
import fs from "fs";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  GoldenTicket__factory,
  GoldenTicketRedeemed__factory,
} from "../typechain";
import { utils, BigNumber, constants } from "ethers";
import { NotFoundError } from "rxjs";

chai.use(solidity);

describe("Golden ticket test", function () {
  let accounts: SignerWithAddress[];
  this.beforeAll(async () => {
    accounts = await ethers.getSigners();
  });

  it("can mint golden ticket", async () => {
    const [deployer, user] = accounts;
    const goldenTicket = await new GoldenTicket__factory(deployer).deploy(
      deployer.address,
      500,
      "ipfs://1/"
    );

    await goldenTicket.deployed();

    await goldenTicket.mint(user.address);

    expect(
      await goldenTicket.queryFilter(
        goldenTicket.filters.Transfer(constants.AddressZero, user.address, 1)
      )
    ).to.have.length(1);
    expect(await goldenTicket.ownerOf(1)).to.be.eq(user.address);
  });

  it("can redeem golden ticket", async () => {
    const [deployer, user] = accounts;
    const goldenTicket = await new GoldenTicket__factory(deployer).deploy(
      deployer.address,
      500,
      "ipfs://1/"
    );
    const goldenTicketRedeemer = await new GoldenTicketRedeemed__factory(
      deployer
    ).deploy("ipfs://1/");
    await goldenTicket.deployed();
    await goldenTicketRedeemer.deployed();
    await goldenTicket.setGoldenTicketRedeemerAddress(
      goldenTicketRedeemer.address
    );
    await goldenTicketRedeemer.setGoldenTicketAddress(goldenTicket.address);

    await goldenTicket.mint(user.address);
    // connect to user
    const goldenTicketUser = goldenTicket.connect(user);
    await goldenTicketUser.redeem(1, utils.toUtf8Bytes("<3"));
    const redeemEvents = await goldenTicket.queryFilter(
      goldenTicketUser.filters.Redeemed(user.address, 1)
    );
    expect(redeemEvents).to.have.length(1);
    expect(redeemEvents[0].args.data).to.be.eq(
      utils.hexlify(utils.toUtf8Bytes("<3"))
    );

    expect(await goldenTicketRedeemer.ownerOf(1)).to.be.eq(user.address);
    await expect(goldenTicket.ownerOf(1)).to.revertedWith(
      GoldenTicket__factory.createInterface().encodeErrorResult(
        "OwnerQueryForNonexistentToken"
      )
    );
  });

  it("redeem golden ticket is soul bound", async () => {
    const [deployer, user] = accounts;
    const goldenTicket = await new GoldenTicket__factory(deployer).deploy(
      deployer.address,
      500,
      "ipfs://1/"
    );
    const goldenTicketRedeemer = await new GoldenTicketRedeemed__factory(
      deployer
    ).deploy("ipfs://1/");
    await goldenTicket.deployed();
    await goldenTicketRedeemer.deployed();
    await goldenTicket.setGoldenTicketRedeemerAddress(
      goldenTicketRedeemer.address
    );
    await goldenTicketRedeemer.setGoldenTicketAddress(goldenTicket.address);

    await goldenTicket.mint(user.address);
    // connect to user
    const goldenTicketUser = goldenTicket.connect(user);
    await goldenTicketUser.redeem(1, utils.toUtf8Bytes("<3"));

    const goldenTicketRedeemerUser = goldenTicketRedeemer.connect(user);
    await expect(
      goldenTicketRedeemerUser.transferFrom(user.address, deployer.address, 1)
    ).to.revertedWith("GoldenTicket: Soul-bound");
  });
});
