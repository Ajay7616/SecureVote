// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract VotingSystem {

    address public owner;
    
    uint256 public totalVotesCast;
    
    struct Vote {
        uint256 electionId;
        uint256 candidateId;
        bytes32 voterHash;
        uint256 timestamp;
    }
    
    mapping(uint256 => Vote[]) public electionVotes;
    
    mapping(bytes32 => bool) public hasVoted;
    
    mapping(uint256 => uint256) public electionVoteCount;
    
    mapping(uint256 => mapping(uint256 => uint256)) public candidateVoteCount;

    event VoteCast(
        uint256 indexed electionId,
        uint256 indexed candidateId,
        bytes32 indexed voterHash,
        uint256 timestamp
    );
    
    event ElectionFinalized(
        uint256 indexed electionId,
        uint256 totalVotes
    );
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier hasNotVoted(bytes32 _voterHash) {
        require(!hasVoted[_voterHash], "Already voted");
        _;
    }

    constructor() {
        owner = msg.sender;
    }
    
    function castVote(
        uint256 _electionId,
        uint256 _candidateId,
        bytes32 _voterHash
    ) public hasNotVoted(_voterHash) {
        require(_electionId > 0, "Invalid election ID");
        require(_candidateId > 0, "Invalid candidate ID");
        require(_voterHash != bytes32(0), "Invalid voter hash");
        
        // Create new vote
        Vote memory newVote = Vote({
            electionId: _electionId,
            candidateId: _candidateId,
            voterHash: _voterHash,
            timestamp: block.timestamp
        });
        
        // Store vote
        electionVotes[_electionId].push(newVote);
        hasVoted[_voterHash] = true;
        
        // Update counters
        electionVoteCount[_electionId]++;
        candidateVoteCount[_electionId][_candidateId]++;
        totalVotesCast++;
        
        // Emit event
        emit VoteCast(_electionId, _candidateId, _voterHash, block.timestamp);
    }
    
    function getElectionVoteCount(uint256 _electionId) 
        public 
        view 
        returns (uint256) 
    {
        return electionVoteCount[_electionId];
    }
    
    function getCandidateVoteCount(uint256 _electionId, uint256 _candidateId)
        public
        view
        returns (uint256)
    {
        return candidateVoteCount[_electionId][_candidateId];
    }
    
    function checkIfVoted(bytes32 _voterHash)
        public
        view
        returns (bool)
    {
        return hasVoted[_voterHash];
    }
    
    function getElectionVotes(uint256 _electionId)
        public
        view
        returns (Vote[] memory)
    {
        return electionVotes[_electionId];
    }
    
    function getVoteByIndex(uint256 _electionId, uint256 _index)
        public
        view
        returns (Vote memory)
    {
        require(_index < electionVotes[_electionId].length, "Invalid index");
        return electionVotes[_electionId][_index];
    }
    
    function finalizeElection(uint256 _electionId)
        public
        onlyOwner
    {
        uint256 totalVotes = electionVoteCount[_electionId];
        require(totalVotes > 0, "No votes to finalize");
        
        emit ElectionFinalized(_electionId, totalVotes);
    }
    
    function transferOwnership(address _newOwner) 
        public 
        onlyOwner 
    {
        require(_newOwner != address(0), "Invalid new owner address");
        owner = _newOwner;
    }
    
    function version() 
        public 
        pure 
        returns (string memory) 
    {
        return "1.0.0";
    }
}