import React from 'react';
import {PEACH_EARNED_PER_SECOND, SECONDS_PER_DAY} from "./Config";

const live_peach_earned_id = "live-peach-earned";
let liveTimer = null;

const Nav = ({numNftsStaked, totalPeachEarned, totalNftsStaked}) => {

   // setup live peach earned update interval
   const startTimeSeconds = Date.now()/1000;
   function updatePeachEarned(){
      // calculate peach earned
      const timeElapsed = (Date.now()/1000) - startTimeSeconds;
      const currentPeachEarnedPerSecond = numNftsStaked * PEACH_EARNED_PER_SECOND;
      const livePeachEarned = totalPeachEarned + (currentPeachEarnedPerSecond * timeElapsed);
      document.getElementById(live_peach_earned_id).innerText = (livePeachEarned.toFixed(2) + " $PEACH").padStart(15, ' ');
   }

   if (liveTimer){
      clearInterval(liveTimer);
      liveTimer = null;
   }

   if (numNftsStaked > 0) {
      liveTimer = setInterval(updatePeachEarned, 100);
   }

   return (
      <div className='nav-main'>
         <hr style={{ opacity: 0.3 }} />
         <div className='flex-container nav'>
            <div className='daily-rewards'>
               <p style={{fontFamily: "monospace"}} >{Math.round(numNftsStaked * PEACH_EARNED_PER_SECOND * SECONDS_PER_DAY)} $PEACH</p>
               <small>Daily Rewards</small>
            </div>
            <div className='staked-NFTs'>
               <p style={{fontFamily: "monospace"}} >{numNftsStaked} NFTs</p>
               <small>Your Staked NFTs</small>
            </div>
            {/* <div className="staked-amount">
               <p>90.0000.000</p>
               <small>Your Staked $SCUM</small>
            </div> */}
            <div className='pending-rewards'>
               {/*TODO I have monospace font family so number wouldnt "jitter" but all other test display should be made to match.*/}
               <p style={{fontFamily: "monospace"}} id={live_peach_earned_id}>{Math.round(totalPeachEarned)} $PEACH</p>
               <small>Pending Rewards</small>
            </div>
            <div className='claim'>
               <button className='claim-button ff-sans'>Claim</button>
            </div>
            <div className='wallet-balance'>
               <p style={{fontFamily: "monospace"}} >0 $PEACH</p>
               <small>Wallet Balance</small>
            </div>
            <div className='total-NFTs'>
               <p style={{fontFamily: "monospace"}}>{totalNftsStaked} NFTs</p>
               <small>Total NFTs staked</small>
            </div>
            {/* <div className="total-amount">
               <p>9.000.0000.0000</p>
               <small>Total $SCUM Staked</small>
            </div> */}
         </div>
         <hr style={{ opacity: 0.3 }} />
      </div>
   );
};

export default Nav;
