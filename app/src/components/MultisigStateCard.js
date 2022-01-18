import React from 'react';
import {to_sol} from "../utils";

const MultisigStateCard = ({ approveMultisigWithdraw, climaxControllerState }) => {
   return (
      <div className='stake-card'>
         <div className='stake-card-header'>
            <h2 className='ff-sans bold letter-spacing-3'>Multisig State</h2>
         </div>
         <div className='stake-card-content'>
            <div className='stake-card-content-section flex'>
               <div className='stake-card-NFT flex flex-col'>
                  <h3 className='bold NFT-heading'>Multisig Config</h3>
                  {/*MULTISIG CONFIGURATION HERE*/}
                  <div>
                     <p >Treasury Balance: {to_sol(climaxControllerState.treasury_balance)} SOL</p>
                     <p >Signers Required: {climaxControllerState.signer_threshold}</p>
                     <p >Tipping point Threshold : {climaxControllerState.tipping_point_threshold}</p>
                     <p >Current Mint State : {climaxControllerState.current_mint_state}</p>
                     <p >Hours till close : {climaxControllerState.hours_till_close.toFixed(2)}</p>
                     <p>Withdraws are open: {climaxControllerState.multisig_withdraws_open.toString()}</p>
                  </div>
                  {climaxControllerState.owners_arr.map(function(pubkey, index){
                     return (
                         <div key={index}>
                            <p>{pubkey}</p>
                            <p>has approved: {climaxControllerState.signers_arr[index].toString()}</p>
                         </div>);
                  })}
               </div>
               <div className='stake-card-amount flex flex-col'>
                  {/*PROPOSAL PARAMETERS HERE*/}
                  <h3 className='bold NFT-heading'>Withdraw Proposal</h3>
                  <div>
                     <p>Proposal is active: {climaxControllerState.proposal_is_active.toString()}</p>
                     <p>Proposed Receiver: {climaxControllerState.proposed_receiver.toString()}</p>
                     <p>Proposed Amount: {to_sol(climaxControllerState.proposed_amount)} SOL</p>
                  </div>
               </div>
            </div>
            <div className='stake-card-content-button'>
               <button onClick={approveMultisigWithdraw} className='stake-button ff-sans'>
                  Approve Withdraw Proposal
               </button>
            </div>
         </div>

      </div>
   );
};

export default MultisigStateCard;
