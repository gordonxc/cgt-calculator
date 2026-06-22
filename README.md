# Capital Gains Tax 計算機

幫英國投資者計算最多可以賣幾多股而唔超過 CGT（Capital Gains Tax）免稅額。

支援美股（USD）買賣，自動將盈利轉換成英鎊（GBP）對比免稅額。

## 功能

- **即時計算** — 輸入買入價、賣出價、匯率、免稅額，即時顯示最多可賣股數
- **即時匯率** — 自動從 [Frankfurter API](https://frankfurter.app)（歐洲央行數據）獲取最新 GBP/USD 匯率，亦可手動修改
- **詳細拆解** — 每股盈利（USD / GBP）、總賣出金額、總盈利、剩餘免稅額
- **智能提示** — 虧損狀態提示可隨意賣出；每股盈利超過免稅額時警告
- **流動裝置友善** — 響應式設計，手機直接用

## 快速開始

唔需要安裝任何嘢，直接用瀏覽器打開就得：

```bash
# Clone
git clone https://github.com/gordonxc/cgt-calculator.git
cd cgt-calculator

# 直接打開
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

或者撳 [這裡](https://htmlpreview.github.io/?https://github.com/gordonxc/cgt-calculator/blob/main/index.html) 線上預覽。

## 使用方法

| 欄位 | 說明 | 預設值 |
|------|------|--------|
| 買入價 | 每股買入價（USD） | $100 |
| 賣出價 | 每股賣出價（USD） | $120 |
| 匯率 | 1 GBP = ? USD（頁面載入時自動填入） | 自動 |
| 免稅限額 | CGT Annual Exempt Amount（GBP） | £3,000 |

### 計算邏輯

```
每股盈利（USD） = 賣出價 − 買入價
每股盈利（GBP） = 每股盈利（USD） ÷ 匯率
最多可賣股數   = ⌊免稅額 ÷ 每股盈利（GBP）⌋
```

### CGT 免稅額參考

| 稅年度 | Annual Exempt Amount |
|--------|---------------------|
| 2024/25 | £3,000 |
| 2025/26 | £3,000 |
| 2023/24 | £6,000 |
| 2022/23 | £12,300 |

> 免稅額可能每年調整，請以 [HMRC 官方公佈](https://www.gov.uk/capital-gains-tax/allowances) 為準。

## 專案結構

```
cgt-calculator/
├── index.html    # HTML 結構
├── style.css     # 樣式（暗色主題）
├── app.js        # 計算邏輯 + 匯率 API
└── README.md
```

無框架、無建置工具、無依賴——純原生 HTML / CSS / JavaScript。

## 匯率 API

使用 [Frankfurter](https://frankfurter.app) — 免費、開源、唔需要 API key。

- 數據來源：歐洲中央銀行（ECB）
- 更新頻率：每個工作日（約 16:00 CET）
- 週末及假日顯示最近一個工作日的匯率

## 免責聲明

⚠️ 本工具僅供參考，不構成任何稅務建議。實際 CGT 計算可能涉及：

- 已登記虧損抵扣（Loss relief）
- 多次買入的平均成本
- 不同稅率的計算（10% / 20%）
- 其他 HMRC 規則

請諮詢專業會計師或參考 [HMRC 官方指引](https://www.gov.uk/capital-gains-tax)。

## License

MIT
