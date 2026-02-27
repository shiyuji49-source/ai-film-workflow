// 积分包产品定义
// 价格单位：分（人民币）
export const CREDIT_PACKAGES = [
  {
    id: "credits_1000",
    name: "入门包",
    credits: 1000,
    amountFen: 990,       // ¥9.90
    amountDisplay: "¥9.9",
    description: "适合轻度使用",
    popular: false,
  },
  {
    id: "credits_5000",
    name: "标准包",
    credits: 5000,
    amountFen: 3900,      // ¥39.00
    amountDisplay: "¥39",
    description: "最受欢迎，节省 21%",
    popular: true,
  },
  {
    id: "credits_20000",
    name: "专业包",
    credits: 20000,
    amountFen: 12900,     // ¥129.00
    amountDisplay: "¥129",
    description: "重度用户首选，节省 35%",
    popular: false,
  },
] as const;

export type CreditPackageId = typeof CREDIT_PACKAGES[number]["id"];
