<div align="center">

  <img src="https://avatars.githubusercontent.com/u/97393721" alt="logo" width="200" height="auto" />
  <h1>MindLake Tutorial: Configure Wallet</h1>
  
  <p>
    A step-by-step cookbook for Wallet Configuration to access Mind Lake !
  </p>
</div>

- [:star2: 0. Step by step tutorial](#star2-0-step-by-step-tutorial)
- [:star2: 4. Prepare myconfig.ts](#star2-4-prepare-myconfigts)
  - [:art: 4.1. Prepare Wallet](#art-41-prepare-wallet)
    - [:dart: 4.1.1 Install Wallet](#dart-411-install-wallet)
    - [:dart: 4.1.2 Wallet Sign In: https://scan.mindnetwork.xyz](#dart-412-wallet-sign-in-httpsscanmindnetworkxyz)
    - [:dart: 4.1.3 Register wallets if not in whitelist during testing period](#dart-413-register-wallets-if-not-in-whitelist-during-testing-period)
  - [:art: 4.2. Prepare appKey](#art-42-prepare-appkey)
      - [:dart: 4.2.1 create Dapp](#dart-421-create-dapp)


## :star2: 0. Step by step tutorial
This is part of support chapter for MindLake step-by-step tutorial for [Typescript](README.md)

## :star2: 4. Prepare myconfig.ts

`myconfig.ts` contains the settings of parameters used in examples and use cases, you can copy `myconfig_template.ts` to the name `myconfig.ts` and modify it as per your requirement. If you want to run the examples of quickStart, Use Case 1 and Use Case 2, you only need to fill out `appKey`. If you want to run Use Case 3, you need to fill out the walltes info for all of Alice, Bob and Charlie

### :art: 4.1. Prepare Wallet
#### :dart: 4.1.1 Install Wallet
1. Install [MetaMask](https://metamask.io/download/) plugins in Chrome Browser
2. [Sign up a MetaMask Wallet](https://myterablock.medium.com/how-to-create-or-import-a-metamask-wallet-a551fc2f5a6b)
3. Change the network to Goerli TestNet. If the TestNets aren't displayed, turn on "Show test networks" in Settings.

![MetaMask TestNet](imgs/metamask_testnet_enable.png)

4. Change the network to Goerli TestNet
5. Goerli Faucet for later gas fee if does not have: [Alchemy Goerli Faucet](https://goerlifaucet.com/), [Quicknode Goerli Faucet](https://faucet.quicknode.com/ethereum/goerli), [Moralis Goerli Faucet](https://moralis.io/faucets/)

  ![image](./imgs/change_chain.png)
  
#### :dart: 4.1.2 Wallet Sign In: https://scan.mindnetwork.xyz
1. Open a browser and visit [mind-scan](https://scan.mindnetwork.xyz/scan)
2. Click "Sign in" buttom

  ![image](./imgs/sign_scan.png)
  
2.1 During the 'Connect' procedure, the wallet will prompt the user 2-3 times as follows:
   Sign a nonce for login authentication.
  
  ![image](./imgs/nounce_sign.png)
  
2.2 If the user's account keys are already on the chain: Decrypt the user's account keys using the wallet's private key.
  
  ![image](./imgs/decrypt_request.png)

2.3 If the user's account keys do not exist yet: Obtain the public key of the wallet, which is used to encrypt the randomly generated account keys.
  
  ![image](./imgs/request_publickey.png)

2.4 Sign the transaction to upload the encrypted key ciphers to the smart contract on the chain.
  
  ![image](./imgs/upload_chain.png)

#### :dart: 4.1.3 Register wallets if not in whitelist during testing period
1. If not in whitelist, there will be a pop-up prompt
  
  ![image](./imgs/white_list_popup.png)

2. Click [Apply for test link ](https://bit.ly/mindalphatest)
3. After successful application, Please be patient and wait for the review.

### :art: 4.2. Prepare appKey
##### :dart: 4.2.1 create Dapp
1. Click `myDapp` in left side manu

![image](./imgs/myDapp_menu.png)

2. Click "Create Dapp" 

![image](./imgs/create_dapp.png)

3. Input your Dapp name and then click "Create"

![image](./imgs/create_dapp_confirm.png)

4. copy appKey value into myconfig.ts to update "appKey"

![image](./imgs/dapp_list.png)
