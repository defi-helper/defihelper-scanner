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

function providerFactory(host: string, authorization: string) {
  return () =>
    new ethers.providers.JsonRpcProvider({
      url: host,
      timeout: 300000,
      headers: {
        authorization: `Basic ${authorization}`
      }
    });
}

export interface Config {
  ethMainNode: string;
  bscMainNode: string;
  polygonMainNode: string;
  moonriverMainNode: string;
  avalancheMainNode: string;

  ethMainNodeAuthorization: string;
  bscMainNodeAuthorization: string;
  polygonMainNodeAuthorization: string;
  moonriverMainNodeAuthorization: string;
  avalancheMainNodeAuthorization: string;
}

const axiosFakeHeaders = {
  Host: "etherscan.io",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-CA,en-US;q=0.7,en;q=0.3",
  Connection: "keep-alive",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Cache-Control": "max-age=0",
  TE: "trailers",
};

export class BlockchainContainer extends Container<Config> {
  readonly ethMain = singleton(
    providerFactory(
      this.parent.ethMainNode,
      this.parent.ethMainNodeAuthorization,
    )
  );

  readonly bscMain = singleton(
    providerFactory(
      this.parent.bscMainNode,
      this.parent.bscMainNodeAuthorization,
    )
  );

  readonly polygon = singleton(
    providerFactory(
      this.parent.polygonMainNode,
      this.parent.polygonMainNodeAuthorization,
    )
  );

  readonly moonriver = singleton(
    providerFactory(
      this.parent.moonriverMainNode,
      this.parent.moonriverMainNodeAuthorization,
    )
  );

  readonly avalanche = singleton(
    providerFactory(
      this.parent.avalancheMainNode,
      this.parent.avalancheMainNodeAuthorization,
    )
  );

  readonly providerByNetwork = (network: number) => {
    switch (network) {
      case 1:
        return this.ethMain();
      case 56:
        return this.bscMain();
      case 137:
        return this.polygon();
      case 1285:
        return this.moonriver();
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

  readonly moonriverscan = singleton(() => ({
    getContractAbi: useEtherscanContractAbi(
      "https://api-moonriver.moonscan.io/api"
    ),
  }));

  readonly avalanchescan = singleton(() => ({
    getContractAbi: useEtherscanContractAbi("https://api.snowtrace.io/api"),
  }));

  // readonly avaxexplorer = singleton(() => ({
  //   getContractAbi: async (address: string) => {
  //       const res = await axios.get(`https://repo.sourcify.dev/contracts/full_match/43114/${address}/metadata.json`);
  //       return res.data.output.abi;
  //   },
  // }));

  readonly scanByNetwork = (network: number) => {
    switch (network) {
      case 1:
        return this.etherscan();
      case 56:
        return this.bscscan();
      case 137:
        return this.polygonscan();
      case 1285:
        return this.moonriverscan();
      case 43114:
        return this.avalanchescan();
      default:
        throw new Error(`Undefined network ${network}`);
    }
  };

  readonly contract = (
    address: string,
    abi: ethers.ContractInterface,
    signerOrProvider?: ethers.Signer | ethers.providers.Provider
  ): ethers.Contract => {
    return new ethers.Contract(address, abi, signerOrProvider);
  };
}
