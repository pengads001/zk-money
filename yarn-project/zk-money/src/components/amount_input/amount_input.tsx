import { useContext } from 'react';
import { Amount } from '../../alt-model/assets/amount.js';
import { StrOrMax, MAX_MODE } from '../../alt-model/forms/constants.js';
import { getAssetPreferredFractionalDigits } from '../../alt-model/known_assets/known_asset_display_data.js';
import { TopLevelContext } from '../../alt-model/top_level_context/top_level_context.js';
import { usePendingBalances } from '../../alt-model/top_level_context/top_level_context_hooks.js';
import { RemoteAsset } from '../../alt-model/types.js';
import { useWalletInteractionIsOngoing } from '../../alt-model/wallet_interaction_hooks.js';
import { formatBaseUnits } from '../../app/units.js';
import { Layer, DropdownOption, FieldStatus, Field } from '../../ui-components/index.js';
import { getWalletSelectorToast, Toasts } from '../../views/toasts/toast_configurations.js';

export function formatMaxAmount(maxAmount: bigint, asset: RemoteAsset) {
  if (maxAmount === 0n) {
    // Skip decimal places for 0
    return '0';
  }
  return formatBaseUnits(maxAmount, asset.decimals, {
    precision: getAssetPreferredFractionalDigits(asset.label),
    floor: true,
  });
}

interface AmountInputProps {
  asset: RemoteAsset;
  value: StrOrMax;
  maxAmount: bigint;
  disabled?: boolean;
  layer?: Layer;
  label?: string;
  sublabel?: string;
  assetOptions?: DropdownOption<number>[];
  message?: string;
  balance?: string;
  allowAssetSelection?: boolean;
  allowWalletSelection?: boolean;
  onChangeValue: (value: StrOrMax) => void;
  onChangeAsset: (option: number) => void;
}

function getStatus(message?: string, amount?: string) {
  if (message) {
    return FieldStatus.Error;
  }
  if (amount) {
    return FieldStatus.Success;
  }
}

function getPendingFundsMessage(message?: string, value?: string, pendingFunds?: number, symbol?: string) {
  if (message) {
    return message;
  }

  const valueNumber = Number(value);
  if (pendingFunds && valueNumber > 0) {
    const usingOverPendingFunds = valueNumber > pendingFunds;
    const usedPendingFundsAmount = usingOverPendingFunds ? pendingFunds : valueNumber;
    return usingOverPendingFunds
      ? `Your balance includes ${usedPendingFundsAmount} ${symbol} already sent to the contract. This transaction will unblock your funds previously sent to the contract first.`
      : `Your balance includes ${usedPendingFundsAmount} ${symbol} already sent to the contract. This transaction will use funds previously sent to the contract.`;
  }
}

export function AmountInput(props: AmountInputProps) {
  const { asset, assetOptions, value, onChangeValue, onChangeAsset, maxAmount, disabled } = props;
  const { walletInteractionToastsObs } = useContext(TopLevelContext);
  const walletInteractionIsOngoing = useWalletInteractionIsOngoing();
  const l1PendingBalance = usePendingBalances()[asset.id];

  const handleChangeValue = (value: string) => onChangeValue(value.match(/^\d*\.?\d*/)?.[0] ?? '');
  const handleMaxButton = () => onChangeValue(MAX_MODE);

  const handleOpenWalletSelector = () => {
    walletInteractionToastsObs.addOrReplaceToast(getWalletSelectorToast(toggleWalletSwitcher));
  };

  const toggleWalletSwitcher = () => {
    walletInteractionToastsObs.removeToastByKey(Toasts.WALLET_SELECTOR);
  };

  const maxEnabled = value === MAX_MODE;
  const amountStr = maxEnabled ? formatMaxAmount(maxAmount, asset) : value;
  const status = getStatus(props.message, amountStr);

  const pendingAmount = new Amount(l1PendingBalance, asset);
  const pendingAmountNumber = pendingAmount.toFloat();
  const message = getPendingFundsMessage(props.message, amountStr, pendingAmountNumber, asset.symbol);

  return (
    <Field
      label={props.label || 'Amount'}
      sublabel={props.sublabel}
      disabled={disabled || walletInteractionIsOngoing}
      placeholder={'Enter amount'}
      layer={props.layer}
      allowAssetSelection={assetOptions && assetOptions.length > 1 && props.allowAssetSelection}
      selectedAsset={{ id: asset.id, symbol: asset.symbol }}
      assetOptions={assetOptions}
      value={amountStr}
      isActionSelected={maxEnabled}
      onChangeWalletRequest={!props.disabled && props.allowWalletSelection ? handleOpenWalletSelector : undefined}
      onClickBalanceIndicator={handleMaxButton}
      onChangeAsset={onChangeAsset}
      onChangeValue={handleChangeValue}
      balance={props.balance}
      message={message}
      status={status}
    />
  );
}
