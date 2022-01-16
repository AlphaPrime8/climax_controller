import ImageToken from './ImageToken';
import React from 'react';

const UnstakeNFT = ({urls, setIdxToUnstake, idxToUnstake}) => {
   return (
      <div className='token-stake-card'>
         <h4>Select your SCUM NFTs to Unstake</h4>
         <div className='image-container'>
             {urls.map(function(uri, index){
                 return <ImageToken src={uri} key={index} index={index} setIdx={setIdxToUnstake} selectedIdx={idxToUnstake}/>;
             })}
         </div>
      </div>
   );
};

export default UnstakeNFT;
