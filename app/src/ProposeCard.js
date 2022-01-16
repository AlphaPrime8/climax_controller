import React, {useState} from 'react';

const ProposeCard = ({ proposeWithdraw }) => {

   const [inputAmount, setInputAmount] = useState('');
   const [inputReceiver, setInputReceiver] = useState('');

   function proposeCallback(){
      // get input values
      proposeWithdraw(parseFloat(inputAmount), inputReceiver);
   }

   return (
      <div className='stake-card'>
         <div className='stake-card-header'>
            <h2 className='ff-sans bold letter-spacing-3'>Propose Withdraw</h2>
            {/* <small className='stake-description'>
               Description of how much you can make per day staking
            </small> */}
         </div>
         <div className='stake-card-content'>
            {/* <div className='stake-card-content-header'>
               <h3 className='bold fs-300'>Select what to stake</h3>
            </div> */}
            <div className='stake-card-content-section flex'>
               <div className='stake-card-NFT flex flex-col'>
                  <form className='stake-card-NFT-form flex flex-col'>
                     <label>Proposed Receiver</label>
                     <input value={inputReceiver} onInput={e => setInputReceiver(e.target.value)} type='text' />
                  </form>
               </div>
               <div className='stake-card-amount flex flex-col'>
                  <form className='stake-card-amount-form flex flex-col'>
                     <label>Proposed Amount</label>
                     <input value={inputAmount} onInput={e => setInputAmount(e.target.value)} type='text' />
                  </form>
               </div>
            </div>
            <div className='stake-card-content-button'>
               <button onClick={proposeCallback} className='stake-button ff-sans'>
                  Propose
               </button>
            </div>
         </div>
      </div>
   );
};

export default ProposeCard;
