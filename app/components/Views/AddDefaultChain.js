import validUrl from 'valid-url';
import { ChainId, isSafeChainId } from '@metamask/controller-utils';
import { jsonRpcRequest } from '../../util/jsonRpcRequest';
import Engine from '../../core/Engine';
import { rpcErrors } from '@metamask/rpc-errors';
import {
  getDecimalChainId,
  isPrefixedFormattedHexString,
} from '../../util/networks';
import { MetaMetricsEvents, MetaMetrics } from '../../core/Analytics';
import {
  selectChainId,
  selectNetworkConfigurations,
} from '../../selectors/networkController';
import { store } from '../../store';
import checkSafeNetwork from '../../core/RPCMethods/networkChecker.util';

const EVM_NATIVE_TOKEN_DECIMALS = 18;

const wallet_addDefaultChain = async ({ req, res, analytics }) => {
  const { CurrencyRateController, NetworkController } = Engine.context;

  if (!req.params?.[0] || typeof req.params[0] !== 'object') {
    throw rpcErrors.invalidParams({
      message: `Expected single, object parameter. Received:\n${JSON.stringify(
        req.params,
      )}`,
    });
  }

  const params = req.params[0];

  const {
    chainId,
    chainName: rawChainName = null,
    blockExplorerUrls = null,
    nativeCurrency = null,
    rpcUrls,
  } = params;

  const allowedKeys = {
    chainId: true,
    chainName: true,
    blockExplorerUrls: true,
    nativeCurrency: true,
    rpcUrls: true,
    iconUrls: true,
  };

  const extraKeys = Object.keys(params).filter((key) => !allowedKeys[key]);
  if (extraKeys.length) {
    throw rpcErrors.invalidParams(
      `Received unexpected keys on object parameter. Unsupported keys:\n${extraKeys}`,
    );
  }

  const dirtyFirstValidRPCUrl = Array.isArray(rpcUrls)
    ? rpcUrls.find((rpcUrl) => validUrl.isHttpsUri(rpcUrl))
    : null;
  // Remove trailing slashes
  const firstValidRPCUrl = dirtyFirstValidRPCUrl
    ? dirtyFirstValidRPCUrl.replace(/([^/])\/+$/g, '$1')
    : dirtyFirstValidRPCUrl;

  const firstValidBlockExplorerUrl =
    blockExplorerUrls !== null && Array.isArray(blockExplorerUrls)
      ? blockExplorerUrls.find((blockExplorerUrl) =>
          validUrl.isHttpsUri(blockExplorerUrl),
        )
      : null;

  if (!firstValidRPCUrl) {
    throw rpcErrors.invalidParams(
      `Expected an array with at least one valid string HTTPS url 'rpcUrls', Received:\n${rpcUrls}`,
    );
  }

  if (blockExplorerUrls !== null && !firstValidBlockExplorerUrl) {
    throw rpcErrors.invalidParams(
      `Expected null or array with at least one valid string HTTPS URL 'blockExplorerUrl'. Received: ${blockExplorerUrls}`,
    );
  }

  const _chainId = typeof chainId === 'string' && chainId.toLowerCase();
  if (!isPrefixedFormattedHexString(_chainId)) {
    throw rpcErrors.invalidParams(
      `Expected 0x-prefixed, unpadded, non-zero hexadecimal string 'chainId'. wallet_addEthereumChain Received:\n${
        (chainId, _chainId, typeof chainId, chainId.toLowerCase())
      }`,
    );
  }

  if (!isSafeChainId(_chainId)) {
    throw rpcErrors.invalidParams(
      `Invalid chain ID "${_chainId}": numerical value greater than max safe value. Received:\n${chainId}`,
    );
  }

  if (Object.values(ChainId).find((value) => value === _chainId)) {
    throw rpcErrors.invalidParams(`May not specify default MetaMask chain.`);
  }

  const networkConfigurations = selectNetworkConfigurations(store.getState());
  const existingEntry = Object.entries(networkConfigurations).find(
    ([, networkConfiguration]) => networkConfiguration.chainId === _chainId,
  );

  if (existingEntry) {
    const [networkConfigurationId, networkConfiguration] = existingEntry;
    const currentChainId = selectChainId(store.getState());
    if (currentChainId === _chainId) {
      res.result = null;
      return;
    }

    const analyticsParams = {
      chain_id: getDecimalChainId(_chainId),
      source: 'Custom Network API',
      symbol: networkConfiguration.ticker,
      ...analytics,
    };

    // Skip requestUserApproval and direct switch
    CurrencyRateController.updateExchangeRate(networkConfiguration.ticker);
    NetworkController.setActiveNetwork(networkConfigurationId);

    MetaMetrics.getInstance().trackEvent(
      MetaMetricsEvents.NETWORK_SWITCHED,
      analyticsParams,
    );

    res.result = null;
    return;
  }

  let endpointChainId;

  try {
    endpointChainId = await jsonRpcRequest(firstValidRPCUrl, 'eth_chainId');
  } catch (err) {
    throw rpcErrors.internal({
      message: `Request for method 'eth_chainId' on ${firstValidRPCUrl} failed`,
      data: { networkErr: err },
    });
  }

  if (_chainId !== endpointChainId) {
    throw rpcErrors.invalidParams({
      message: `Chain ID returned by RPC URL ${firstValidRPCUrl} does not match ${_chainId}`,
      data: { chainId: endpointChainId },
    });
  }

  if (typeof rawChainName !== 'string' || !rawChainName) {
    throw rpcErrors.invalidParams({
      message: `Expected non-empty string 'chainName'. Received:\n${rawChainName}`,
    });
  }
  const chainName =
    rawChainName.length > 100 ? rawChainName.substring(0, 100) : rawChainName;

  if (nativeCurrency !== null) {
    if (typeof nativeCurrency !== 'object' || Array.isArray(nativeCurrency)) {
      throw rpcErrors.invalidParams({
        message: `Expected null or object 'nativeCurrency'. Received:\n${nativeCurrency}`,
      });
    }
    if (nativeCurrency.decimals !== EVM_NATIVE_TOKEN_DECIMALS) {
      throw rpcErrors.invalidParams({
        message: `Expected the number 18 for 'nativeCurrency.decimals' when 'nativeCurrency' is provided. Received: ${nativeCurrency.decimals}`,
      });
    }

    if (!nativeCurrency.symbol || typeof nativeCurrency.symbol !== 'string') {
      throw rpcErrors.invalidParams({
        message: `Expected a string 'nativeCurrency.symbol'. Received: ${nativeCurrency.symbol}`,
      });
    }
  }
  const ticker = nativeCurrency?.symbol || 'ETH';

  if (typeof ticker !== 'string' || ticker.length < 2 || ticker.length > 6) {
    throw rpcErrors.invalidParams({
      message: `Expected 2-6 character string 'nativeCurrency.symbol'. Received:\n${ticker}`,
    });
  }

  const requestData = {
    chainId: _chainId,
    blockExplorerUrl: firstValidBlockExplorerUrl,
    chainName,
    rpcUrl: firstValidRPCUrl,
    ticker,
  };

  const alerts = await checkSafeNetwork(
    getDecimalChainId(_chainId),
    requestData.rpcUrl,
    requestData.chainName,
    requestData.ticker,
  );

  requestData.alerts = alerts;

  const analyticsParamsAdd = {
    chain_id: getDecimalChainId(_chainId),
    source: 'Custom Network API',
    symbol: ticker,
    ...analytics,
  };

  MetaMetrics.getInstance().trackEvent(
    MetaMetricsEvents.NETWORK_REQUESTED,
    analyticsParamsAdd,
  );

  // Directly add network configuration without approval
  const networkConfigurationId =
    await NetworkController.upsertNetworkConfiguration(
      {
        rpcUrl: firstValidRPCUrl,
        chainId: _chainId,
        ticker,
        nickname: chainName,
        rpcPrefs: {
          blockExplorerUrl: firstValidBlockExplorerUrl,
        },
      },
      {
        // Metrics-related properties required, but the metric event is a no-op
        // TODO: Use events for controller metric events
        referrer: 'ignored',
        source: 'ignored',
      },
    );

  MetaMetrics.getInstance().trackEvent(
    MetaMetricsEvents.NETWORK_ADDED,
    analyticsParamsAdd,
  );

  // Skip interaction delay and direct switch
  CurrencyRateController.updateExchangeRate(ticker);
  NetworkController.setActiveNetwork(networkConfigurationId);

  res.result = null;
};

