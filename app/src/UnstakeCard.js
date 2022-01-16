import React from 'react';
import {PEACH_EARNED_PER_SECOND, SECONDS_PER_DAY} from "./Config";

const UnstakeCard = ({ unstakeNft }) => {
   return (
      <div className='stake-card'>
         <div className='stake-card-header'>
            <h2 className='ff-sans bold letter-spacing-3'>Unstake</h2>
            {/* <small className='stake-description'>
               Description of unstaking and stop earning $PEACH
            </small> */}
         </div>
         <div className='stake-card-content'>
            <div className='stake-card-content-header'>
               {/* <h3 className='bold fs-300'>Select what to unstake</h3> */}
               <h2 className='bold NFT-heading'>For selected NFT</h2>
            </div>
            <div className='stake-card-content-section flex'>
               <div className='stake-card-NFT flex flex-col'>
                  {/* <form className='stake-card-NFT-form flex flex-col'>
                     <label>IDs</label>
                     <input type='text' />
                  </form> */}
                  <p>$Peach Rewards Decrease</p>
               </div>
               <div className='stake-card-amount flex flex-col'>
                  {/* <h2 className='bold amount-heading'>$SCUM</h2>
                  <form className='stake-card-amount-form flex flex-col'>
                     <label>Amount</label>
                     <input type='text' />
                  </form> */}
                  <p>- {Math.round(PEACH_EARNED_PER_SECOND * SECONDS_PER_DAY)} $Peach / NFT / Day</p>
               </div>
            </div>
            <div className='stake-card-content-button'>
               <button onClick={unstakeNft} className='stake-button ff-sans'>
                  Unstake
               </button>
            </div>
         </div>
      </div>
   );
};

export default UnstakeCard;
