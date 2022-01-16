import React from 'react';

const ImageToken = ({ src, index, setIdx, selectedIdx }) => {
   // const borderStyle = (selectedIdx == index) ? "5px solid yellow" : "";
   const isSelected = index == selectedIdx;
   const bs = "5px solid white";
   return (
      <div className='image-token' onClick={()=>{setIdx(index); console.log("clicked with key", index);}}>
         {isSelected
             ? <img style={{border: bs}} src={src} alt='NFT' />
             : <img src={src} alt='NFT' />
         }
      </div>
   );
};

export default ImageToken;
