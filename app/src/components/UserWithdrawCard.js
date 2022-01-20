import React from 'react';
import {to_sol} from "../utils";

const UserWithdrawCard = ({ executeUserWithdraw, climaxControllerState }) => {
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
                     <p>User withdraws open: {climaxControllerState.user_withdraws_open.toString()}</p>
                     <p>User Addy: {climaxControllerState.user_addy.slice(0,4) + "..." + climaxControllerState.user_addy.slice(-4, climaxControllerState.user_addy.length)} </p>
                  </div>
               </div>
               <div className='stake-card-NFT flex flex-col'>
                  <h3 className='bold NFT-heading'>Funds Data</h3>
                  {/*MULTISIG CONFIGURATION HERE*/}
                  <div>
                     <p>User funds paid: {to_sol(climaxControllerState.user_funds_paid)} SOL</p>
                     <p>User funds withdrawn: {to_sol(climaxControllerState.user_funds_withdrawn)} SOL</p>
                     <p>User funds eligible to withdraw: {climaxControllerState.user_withdraws_open ? to_sol(climaxControllerState.user_funds_paid - climaxControllerState.user_funds_withdrawn) : 0} SOL</p>
                  </div>
               </div>

            </div>
            <div className='stake-card-content-button'>
               <button onClick={executeUserWithdraw} className='stake-button ff-sans'>
                  Withdraw
               </button>
            </div>
         </div>

      </div>
   );
};

export default UserWithdrawCard;
