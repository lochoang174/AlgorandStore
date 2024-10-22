"use client"
import { PeraWalletConnect } from "@perawallet/connect";
import { useEffect, useState } from "react";
import { FaShoppingCart, FaWallet } from 'react-icons/fa';
import algosdk from 'algosdk';
import { NetworkId, useWallet } from '@txnlab/use-wallet-react';
import React from "react";
import CartSummary from './components/CartSummary';
import Image from 'next/image';

const peraWallet = new PeraWalletConnect();

interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
}

export default function Home() {
  const {
    algodClient,
    activeAddress,
    setActiveNetwork,
    transactionSigner,
    wallets
  } = useWallet();
  const [accountAddress, setAccountAddress] = useState<string | null>(null);
  const isConnectedToPeraWallet = !!accountAddress;
  const [products] = useState([
    { id: 1, name: "Algorand T-shirt", price: 0.01, image: "https://salmon-raw-harrier-526.mypinata.cloud/ipfs/QmVSro73cZ8SnMrV9YAUqMEho88KoEymRfhXvFAc5dKkAq" },
    { id: 2, name: "Crypto Jeans", price: 0.02, image: "https://salmon-raw-harrier-526.mypinata.cloud/ipfs/QmPZLz7VWiUrSqD2wu8kMhMa84LLfq22M32BRDvRcwAHdb" },
    { id: 3, name: "Blockchain Sneakers", price: 0.03, image: "https://salmon-raw-harrier-526.mypinata.cloud/ipfs/QmXaeuAm4B1bQUtarBxpST8VZexNTXM2YD1WqnTZXGuYXj" },
  ]);
  const [cart, setCart] = useState<Product[]>([]);

  useEffect(() => {
    peraWallet
      .reconnectSession()
      .then((accounts: string[]) => {
        peraWallet.connector?.on("disconnect", handleDisconnectWalletClick);
        if (accounts.length) {
          setAccountAddress(accounts[0]);
        }
      })
      .catch((e: Error) => console.log(e));
  }, [handleDisconnectWalletClick]);

  function handleConnectWalletClick() {
    wallets[0]
      .connect()
      .then((newAccounts) => {
        peraWallet.connector?.on("disconnect", handleDisconnectWalletClick);
        setAccountAddress(newAccounts[0].address);
        setActiveNetwork(NetworkId.TESTNET);
        wallets[0].setActiveAccount(newAccounts[0].address)
      })
      .catch((error) => {
        if (error?.data?.type !== "CONNECT_MODAL_CLOSED") {
          console.log(error);
        }
      });
  }

  function handleDisconnectWalletClick() {
    wallets[0].disconnect();
    setAccountAddress(null);
  }

  function addToCart(product: Product) {
    setCart((prevCart) => [...prevCart, product]);
  }

  async function handlePurchase() {
    if (!accountAddress || !activeAddress) {
      alert('Please connect your wallet before making a purchase.');
      return;
    }

    const totalAmount = cart.reduce((sum, item) => sum + item.price, 0);

    try {
      const atc = new algosdk.AtomicTransactionComposer()
      const suggestedParams = await algodClient.getTransactionParams().do()
      const transaction = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        suggestedParams: suggestedParams,
        from: accountAddress,
        to: "DTUA424DKCJYPHF5MLO6CL4R2BWOTH2GLOUQA257K5I7G65ENHSDJ4TTTE",
        amount: totalAmount * 1000000,
      });
      
      atc.addTransaction({ txn: transaction, signer: transactionSigner })

      const result = await atc.execute(algodClient, 2)
      console.info(`Transaction successful!`, {
        confirmedRound: result.confirmedRound,
        txIDs: result.txIDs
      })
      alert('Purchase successful!')
      setCart([]);
    } catch (error) {
      console.error('Error executing transaction:', error)
      alert('An error occurred during the purchase. Please try again.')
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
      <header className="flex justify-between items-center mb-8 bg-white bg-opacity-20 p-4 rounded-lg">
        <h1 className="text-3xl font-bold text-white">Algorand Store</h1>
        <button
          className="bg-white text-purple-600 px-4 py-2 rounded-full flex items-center hover:bg-purple-100 transition duration-300"
          onClick={isConnectedToPeraWallet ? handleDisconnectWalletClick : handleConnectWalletClick}
        >
          <FaWallet className="mr-2" />
          {isConnectedToPeraWallet ? "Disconnect Wallet" : "Connect Pera Wallet"}
        </button>
      </header>

      <main className="bg-white bg-opacity-10 p-6 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {products.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow-lg overflow-hidden transform hover:scale-105 transition duration-300">
              <Image 
                src={product.image} 
                alt={product.name} 
                width={500} 
                height={300} 
              />
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                <p className="text-gray-600 mb-4">Price: {product.price} Algo</p>
                <button
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-full hover:from-purple-600 hover:to-pink-600 transition duration-300"
                  onClick={() => addToCart(product)}
                >
                  <FaShoppingCart className="inline mr-2" />
                  Add to cart
                </button>
              </div>
            </div>
          ))}
        </div>

        <CartSummary cart={cart} />

        <div className="flex justify-center mt-8">
          <button
            className="bg-gradient-to-r from-green-400 to-blue-500 text-white px-6 py-3 rounded-full text-lg font-semibold hover:from-green-500 hover:to-blue-600 transition duration-300 shadow-lg"
            onClick={handlePurchase}
          >
            Buy now
          </button>
        </div>
      </main>
    </div>
  );
}