const addDefaultChain = () => {
  // Example usage
//   const chainData = {
//     rpcUrls: ['https://data-seed-prebsc-1-s1.bnbchain.org:8545'], //'https://rpc.novaichain.com',
//     chainId: '0x61', //'0x2328',
//     // ticker: 'tBNB', //'tEVMOS',
//     chainName: 'Novai Network',
//     // blockExplorerUrls: [''],
//     nativeCurrency: {
//       name: 'Binance Coin',
//       symbol: 'tBNB',
//       decimals: 18,
//     },
//   };
  const chainData = {
    rpcUrls: ['https://rpc.novaichain.com'],
    chainId: '0x1c58', //'0x2328',
    // ticker: 'tBNB', //'tEVMOS',
    chainName: 'Novai Chain',
    blockExplorerUrls: ['https://scan.novaichain.com/novaichain'],
    nativeCurrency: {
      name: 'NOVAI',
      symbol: 'NOVAI',
      decimals: 18,
    },
  };

  const req = {
    params: [chainData],
  };

  const res = {
    result: null,
  };

  const analytics = {
    // Optional analytics parameters
  };

  wallet_addDefaultChain({ req, res, analytics })
    .then(() => {
      console.log('Successfully added and switched to the new chain.');
      // Additional logic after successful addition and switch
    })
    .catch((error) => {
      console.error('Error adding or switching to the chain:', error);
      // Handle error scenario
    });
};
export default addDefaultChain;
