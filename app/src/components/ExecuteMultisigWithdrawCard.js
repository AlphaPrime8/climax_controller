import React from 'react';

const ExecuteMultisigWithdrawCard = ({ climaxControllerState, executeMultisigWithdraw }) => {
   return (
      <div className='stake-card'>
         <div className='stake-card-header'>
            <h2 className='ff-sans bold letter-spacing-3'>Execute Multisig Withdraw</h2>
         </div>
         <div className='stake-card-content'>

            <div className='stake-card-content-section flex'>
                  <p>Sufficient signers have approved: {climaxControllerState.sufficient_signers_have_approved.toString()}</p>
            </div>

            <div className='stake-card-content-button'>
               <button onClick={executeMultisigWithdraw} className='stake-button ff-sans'>
                  Execute
               </button>
            </div>
         </div>
      </div>
   );
};

export default ExecuteMultisigWithdrawCard;