import { useEffect, useState } from "react";
import { SiweMessage } from "siwe";
import { ethers } from "ethers";
import { useConnectWallet } from "@web3-onboard/react";
import { Button, Divider, Input } from "antd";
import { etherToWei, weiToEther } from "@/unipass/format_bignumber";
import logo from "../assets/UniPass.svg";
import { verifySiweMessage } from "@/unipass/verify_message";

const { TextArea } = Input;

function App() {
  const [provider, setProvider] = useState<ethers.providers.Web3Provider>();
  const [{ wallet, connecting }, connect, disconnect] = useConnectWallet();

  const [balance, setBalance] = useState("0");
  const [chainId, setChainId] = useState(0);
  const [signature, setSignature] = useState("");
  const [siweMessage, setSiweMessage] = useState("");
  const [siweSignature, setSiweSignature] = useState("");
  const [typedSignature, setTypedSignature] = useState("");
  const [nativeHash, setNativeHash] = useState("");

  useEffect(() => {
    if (wallet?.provider) {
      setProvider(new ethers.providers.Web3Provider(wallet.provider, "any"));
    } else {
      setProvider(undefined);
    }
  }, [wallet]);

  useEffect(() => {
    if (provider && wallet?.accounts[0]) {
      provider?.getBalance(wallet?.accounts[0].address).then((res) => {
        setBalance(weiToEther(res ?? 0));
      });

      provider
        .getSigner()
        ?.getChainId()
        .then((res) => {
          setChainId(res);
        });
    }
  }, [provider]);

  const signMessage = async () => {
    if (provider) {
      const signer = provider.getSigner();
      const signature = await signer.signMessage("web3-react test message");
      setSignature(signature);
    }
  };

  const signTypedData = async () => {
    if (provider) {
      const eip712DemoData = {
        types: {
          Person: [
            {
              name: "name",
              type: "string",
            },
            {
              name: "wallet",
              type: "address",
            },
          ],
          Mail: [
            {
              name: "from",
              type: "Person",
            },
            {
              name: "to",
              type: "Person",
            },
            {
              name: "contents",
              type: "string",
            },
          ],
        },
        primaryType: "Mail",
        domain: {
          name: "Ether Mail",
          version: "1",
          chainId: 1,
          verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
        },
        message: {
          from: {
            name: "Cow",
            wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
          },
          to: {
            name: "Bob",
            wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
          },
          contents: "Hello, Bob!",
        },
      };
      const signer = provider.getSigner();
      const signature = await signer._signTypedData(
        eip712DemoData.domain,
        eip712DemoData.types,
        eip712DemoData.message
      );
      setTypedSignature(signature);
    }
  };

  const sendTransaction = async () => {
    if (provider && wallet?.accounts[0]?.address) {
      const signer = provider.getSigner();
      const txParams = {
        from: wallet.accounts[0].address,
        to: "0x2B6c74b4e8631854051B1A821029005476C3AF06",
        value: etherToWei("0.001"),
        data: "0x",
      };
      console.log(txParams);

      const txResp = await signer.sendTransaction(txParams);
      const res = await txResp.wait();
      console.log(res);
      setNativeHash(res.transactionHash);
    }
  };

  const getConnectionButtons = () => {
    if (wallet?.label) {
      return (
        <Button
          onClick={() => {
            disconnect({ label: wallet?.label || "" });
            setBalance("0");
            setChainId(0);
            setSignature("");
            setTypedSignature("");
            setNativeHash("");
          }}
          type="dashed"
        >
          Disconnect
        </Button>
      );
    }
    return (
      <Button onClick={() => connect()} type="primary">
        Connect
      </Button>
    );
  };

  const signWithEthereum = async () => {
    if (provider && wallet?.accounts[0]?.address) {
      const siweMessage = createSiweMessage(
        wallet.accounts[0].address,
        "This is a test statement."
      );
      const signer = provider.getSigner();
      const _signature = await signer.signMessage(siweMessage);
      setSiweMessage(siweMessage);
      setSiweSignature(_signature);
    }
  };

  const createSiweMessage = (address: string, statement: string) => {
    const { host, origin } = window.location;
    const siweMessage = new SiweMessage({
      domain: host,
      address,
      statement,
      uri: origin,
      version: "1",
      chainId,
    });
    return siweMessage.prepareMessage();
  };

  return (
    <div style={{ marginBottom: "50px", width: "450px" }}>
      <img src={logo} alt="" width={150} />
      <h1>Web3-Onboard + UniPass</h1>
      <h3>Connect with UniPass:</h3>
      {getConnectionButtons()}
      <Divider />
      <h3>Wallet States:</h3>
      <>
        <h4>address: {wallet?.accounts[0].address || ""}</h4>
        <h4>Balance: {balance}</h4>
        <h4>ChainId: {chainId || "-"}</h4>
      </>
      <Divider />
      <h3>Sign Message:</h3>
      <Button
        type="primary"
        disabled={!wallet}
        onClick={signMessage}
        style={{ marginRight: "30px" }}
      >
        Sign Message
      </Button>
      <h4>signature:</h4>
      <TextArea rows={4} value={signature} />
      <Divider />
      <h3>Sign With Ethereum:</h3>
      <Button
        type="primary"
        disabled={!wallet}
        onClick={signWithEthereum}
        style={{ marginRight: "30px" }}
      >
        Sign With Ethereum
      </Button>
      <h4>siwe signature:</h4>
      <TextArea rows={4} value={siweSignature} />
      <Button
        type="primary"
        disabled={!siweSignature}
        onClick={() => verifySiweMessage(siweMessage, siweSignature, provider!)}
        style={{ marginRight: "30px", marginTop: "20px" }}
      >
        Verify Signature
      </Button>

      <Divider />
      <Button type="primary" onClick={signTypedData} disabled={!wallet}>
        Sign Typed Data(EIP-712)
      </Button>
      <h4>Typed Data Signature:</h4>
      <TextArea rows={4} value={typedSignature} />
      <Divider />
      <h3>Send Transaction:</h3>
      <Button onClick={sendTransaction} type="primary" disabled={!wallet}>
        Send native Token
      </Button>
      <h4>native tx hash:</h4>
      <TextArea rows={2} value={nativeHash} />
      <Divider />
    </div>
  );
}

export default App;
