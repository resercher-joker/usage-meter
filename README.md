# usage-meter

在 Claude Code 輸入框上方顯示用量表的 mod：

- **5 小時 / 7 天額度**：進度條、百分比與重置倒數（70% 轉黃、90% 轉紅）
- **上下文**：目前對話用掉的 token 與上限
- **本次估計花費**：本機估算，不是實際帳單
- 任一額度超過 90% 時跳出提醒

點「收合」可縮成一行，或輸入 `/usage-meter` 切換。額度數字來自 Claude 的回應，送出第一則訊息後才會出現；非訂閱方案只會看到上下文與花費。

## 安裝

在 Claude Code 終端機的提示列輸入：

```
/plugin install usage-meter --marketplace resercher-joker/usage-meter
```

詢問 `Add marketplace?` 時按 `y`，再選擇安裝範圍（建議 user）。

從 shell 安裝：

```
claude plugin install usage-meter --marketplace resercher-joker/usage-meter
```

在桌面 App（不支援 `/plugin` 時）：點提示框旁的 +，選 Plugins，Add marketplace 輸入 `resercher-joker/usage-meter`，再 Add plugin。
