import Routes from '../../../constants/navigation/Routes';
// import AppConstants from '../../../core/AppConstants';
import { MetaMetricsEvents } from '../../../core/Analytics';

import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { selectChainId } from '../../../selectors/networkController';

import type { BrowserParams } from '../Browser/Browser.types';
import { getDecimalChainId } from '../../../util/networks';
import { useMetrics } from '../../hooks/useMetrics';

/**
 * Returns a function that is used to navigate to the MetaMask Bridges webpage.
 * @param location location of navigation call – used for analytics.
 * @returns A function that can be used to navigate to the existing Bridges page in the browser. If there isn't an existing bridge page, one is created based on the current chain ID and passed token address (if provided).
 */
export default function useGoToSwap(location: string) {
  const chainId = useSelector(selectChainId);
  const { navigate } = useNavigation();
  const { trackEvent } = useMetrics();
  return (address?: string) => {
    
    const params: BrowserParams & { existingTabId?: string } = {
      timestamp: Date.now(),
    };

    params.newTabUrl = `${
        "https://swap.novaichain.com/#/swap"
      }`;

    navigate(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params,
    });
    trackEvent(MetaMetricsEvents.SWAP_BUTTON_CLICKED, {
        text: 'Swap',
        tokenSymbol: '',
        location: 'TabBar',
        chain_id: getDecimalChainId(chainId),
      });
    // trackEvent(MetaMetricsEvents.BRIDGE_LINK_CLICKED, {
    //   bridgeUrl: AppConstants.BRIDGE.URL,
    //   location,
    //   chain_id_source: getDecimalChainId(chainId),
    //   token_address_source: address,
    // });
  };
}
