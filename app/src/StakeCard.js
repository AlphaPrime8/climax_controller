import React from 'react';
import {PEACH_EARNED_PER_SECOND, SECONDS_PER_DAY} from "./Config";

const StakeCard = ({ stakeNft }) => {
   return (
      <div className='stake-card'>
         <div className='stake-card-header'>
            <h2 className='ff-sans bold letter-spacing-3'>Stake</h2>
            {/* <small className='stake-description'>
               Description of how much you can make per day staking
            </small> */}
         </div>
         <div className='stake-card-content'>
            {/* <div className='stake-card-content-header'>
               <h3 className='bold fs-300'>Select what to stake</h3>
            </div> */}
            <h3 className='bold NFT-heading'>For selected NFT</h3>
            <div className='stake-card-content-section flex'>
               <div className='stake-card-NFT flex flex-col'>
                  {/* <form className='stake-card-NFT-form flex flex-col'>
                     <label>IDs</label>
                     <input type='text' />
                  </form> */}
                  <p>$Peach Rewards Increase</p>
               </div>
               <div className='stake-card-amount flex flex-col'>
                  {/* <h2 className='bold amount-heading'>$SCUM</h2>
                  <form className='stake-card-amount-form flex flex-col'>
                     <label>Amount</label>
                     <input type='text' />
                  </form> */}
                  <p>+ {Math.round(PEACH_EARNED_PER_SECOND * SECONDS_PER_DAY)} $Peach / NFT / Day</p>
               </div>
            </div>
            <div className='stake-card-content-button'>
               <button onClick={stakeNft} className='stake-button ff-sans'>
                  Stake
               </button>
            </div>
         </div>
      </div>
   );
};

export default StakeCard;
