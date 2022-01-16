import React from 'react';

const ExecuteCard = ({ signersHaveApproved, executeWithdraw }) => {
   return (
      <div className='stake-card'>
         <div className='stake-card-header'>
            <h2 className='ff-sans bold letter-spacing-3'>Execute Withdraw</h2>
         </div>
         <div className='stake-card-content'>

            <div className='stake-card-content-section flex'>
                  <p>Sufficient signers have approved: {signersHaveApproved.toString()}</p>
            </div>

            <div className='stake-card-content-button'>
               <button onClick={executeWithdraw} className='stake-button ff-sans'>
                  Execute
               </button>
            </div>
         </div>
      </div>
   );
};

export default ExecuteCard;