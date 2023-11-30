import { expect } from "chai";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { MockToken, Vault } from "../typechain";
import { parseUnits } from "ethers";

describe("Vault", () => {
  let owner: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;

  let vault: Vault;
  let token: MockToken;

  before(async () => {
    [owner, alice, bob] = await ethers.getSigners();

    const mockFactory = await ethers.getContractFactory("MockToken");
    token = await mockFactory.deploy("MockToken", "MockToken");
  });

  beforeEach(async () => {
    const vaultFactory = await ethers.getContractFactory("Vault");
    vault = await vaultFactory.deploy();
  });

  describe("Owner Privileges", () => {
    it("should transfer ownership to deployer at deployment", async () => {
      expect(await vault.owner()).to.be.equal(owner.address);
    });

    it("owner should be able to whitelist/blacklist tokens", async () => {
      await expect(vault.connect(alice).whitelistToken(token, true))
        .to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount")
        .withArgs(alice.address);

      await expect(vault.whitelistToken(token, true))
        .to.be.emit(vault, "UpdatedTokenWhitelist")
        .withArgs(token.target, true);

      expect(await vault.whitelistedTokens(token)).to.be.true;

      await expect(vault.whitelistToken(token, false))
        .to.be.emit(vault, "UpdatedTokenWhitelist")
        .withArgs(token.target, false);

      expect(await vault.whitelistedTokens(token)).to.be.false;
    });
    it("owner should be able to pause the contract", async () => {
      await expect(vault.connect(alice).pause())
        .to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount")
        .withArgs(alice.address);

      await expect(vault.pause()).to.be.emit(vault, "Paused");
      expect(await vault.paused()).to.be.true;

      await expect(vault.pause()).to.be.revertedWithCustomError(
        vault,
        "EnforcedPause"
      );
    });

    it("owner should be able to unpause the contract", async () => {
      await vault.pause();

      await expect(vault.connect(alice).unpause())
        .to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount")
        .withArgs(alice.address);

      await expect(vault.unpause()).to.be.emit(vault, "Unpaused");
      expect(await vault.paused()).to.be.false;

      await expect(vault.unpause()).to.be.revertedWithCustomError(
        vault,
        "ExpectedPause"
      );
    });
  });

  describe("Deposit()", () => {
    const depositAmount = parseUnits("10");
    beforeEach(async () => {
      await vault.whitelistToken(token, true);
      await token.connect(alice).mint(parseUnits("1000"));
    });

    it("should not allow deposit non-whitelisted tokens", async () => {
      await expect(vault.connect(alice).deposit(bob.address, depositAmount))
        .to.be.revertedWithCustomError(vault, "NotWhitelisted")
        .withArgs(bob.address);
    });

    it("should not allow deposit when paused", async () => {
      await vault.pause();
      await expect(
        vault.connect(alice).deposit(token, depositAmount)
      ).to.be.revertedWithCustomError(vault, "EnforcedPause");
    });

    it("should be able to deposit tokens on the vault", async () => {
      const aliceBeforeBal = await token.balanceOf(alice);
      const vaultBeforeBal = await token.balanceOf(vault);

      await token.connect(alice).approve(vault, depositAmount);

      await expect(vault.connect(alice).deposit(token, depositAmount))
        .to.be.emit(vault, "Deposited")
        .withArgs(alice.address, token.target, depositAmount);

      const aliceAfterBal = await token.balanceOf(alice);
      const vaultAfterBal = await token.balanceOf(vault);

      expect(aliceAfterBal).to.be.equal(aliceBeforeBal - depositAmount);
      expect(vaultAfterBal).to.be.equal(vaultBeforeBal + depositAmount);

      expect(await vault.balanceOf(alice, token)).to.be.equal(depositAmount);
    });
  });

  describe("Withdraw()", () => {
    const depositAmount = parseUnits("10");
    const withdrawAmount = parseUnits("5");
    beforeEach(async () => {
      await vault.whitelistToken(token, true);
      await token.connect(alice).mint(parseUnits("1000"));
      await token.connect(alice).approve(vault, depositAmount);
      await vault.connect(alice).deposit(token, depositAmount);
    });

    it("should not allow withdraw non-whitelisted tokens", async () => {
      await expect(vault.connect(alice).withdraw(bob.address, withdrawAmount))
        .to.be.revertedWithCustomError(vault, "NotWhitelisted")
        .withArgs(bob.address);
    });

    it("should not allow withdraw when paused", async () => {
      await vault.pause();
      await expect(
        vault.connect(alice).withdraw(token, withdrawAmount)
      ).to.be.revertedWithCustomError(vault, "EnforcedPause");
    });

    it("should be able to withdraw tokens from the vault", async () => {
      const aliceBeforeBal = await token.balanceOf(alice);
      const vaultBeforeBal = await token.balanceOf(vault);

      await expect(vault.connect(alice).withdraw(token, withdrawAmount))
        .to.be.emit(vault, "Withdrew")
        .withArgs(alice.address, token.target, withdrawAmount);

      const aliceAfterBal = await token.balanceOf(alice);
      const vaultAfterBal = await token.balanceOf(vault);

      expect(aliceAfterBal).to.be.equal(aliceBeforeBal + withdrawAmount);
      expect(vaultAfterBal).to.be.equal(vaultBeforeBal - withdrawAmount);

      expect(await vault.balanceOf(alice, token)).to.be.equal(
        depositAmount - withdrawAmount
      );
    });

    it("should revert when withdrawing more than deposited", async () => {
      await vault.connect(alice).withdraw(token, withdrawAmount);

      await expect(vault.connect(alice).withdraw(token, depositAmount))
        .to.be.revertedWithCustomError(vault, "InsufficientBalance")
        .withArgs(alice.address, token.target);
    });
  });
});
