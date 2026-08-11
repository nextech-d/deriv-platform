export interface MomoProvider {
  id: string;
  country: "UG" | "TZ";
  name: string;
  network: string;
  depositSteps: string[];
  withdrawSteps: string[];
  ussd?: string;
  note?: string;
}

export const MOMO_PROVIDERS: MomoProvider[] = [
  {
    id: "ug-mtn-momo",
    country: "UG",
    name: "MTN Mobile Money Uganda",
    network: "MTN MoMo",
    ussd: "*165#",
    depositSteps: [
      "Open Deriv Cashier and select MTN Mobile Money if available.",
      "Enter the UGX amount and confirm on your phone.",
      "Approve the MTN prompt — funds credit to your Deriv USD wallet after FX conversion.",
      "If Cashier unavailable, use Deriv P2P with a verified MTN seller.",
    ],
    withdrawSteps: [
      "Withdraw via Deriv Cashier → MTN MoMo to your registered number.",
      "Ensure your Deriv account name matches your MoMo registration.",
      "Typical settlement: minutes to 24 h depending on agent volume.",
    ],
    note: "UGX/USD conversion spread applies — check Cashier rate before confirming.",
  },
  {
    id: "ug-airtel-money",
    country: "UG",
    name: "Airtel Money Uganda",
    network: "Airtel Money",
    ussd: "*185#",
    depositSteps: [
      "Use Deriv P2P or a verified payment agent supporting Airtel Money.",
      "Never send funds to unverified numbers from Telegram groups.",
      "Confirm escrow protection when using P2P.",
    ],
    withdrawSteps: [
      "Withdraw through Cashier if Airtel is listed for your account.",
      "Otherwise use P2P sell order to a buyer with Airtel Money.",
    ],
  },
  {
    id: "tz-vodacom-mpesa",
    country: "TZ",
    name: "M-Pesa Vodacom Tanzania",
    network: "M-Pesa",
    ussd: "*150*00#",
    depositSteps: [
      "Open Deriv Cashier — select M-Pesa Vodacom when available.",
      "Confirm TZS amount; approve the STK push on your handset.",
      "Keep the transaction ID until balance reflects in Cashier.",
    ],
    withdrawSteps: [
      "Cashier withdrawal to Vodacom M-Pesa on your registered line.",
      "Verify daily MoMo limits with your provider before large withdrawals.",
    ],
    note: "TZS conversion handled by Deriv — local display in Settings uses live FX.",
  },
  {
    id: "tz-tigo-pesa",
    country: "TZ",
    name: "Tigo Pesa / Mix by Yas",
    network: "Tigo Pesa",
    depositSteps: [
      "Check Cashier for Tigo/Mix support on your account type.",
      "Use payment agent directory for Tigo if Cashier path unavailable.",
      "Agents must be verified on Deriv.com — avoid informal brokers.",
    ],
    withdrawSteps: [
      "Prefer official Cashier withdrawal when supported.",
      "Payment agent withdrawals require manual verification of agent credentials.",
    ],
  },
  {
    id: "tz-halotel",
    country: "TZ",
    name: "Halotel Money",
    network: "Halotel",
    depositSteps: [
      "Halotel support varies — start with Deriv P2P filtered by Tanzania.",
      "Use small test deposit before larger transfers.",
    ],
    withdrawSteps: [
      "Withdraw via P2P or verified agent with Halotel capability.",
    ],
  },
];

export function getMomoProviders(country: "UG" | "TZ"): MomoProvider[] {
  return MOMO_PROVIDERS.filter((p) => p.country === country);
}
