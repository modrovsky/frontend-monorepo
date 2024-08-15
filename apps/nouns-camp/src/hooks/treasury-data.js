import { useQuery } from "@tanstack/react-query";
import { object as objectUtils } from "@shades/common/utils";

export const getTotalEth = (data) => {
  const { balances, rates } = data;
  const rethToEth = (reth) => (reth * rates.rethEth) / 10n ** 18n;
  return [
    balances.executor.eth,
    balances.executor.weth,
    rethToEth(balances.executor.reth),
    balances.executor.steth,
    balances.executor.wsteth,
    balances["dao-proxy"].eth,
    balances["token-buyer"].eth,
  ]
    .filter(Boolean)
    .reduce((sum, amount) => sum + amount, BigInt(0));
};

export const getTotalUsdc = (data) =>
  [data.balances.executor.usdc, data.balances.payer.usdc]
    .filter(Boolean)
    .reduce((sum, amount) => sum + amount, BigInt(0));

const useTreasuryData = () => {
  const query = useQuery({
    queryKey: ["treasury"],
    queryFn: async () => {
      const res = await fetch("/api/treasury");
      const { balances, rates, aprs } = await res.json();
      return {
        balances: objectUtils.mapValues(
          (contract) => objectUtils.mapValues((n) => BigInt(n), contract),
          balances,
        ),
        rates: objectUtils.mapValues((v) => BigInt(v), rates),
        aprs,
      };
    },
  });

  if (query.data == null) return null;

  const { balances, rates } = query.data;

  const usdcToEth = (usdc) => (usdc * rates.usdcEth) / 10n ** 6n;
  const ethToUsdc = (eth) => (eth * 10n ** 6n) / rates.usdcEth;
  const rethToEth = (reth) => (reth * rates.rethEth) / 10n ** 18n;

  const ethTotal = [
    balances.executor.eth,
    balances.executor.weth,
    rethToEth(balances.executor.reth),
    balances.executor.steth,
    balances.executor.wsteth,
    balances["dao-proxy"].eth,
    balances["token-buyer"].eth,
  ]
    .filter(Boolean)
    .reduce((sum, amount) => sum + amount, BigInt(0));

  const usdcTotal = [balances.executor.usdc, balances.payer.usdc]
    .filter(Boolean)
    .reduce((sum, amount) => sum + amount, BigInt(0));

  return {
    ...query.data,
    totals: {
      eth: ethTotal,
      usdc: usdcTotal,
      allInEth: ethTotal + usdcToEth(usdcTotal),
      allInUsd: ethToUsdc(ethTotal) + usdcTotal,
    },
  };
};

export default useTreasuryData;
