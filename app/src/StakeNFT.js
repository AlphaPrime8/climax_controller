import ImageToken from './ImageToken';
import React from 'react';


const StakeNFT = ({urls, setIdxToStake, idxToStake}) => {
    // let urls = ['/images/1.png','/images/2.jpg','/images/3.jpeg'];
    return (
        <div className='token-stake-card'>
            <h4>Select your SCUM NFTs to Stake</h4>
            <div className='image-container'>
                {urls.map(function(uri, index){
                    return <ImageToken src={uri} key={index} index={index} setIdx={setIdxToStake} selectedIdx={idxToStake}/>;
                })}
            </div>
        </div>
    );
};

export default StakeNFT;
