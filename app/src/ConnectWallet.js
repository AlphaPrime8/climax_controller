import React from 'react';
import "react-loader-spinner/dist/loader/css/react-spinner-loader.css";
import Loader from "react-loader-spinner";
require('@solana/wallet-adapter-react-ui/styles.css');

const ConnectWalletButton = ({
                                 loadMultisigState,
                                 isLoading,
                             }) => {
    if (isLoading){
        return (
            <div className='App'>
                <div className='connect-wallet'>
                    <Loader
                        type="Puff"
                        color="#00BFFF"
                        height={100}
                        width={100}
                        timeout={60000} //3 secs
                    />
                </div>
            </div>
        );
    }
    else  {
        return (
            <div className='App'>
                <div className='connect-wallet'>
                    <button className='connect-wallet-button ff-sans' onClick={loadMultisigState}>Refresh</button>
                </div>
            </div>
        );
    }
};

export default ConnectWalletButton;
