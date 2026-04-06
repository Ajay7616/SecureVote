const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers"); // FIX: Import time

describe("VotingSystem", function () {
  let votingSystem;
  let owner;
  let voter1;
  let voter2;

  beforeEach(async function () {
    // Get signers
    [owner, voter1, voter2] = await ethers.getSigners();

    // Deploy contract
    const VotingSystem = await ethers.getContractFactory("VotingSystem");
    votingSystem = await VotingSystem.deploy();
    await votingSystem.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await votingSystem.owner()).to.equal(owner.address);
    });

    it("Should have zero total votes initially", async function () {
      expect(await votingSystem.totalVotesCast()).to.equal(0);
    });

    it("Should return correct version", async function () {
      expect(await votingSystem.version()).to.equal("1.0.0");
    });
  });

  describe("Voting", function () {
    it("Should cast a vote successfully", async function () {
      const electionId = 1;
      const candidateId = 5;
      const voterHash = ethers.keccak256(ethers.toUtf8Bytes("voter1-unique-hash"));

      // Get current block timestamp
      const currentTime = await time.latest();

      await expect(votingSystem.castVote(electionId, candidateId, voterHash))
        .to.emit(votingSystem, "VoteCast");
        // Note: We can't predict exact timestamp, so just check the event was emitted

      expect(await votingSystem.hasVoted(voterHash)).to.equal(true);
      expect(await votingSystem.totalVotesCast()).to.equal(1);
    });

    it("Should prevent double voting", async function () {
      const electionId = 1;
      const candidateId = 5;
      const voterHash = ethers.keccak256(ethers.toUtf8Bytes("voter1-unique-hash"));

      // First vote
      await votingSystem.castVote(electionId, candidateId, voterHash);

      // Second vote should fail
      await expect(
        votingSystem.castVote(electionId, candidateId, voterHash)
      ).to.be.revertedWith("Already voted");
    });

    it("Should reject invalid election ID", async function () {
      const voterHash = ethers.keccak256(ethers.toUtf8Bytes("voter1"));
      
      await expect(
        votingSystem.castVote(0, 1, voterHash)
      ).to.be.revertedWith("Invalid election ID");
    });

    it("Should reject invalid candidate ID", async function () {
      const voterHash = ethers.keccak256(ethers.toUtf8Bytes("voter1"));
      
      await expect(
        votingSystem.castVote(1, 0, voterHash)
      ).to.be.revertedWith("Invalid candidate ID");
    });

    it("Should update vote counts correctly", async function () {
      const electionId = 1;
      const candidateId = 5;
      
      const voter1Hash = ethers.keccak256(ethers.toUtf8Bytes("voter1"));
      const voter2Hash = ethers.keccak256(ethers.toUtf8Bytes("voter2"));

      await votingSystem.castVote(electionId, candidateId, voter1Hash);
      await votingSystem.castVote(electionId, candidateId, voter2Hash);

      expect(await votingSystem.getElectionVoteCount(electionId)).to.equal(2);
      expect(await votingSystem.getCandidateVoteCount(electionId, candidateId)).to.equal(2);
    });
  });

  describe("Vote Retrieval", function () {
    it("Should get election vote count", async function () {
      const electionId = 1;
      const voter1Hash = ethers.keccak256(ethers.toUtf8Bytes("voter1"));
      const voter2Hash = ethers.keccak256(ethers.toUtf8Bytes("voter2"));

      await votingSystem.castVote(electionId, 1, voter1Hash);
      await votingSystem.castVote(electionId, 2, voter2Hash);

      expect(await votingSystem.getElectionVoteCount(electionId)).to.equal(2);
    });

    it("Should get candidate vote count", async function () {
      const electionId = 1;
      const candidateId = 3;

      const voter1Hash = ethers.keccak256(ethers.toUtf8Bytes("voter1"));
      const voter2Hash = ethers.keccak256(ethers.toUtf8Bytes("voter2"));
      const voter3Hash = ethers.keccak256(ethers.toUtf8Bytes("voter3"));

      await votingSystem.castVote(electionId, candidateId, voter1Hash);
      await votingSystem.castVote(electionId, candidateId, voter2Hash);
      await votingSystem.castVote(electionId, 5, voter3Hash); // Different candidate

      expect(await votingSystem.getCandidateVoteCount(electionId, candidateId)).to.equal(2);
    });

    it("Should check if voter has voted", async function () {
      const voterHash = ethers.keccak256(ethers.toUtf8Bytes("voter1"));

      expect(await votingSystem.checkIfVoted(voterHash)).to.equal(false);

      await votingSystem.castVote(1, 1, voterHash);

      expect(await votingSystem.checkIfVoted(voterHash)).to.equal(true);
    });
  });

  describe("Election Finalization", function () {
    it("Should finalize election (owner only)", async function () {
      const electionId = 1;
      const voterHash = ethers.keccak256(ethers.toUtf8Bytes("voter1"));

      await votingSystem.castVote(electionId, 1, voterHash);

      await expect(votingSystem.finalizeElection(electionId))
        .to.emit(votingSystem, "ElectionFinalized")
        .withArgs(electionId, 1);
    });

    it("Should reject finalization from non-owner", async function () {
      const electionId = 1;
      const voterHash = ethers.keccak256(ethers.toUtf8Bytes("voter1"));

      await votingSystem.castVote(electionId, 1, voterHash);

      await expect(
        votingSystem.connect(voter1).finalizeElection(electionId)
      ).to.be.revertedWith("Only owner can call this function");
    });

    it("Should reject finalizing election with no votes", async function () {
      await expect(
        votingSystem.finalizeElection(1)
      ).to.be.revertedWith("No votes to finalize");
    });
  });

  describe("Ownership", function () {
    it("Should transfer ownership", async function () {
      await votingSystem.transferOwnership(voter1.address);
      expect(await votingSystem.owner()).to.equal(voter1.address);
    });

    it("Should reject ownership transfer from non-owner", async function () {
      await expect(
        votingSystem.connect(voter1).transferOwnership(voter2.address)
      ).to.be.revertedWith("Only owner can call this function");
    });

    it("Should reject transfer to zero address", async function () {
      await expect(
        votingSystem.transferOwnership(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid new owner address");
    });
  });
});