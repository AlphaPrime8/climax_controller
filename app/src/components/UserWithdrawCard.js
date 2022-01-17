import React from 'react';
import {to_sol} from "../utils";

const UserWithdrawCard = ({ approveWithdraw, multisigState }) => {
   return (
      <div className='stake-card'>
         <div className='stake-card-header'>
            <h2 className='ff-sans bold letter-spacing-3'>User Withdraw State</h2>
         </div>
         <div className='stake-card-content'>
            <div className='stake-card-content-section flex'>

               <div className='stake-card-NFT flex flex-col'>
                  <h3 className='bold NFT-heading'>User State</h3>
                  {/*MULTISIG CONFIGURATION HERE*/}
                  <div>
                     <p>User withdraws open: {multisigState.officer_threshold}</p>
                     <p>User Addy: {to_sol(multisigState.treasury_balance)} </p>
                     <p>User funds paid: {to_sol(multisigState.treasury_balance)} SOL</p>
                     <p>User funds withdrawn: {multisigState.total_threshold}</p>
                     <p>User funds eligible to withdraw: {multisigState.total_threshold}</p>
                  </div>
               </div>

            </div>
            <div className='stake-card-content-button'>
               <button onClick={approveWithdraw} className='stake-button ff-sans'>
                  Withdraw
               </button>
            </div>
         </div>

      </div>
   );
};

export default UserWithdrawCard;
