// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract GovMindProposals {
    uint256 public nextProposalId;

    struct Proposal {
        uint256 id;
        address creator;
        string title;
        string proposalText;
        string evidenceUrl;
        uint256 treasuryAmount;
        uint256 requestedFunding;
        uint256 timestamp;
    }

    mapping(uint256 => Proposal) public proposals;

    event ProposalSubmitted(
        uint256 indexed id,
        address indexed creator,
        string title,
        string proposalText,
        string evidenceUrl,
        uint256 treasuryAmount,
        uint256 requestedFunding
    );

    function submitProposal(
        string memory _title,
        string memory _proposalText,
        string memory _evidenceUrl,
        uint256 _treasuryAmount,
        uint256 _requestedFunding
    ) public returns (uint256) {
        uint256 id = nextProposalId++;
        
        proposals[id] = Proposal({
            id: id,
            creator: msg.sender,
            title: _title,
            proposalText: _proposalText,
            evidenceUrl: _evidenceUrl,
            treasuryAmount: _treasuryAmount,
            requestedFunding: _requestedFunding,
            timestamp: block.timestamp
        });

        emit ProposalSubmitted(
            id,
            msg.sender,
            _title,
            _proposalText,
            _evidenceUrl,
            _treasuryAmount,
            _requestedFunding
        );

        return id;
    }

    function getProposal(uint256 _id) public view returns (Proposal memory) {
        require(_id < nextProposalId, "Proposal does not exist");
        return proposals[_id];
    }
}
