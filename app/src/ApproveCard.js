import React from 'react';
import {PEACH_EARNED_PER_SECOND, SECONDS_PER_DAY} from "./Config";
import ImageToken from "./ImageToken";
import {to_sol} from "./utils";

const ApproveCard = ({ approveWithdraw, multisigState }) => {
   return (
      <div className='stake-card'>
         <div className='stake-card-header'>
            <h2 className='ff-sans bold letter-spacing-3'>Multisig Wallet State</h2>
         </div>
         <div className='stake-card-content'>
            <div className='stake-card-content-section flex'>
               <div className='stake-card-NFT flex flex-col'>
                  <h3 className='bold NFT-heading'>Multisig Config</h3>
                  {/*MULTISIG CONFIGURATION HERE*/}
                  <div>
                     <p >Treasury Balance: {to_sol(multisigState.treasury_balance)} SOL</p>
                     <p ># Signers Required: {multisigState.total_threshold}</p>
                     <p ># Officers Required: {multisigState.officer_threshold}</p>
                  </div>
                  {multisigState.owners_arr.map(function(pubkey, index){
                     return (
                         <div>
                            <p>{pubkey}</p>
                            <p>is officer: {multisigState.is_officer_arr[index].toString()}</p>
                            <p>has approved: {multisigState.signers_arr[index].toString()}</p>
                         </div>);
                  })}
               </div>
               <div className='stake-card-amount flex flex-col'>
                  {/*PROPOSAL PARAMETERS HERE*/}
                  <h3 className='bold NFT-heading'>Proposal Config</h3>
                  <div>
                     <p>Proposal is active: {multisigState.proposal_is_active.toString()}</p>
                     <p>Proposed Receiver: {multisigState.proposed_receiver}</p>
                     <p>Proposed Amount: {to_sol(multisigState.proposed_amount)} SOL</p>
                  </div>
               </div>
            </div>
            <div className='stake-card-content-button'>
               <button onClick={approveWithdraw} className='stake-button ff-sans'>
                  Approve
               </button>
            </div>
         </div>

      </div>
   );
};

export default ApproveCard;
