import { Container, singleton } from "@services/Container";
import axios from "axios";
import { ethers } from "ethers";

export interface EtherscanContractAbiResponse {
  status: string;
  message: string;
  result: string;
}

function useEtherscanContractAbi(host: string) {
  return async (address: string) => {
    const res = await axios.get<EtherscanContractAbiResponse>(
      `${host}?module=contract&action=getabi&address=${address}`
    );
    const { status, result } = res.data;
    if (status === "0") {
      if (
        result ===
        "Max rate limit reached, please use API Key for higher rate limit"
      ) {
        throw new Error("RATE_LIMIT");
      }
      if (result === "Contract source code not verified") {
        throw new Error("NOT_VERIFIED");
      }
    }
    if (status !== "1") {
      throw new Error(`Invalid status "${status}" with message "${result}"`);
    }

    return JSON.parse(res.data.result);
  };
}

function providerFactory(host: string) {
  return () => new ethers.providers.JsonRpcProvider(host);
}

export interface Config {
  ethMainNode: string;
  bscMainNode: string;
  polygonMainNode: string;
  avalancheMainNode: string;
}

const axiosFakeHeaders = {
  'Host': 'etherscan.io',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-CA,en-US;q=0.7,en;q=0.3',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Cache-Control': 'max-age=0',
  'TE': 'trailers',
};

export class BlockchainContainer extends Container<Config> {
  readonly ethMain = singleton(providerFactory(this.parent.ethMainNode));

  readonly bscMain = singleton(providerFactory(this.parent.bscMainNode));

  readonly polygon = singleton(providerFactory(this.parent.polygonMainNode));

  readonly avalanche = singleton(providerFactory(this.parent.avalancheMainNode));

  readonly providerByNetwork = (network: number) => {
    switch (network) {
      case 1:
        return this.ethMain();
      case 56:
        return this.bscMain();
      case 137:
        return this.polygon();
      case 43114:
        return this.avalanche();
      default:
        throw new Error(`Undefined network ${network}`);
    }
  };

  readonly etherscan = singleton(() => ({
    getContractAbi: useEtherscanContractAbi("https://api.etherscan.io/api"),
  }));

  readonly bscscan = singleton(() => ({
    getContractAbi: useEtherscanContractAbi("https://api.bscscan.com/api"),
  }));

  readonly polygonscan = singleton(() => ({
    getContractAbi: useEtherscanContractAbi("https://api.polygonscan.com/api"),
  }));

  readonly avaxexplorer = singleton(() => ({
    getContractAbi: async (address: string) => {
        const res = await axios.get(`https://repo.sourcify.dev/contracts/full_match/43114/${address}/metadata.json`);
        return res.data.output.abi;
    },
  }));

  readonly scanByNetwork = (network: number) => {
    switch (network) {
      case 1:
        return this.etherscan();
      case 56:
        return this.bscscan();
      case 137:
        return this.polygonscan();
      case 43114:
        return this.avaxexplorer();
      default:
        throw new Error(`Undefined network ${network}`);
    }
  };

  readonly contract = (
    address: string,
    abi: ethers.ContractInterface,
    signerOrProvider?: ethers.Signer | ethers.providers.Provider
  ) => {
    return new ethers.Contract(address, abi, signerOrProvider);
  };
}
