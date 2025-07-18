# 未來開發待辦事項

## Plaid 整合進階功能

### 安全性增強
- [ ] **敏感資料加密**: 實作 Plaid access tokens 和其他敏感資料的加密存儲
- [ ] **資料保留政策**: 建立用戶資料的保留和刪除政策，符合隱私法規
- [ ] **存取控制**: 實作更細粒度的資料存取控制機制

### 交易分類改進
- [ ] **自訂分類邏輯**: 除了使用 Plaid 提供的分類外，實作基於用戶行為的自訂分類
- [ ] **機器學習分類**: 使用 ML 模型改進交易分類的準確性
- [ ] **分類規則引擎**: 允許用戶自定義分類規則

### 即時功能
- [ ] **Plaid Webhooks**: 實作 webhook 接收即時交易更新
- [ ] **即時通知**: 基於 webhook 的即時交易通知系統
- [ ] **增量同步**: 優化交易同步，只同步新增或更改的交易

### 錯誤處理和可靠性
- [ ] **重試機制**: 實作指數退避的重試策略
- [ ] **失敗交易排隊**: 建立失敗交易的排隊和重試系統
- [ ] **健康檢查**: 實作 Plaid API 服務健康檢查
- [ ] **降級策略**: 當 Plaid API 不可用時的備用方案

### 效能優化
- [ ] **批量處理**: 優化交易匯入的批量處理
- [ ] **快取策略**: 實作適當的快取機制以減少 API 調用
- [ ] **資料庫優化**: 優化大量交易資料的查詢效能

### 用戶體驗改進
- [ ] **連結狀態管理**: 更好的帳戶連結狀態追蹤和用戶反饋
- [ ] **錯誤恢復**: 提供用戶友好的錯誤恢復選項
- [ ] **連結更新**: 處理過期的帳戶連結和重新授權流程

## Kaggle 數據集整合

### 數據導入和處理
- [ ] **Kaggle 數據集下載**: 設定自動下載 Kaggle Credit Card Transactions Dataset
- [ ] **數據清理和預處理**: 實作數據清理、格式化和驗證邏輯
- [ ] **數據導入腳本**: 建立自動化腳本將 Kaggle 數據導入到 PostgreSQL 資料庫
- [ ] **數據同步機制**: 實作定期更新和同步 Kaggle 數據集的機制
- [ ] **數據品質檢查**: 建立數據完整性和品質驗證流程

### ML 模型訓練基礎設施
- [ ] **訓練數據準備**: 將 Kaggle 數據轉換為適合 ML 模型訓練的格式
- [ ] **特徵工程**: 實作特徵提取和工程化邏輯
- [ ] **數據分割**: 建立訓練/驗證/測試數據集分割機制
- [ ] **數據增強**: 實作合成數據生成以增強訓練數據集
- [ ] **標籤生成**: 基於 Kaggle 數據生成訓練標籤

### RecEngine ML 服務實作
- [ ] **Trigger Classifier 訓練**: 實作二元分類模型訓練邏輯
- [ ] **Reward Estimator 訓練**: 實作回歸模型訓練邏輯
- [ ] **Personalized Ranker 訓練**: 實作排序模型訓練邏輯
- [ ] **Optimizer/Action Selector 訓練**: 實作組合優化模型訓練邏輯
- [ ] **模型評估和驗證**: 建立模型性能評估和驗證框架

### 模型部署和推論
- [ ] **模型序列化**: 實作模型保存和載入機制
- [ ] **推論服務**: 建立模型推論 API 服務
- [ ] **模型版本管理**: 實作模型版本控制和 A/B 測試
- [ ] **模型監控**: 建立模型性能監控和漂移檢測
- [ ] **模型更新**: 實作模型重新訓練和更新機制

### 數據管線和工作流
- [ ] **ETL 管線**: 建立 Extract-Transform-Load 數據管線
- [ ] **批量處理**: 實作大規模數據批量處理邏輯
- [ ] **排程系統**: 建立定期數據更新和模型重新訓練排程
- [ ] **監控和警報**: 實作數據管線監控和異常警報系統
- [ ] **數據備份**: 建立數據備份和恢復機制

### 整合測試和驗證
- [ ] **端到端測試**: 建立完整的數據流程測試
- [ ] **模型準確性驗證**: 驗證模型預測結果與實際效果的一致性
- [ ] **性能基準測試**: 建立模型推論性能基準測試
- [ ] **負載測試**: 驗證系統在高負載下的表現
- [ ] **回歸測試**: 確保新模型不會降低現有功能的表現

### 可視化和分析工具
- [ ] **數據探索工具**: 建立 Kaggle 數據集的可視化探索工具
- [ ] **模型解釋性**: 實作模型決策的可解釋性分析
- [ ] **性能儀表板**: 建立模型性能監控儀表板
- [ ] **用戶行為分析**: 分析用戶與推薦系統的互動模式
- [ ] **商業指標追蹤**: 建立 ROI 和其他商業指標的追蹤系統

## RecEngine ML 系統詳細實作規格

### 📋 項目概述

RecEngine 是一個智能信用卡推薦 ML 系統，包含4個專門的機器學習模型，為用戶提供個人化的信用卡建議。系統使用 Kaggle 信用卡交易資料集進行訓練，並透過後端 API 整合到主應用程式中。

**技術棧選擇:**
- **ML Framework**: Python + scikit-learn + LightGBM + pandas + numpy
- **API Framework**: FastAPI (Python) 或 Express.js (Node.js + Python bridge)
- **資料處理**: pandas + numpy + scikit-learn preprocessing
- **模型部署**: Docker + REST API
- **監控**: MLflow 或 Weights & Biases
- **資料庫**: PostgreSQL (主要) + Redis (快取)

### 🎯 開發階段和里程碑

#### 階段 1: 基礎設施和資料準備 (週數: 2-3週)
#### 階段 2: 模型開發和訓練 (週數: 4-6週)  
#### 階段 3: API 整合和部署 (週數: 2-3週)
#### 階段 4: 測試和優化 (週數: 2-3週)

### 📊 階段 1: 基礎設施和資料準備

#### 1.1 環境設置
- [ ] **Python ML 環境設置**: 建立 Python 虛擬環境，安裝必要套件
  ```bash
  # 建立 requirements.txt
  pandas>=1.5.0
  numpy>=1.24.0
  scikit-learn>=1.3.0
  lightgbm>=4.0.0
  fastapi>=0.100.0
  uvicorn>=0.20.0
  pydantic>=2.0.0
  sqlalchemy>=2.0.0
  psycopg2-binary>=2.9.0
  redis>=4.5.0
  ```

- [ ] **目錄結構設計**: 建立 ML 項目的標準目錄結構
  ```
  /recengine/
  ├── data/
  │   ├── raw/           # 原始 Kaggle 資料
  │   ├── processed/     # 處理後的資料
  │   └── features/      # 特徵工程結果
  ├── models/
  │   ├── trigger_classifier/
  │   ├── reward_estimator/
  │   ├── optimizer/
  │   └── ranker/
  ├── src/
  │   ├── data_processing/
  │   ├── feature_engineering/
  │   ├── models/
  │   ├── evaluation/
  │   └── api/
  ├── notebooks/         # Jupyter notebooks 用於探索
  ├── tests/
  └── deployment/
  ```

- [ ] **Docker 容器化**: 建立 RecEngine 的 Docker 環境
  ```dockerfile
  FROM python:3.11-slim
  # 安裝系統依賴
  # 複製並安裝 Python 套件
  # 設定工作目錄和啟動腳本
  ```

#### 1.2 Kaggle 資料獲取和探索
- [ ] **Kaggle API 設置**: 配置 Kaggle API credentials，自動下載資料集
  ```python
  # 推薦資料集:
  # 1. Credit Card Transactions Dataset
  # 2. Credit Card Customers Dataset  
  # 3. Credit Card Fraud Detection Dataset
  ```

- [ ] **資料探索分析 (EDA)**: 使用 Jupyter notebook 進行資料探索
  - 資料維度和基本統計
  - 缺失值和異常值分析
  - 交易模式和分布分析
  - 用戶行為模式識別
  - 可視化分析 (matplotlib + seaborn)

- [ ] **資料品質評估**: 建立資料品質檢查流程
  ```python
  def assess_data_quality(df):
      # 檢查重複值
      # 檢查缺失值比例
      # 檢查數值範圍合理性
      # 檢查分類變數的分布
      # 生成資料品質報告
  ```

#### 1.3 資料清理和預處理
- [ ] **資料清理腳本**: 建立自動化的資料清理流程
  ```python
  def clean_transaction_data(raw_df):
      # 移除重複交易
      # 處理缺失值 (填充或刪除)
      # 標準化金額格式
      # 統一商戶名稱格式
      # 處理異常交易金額
      return cleaned_df
  ```

- [ ] **交易分類標準化**: 建立一致的交易分類系統
  ```python
  CATEGORY_MAPPING = {
      'groceries': ['grocery', 'supermarket', 'food store'],
      'dining': ['restaurant', 'cafe', 'food delivery'],
      'travel': ['airline', 'hotel', 'car rental'],
      'gas': ['gas station', 'fuel', 'petrol'],
      'shopping': ['retail', 'department store', 'online'],
      'utilities': ['electric', 'gas bill', 'water', 'internet'],
      'other': []  # 其他未分類
  }
  ```

- [ ] **時間特徵工程**: 提取時間相關特徵
  ```python
  def extract_time_features(df):
      df['hour'] = df['timestamp'].dt.hour
      df['day_of_week'] = df['timestamp'].dt.dayofweek
      df['month'] = df['timestamp'].dt.month
      df['is_weekend'] = df['day_of_week'].isin([5, 6])
      df['is_holiday'] = df['date'].isin(holidays)
      return df
  ```

### 🤖 階段 2: 模型開發和訓練

#### 2.1 Trigger Classifier (觸發分類器)

**目標**: 判斷某筆交易是否需要顯示「更好信用卡」建議

- [ ] **標籤生成邏輯**: 建立訓練標籤的規則
  ```python
  def generate_trigger_labels(transaction, user_cards, all_cards):
      """
      規則:
      1. 如果用其他卡片可以獲得 >= 2x 獎勵 -> 1 (觸發)
      2. 如果交易金額 >= $100 且可節省 >= $5 -> 1 (觸發)  
      3. 如果用戶沒有該類別的最佳卡片 -> 1 (觸發)
      4. 其他情況 -> 0 (不觸發)
      """
      pass
  ```

- [ ] **特徵工程**: 建立模型輸入特徵
  ```python
  TRIGGER_FEATURES = [
      # 交易特徵
      'transaction_amount',
      'category_encoded',
      'merchant_type',
      'time_features',
      
      # 用戶特徵  
      'user_monthly_spending_by_category',
      'user_avg_transaction_amount',
      'user_card_count',
      'user_spending_diversity',
      
      # 卡片組合特徵
      'current_card_reward_rate',
      'best_available_reward_rate', 
      'potential_reward_difference',
      'user_missing_categories'
  ]
  ```

- [ ] **模型訓練**: 使用多種算法進行實驗
  ```python
  # 候選模型:
  # 1. Logistic Regression (baseline)
  # 2. Random Forest
  # 3. LightGBM (推薦)
  # 4. XGBoost
  
  def train_trigger_classifier():
      # 資料分割 (70% train, 15% val, 15% test)
      # 處理類別不平衡 (SMOTE 或 class weights)
      # 交叉驗證
      # 超參數調優 (Optuna 或 GridSearchCV)
      # 模型評估 (Precision, Recall, F1, ROC-AUC)
  ```

- [ ] **模型評估**: 建立評估基準
  ```python
  EVALUATION_METRICS = {
      'accuracy': 0.85,      # 目標準確率
      'precision': 0.80,     # 精確率 (避免過多誤報)
      'recall': 0.75,        # 召回率 (捕捉重要機會)
      'f1_score': 0.77,      # F1 分數
      'roc_auc': 0.82        # ROC AUC
  }
  ```

#### 2.2 Reward Estimator (獎勵估算器)

**目標**: 預測使用不同信用卡的年度獎勵差異

- [ ] **獎勵計算邏輯**: 建立精確的獎勵計算引擎
  ```python
  def calculate_annual_rewards(user_spending, card):
      """
      計算用戶使用特定卡片的年度獎勵:
      1. 按類別計算獎勵 (考慮上限)
      2. 扣除年費
      3. 考慮特殊優惠和促銷
      4. 計算淨收益
      """
      total_rewards = 0
      for category, amount in user_spending.items():
          rate = card.get_reward_rate(category)
          cap = card.get_category_cap(category)
          reward = min(amount * rate, cap) if cap else amount * rate
          total_rewards += reward
      
      net_benefit = total_rewards - card.annual_fee
      return net_benefit
  ```

- [ ] **特徵工程**: 建立回歸模型特徵
  ```python
  REWARD_FEATURES = [
      # 用戶支出模式
      'annual_spending_by_category',  # 各類別年度支出
      'spending_concentration',       # 支出集中度
      'spending_seasonality',         # 季節性模式
      
      # 卡片特徵
      'card_reward_rates',           # 各類別獎勵率
      'card_annual_fee',             # 年費
      'card_caps_and_limits',        # 獎勵上限
      'card_bonus_categories',       # 特殊獎勵類別
      
      # 組合特徵
      'current_vs_candidate_rates',  # 當前卡片 vs 候選卡片
      'fee_payback_period',          # 年費回本期
      'marginal_benefit_ratio'       # 邊際收益比
  ]
  ```

- [ ] **模型訓練**: 多模型比較
  ```python
  # 候選模型:
  # 1. Linear Regression (baseline) 
  # 2. Random Forest Regressor
  # 3. LightGBM Regressor (推薦)
  # 4. Neural Network (簡單前饋)
  
  def train_reward_estimator():
      # 生成合成訓練資料 (用戶支出 + 卡片組合)
      # 特徵標準化和選擇
      # 回歸模型訓練
      # 評估指標: RMSE, MAE, R²
  ```

#### 2.3 Optimizer/Action Selector (優化器)

**目標**: 為用戶推薦最佳的卡片組合策略

- [ ] **組合優化邏輯**: 建立卡片組合優化算法
  ```python
  def optimize_card_portfolio(user_profile, available_cards):
      """
      優化策略:
      1. ADD_NEW: 添加新卡片以填補獎勵缺口
      2. REPLACE_EXISTING: 用更好的卡片替換現有卡片
      3. UPGRADE_CURRENT: 升級現有卡片等級
      4. CONSOLIDATE: 簡化卡片組合
      """
      
      # 使用遺傳算法或動態規劃找最優組合
      # 考慮約束條件 (信用額度、年費總額、卡片數量)
      # 最大化總獎勵 - 總年費
  ```

- [ ] **排序模型訓練**: 學習推薦卡片的排序
  ```python
  # 使用 LightGBM Ranker 或 Learning-to-Rank
  def train_portfolio_optimizer():
      # 生成用戶-卡片對的訓練資料
      # 基於優化邏輯生成排序標籤
      # 訓練 ranking 模型
      # 評估: NDCG, MAP, MRR
  ```

#### 2.4 Personalized Ranker (個人化排序器)

**目標**: 為首頁推薦卡片進行個人化排序

- [ ] **協同過濾**: 建立用戶相似性計算
  ```python
  def compute_user_similarity(user_a, user_b):
      """
      計算用戶相似度:
      1. 支出模式相似度 (餘弦相似度)
      2. 人口統計相似度 (年齡、收入等)
      3. 卡片偏好相似度
      4. 地理位置相似度
      """
      pass
  
  def collaborative_filtering_recommendations(user_id, k=10):
      # 找到 k 個最相似用戶
      # 根據相似用戶的卡片偏好進行推薦
      # 結合內容特徵 (hybrid approach)
  ```

- [ ] **排序特徵**: 建立個人化排序特徵
  ```python
  RANKING_FEATURES = [
      # 個人化特徵
      'user_demographic_match',      # 用戶與目標群體匹配度
      'spending_pattern_alignment',  # 支出模式與卡片匹配度
      'similar_user_preferences',    # 相似用戶偏好
      
      # 卡片特徵
      'card_popularity_score',       # 卡片受歡迎程度
      'card_approval_probability',   # 批准概率
      'card_market_position',        # 市場定位
      
      # 時間特徵
      'seasonal_relevance',          # 季節性相關度
      'market_trends',               # 市場趨勢
      'promotional_timing'           # 促銷時機
  ]
  ```

- [ ] **多目標優化**: 平衡準確性和多樣性
  ```python
  def diversified_ranking(candidates, user_profile, diversity_weight=0.3):
      """
      目標函數:
      Score = (1-λ) × Relevance + λ × Diversity
      
      其中:
      - Relevance: 個人化相關度分數
      - Diversity: 推薦列表多樣性
      - λ: 多樣性權重
      """
      pass
  ```

### 🚀 階段 3: API 整合和部署

#### 3.1 RecEngine API 服務
- [ ] **FastAPI 服務**: 建立 ML 模型 API 服務
  ```python
  from fastapi import FastAPI
  from pydantic import BaseModel
  
  app = FastAPI(title="RecEngine ML Service")
  
  @app.post("/trigger-classify")
  async def classify_trigger(request: TriggerRequest):
      # 載入 Trigger Classifier 模型
      # 特徵預處理
      # 模型預測
      # 返回結果
  
  @app.post("/estimate-rewards") 
  async def estimate_rewards(request: RewardRequest):
      # 載入 Reward Estimator 模型
      # 計算獎勵差異
      
  @app.post("/optimize-portfolio")
  async def optimize_portfolio(request: PortfolioRequest):
      # 載入 Optimizer 模型
      # 生成優化建議
      
  @app.post("/personalized-ranking")
  async def personalized_ranking(request: RankingRequest):
      # 載入 Ranker 模型
      # 個人化排序
  ```

- [ ] **模型載入和快取**: 優化模型載入性能
  ```python
  class ModelManager:
      def __init__(self):
          self.models = {}
          self.load_all_models()
      
      def load_model(self, model_name):
          # 從檔案載入模型
          # 快取在記憶體中
          # 實作模型版本管理
      
      def predict(self, model_name, features):
          # 取得快取的模型
          # 執行預測
          # 返回結果
  ```

#### 3.2 Node.js 後端整合
- [ ] **RecEngine 客戶端**: 建立 Node.js 到 Python API 的橋接
  ```typescript
  class RecEngineClient {
    private baseUrl: string;
    
    async classifyTrigger(data: TriggerData): Promise<TriggerResult> {
      // HTTP 請求到 Python API
      // 錯誤處理和重試邏輯
      // 結果快取
    }
    
    async estimateRewards(data: RewardData): Promise<RewardResult> {
      // 類似實作
    }
    
    // 其他方法...
  }
  ```

- [ ] **快取策略**: Redis 快取頻繁查詢結果
  ```typescript
  class RecEngineCache {
    async getCachedResult(key: string): Promise<any> {
      // 從 Redis 取得快取結果
    }
    
    async setCachedResult(key: string, result: any, ttl: number): Promise<void> {
      // 設定快取結果和過期時間
    }
  }
  ```

#### 3.3 Docker 部署
- [ ] **容器化部署**: Docker 多容器部署
  ```yaml
  # docker-compose.yml
  version: '3.8'
  services:
    recengine-ml:
      build: ./recengine
      ports:
        - "8000:8000"
      environment:
        - MODEL_PATH=/app/models
        - REDIS_URL=redis://redis:6379
      depends_on:
        - redis
        - postgres
    
    backend:
      build: ./backend
      environment:
        - RECENGINE_URL=http://recengine-ml:8000
      depends_on:
        - recengine-ml
  ```

### 📊 階段 4: 測試和優化

#### 4.1 模型評估和驗證
- [ ] **離線評估**: 建立完整的評估框架
  ```python
  def comprehensive_evaluation():
      # 各模型的準確性評估
      # 業務指標評估 (預期 CTR 提升)
      # 延遲性能測試
      # 記憶體使用評估
      # 生成評估報告
  ```

- [ ] **A/B 測試準備**: 建立線上 A/B 測試基礎設施
  ```python
  def ab_test_setup():
      # 模型版本管理
      # 流量分割邏輯
      # 指標收集系統
      # 統計顯著性測試
  ```

#### 4.2 性能優化
- [ ] **推論優化**: 提升模型推論速度
  ```python
  # 可能的優化策略:
  # 1. 特徵預計算和快取
  # 2. 模型量化 (如果使用深度學習)
  # 3. 批量預測
  # 4. 異步處理
  # 5. GPU 加速 (如果需要)
  ```

- [ ] **快取策略**: 智能快取常見查詢
  ```python
  def smart_caching_strategy():
      # 用戶偏好快取 (24小時)
      # 卡片獎勵計算快取 (1週)
      # 模型預測結果快取 (1小時)
      # 排序結果快取 (30分鐘)
  ```

#### 4.3 監控和維護
- [ ] **模型監控**: 建立模型性能監控
  ```python
  def model_monitoring():
      # 預測準確度追蹤
      # 資料漂移檢測 
      # 模型降級檢測
      # 異常預測警報
      # 自動模型重新訓練觸發
  ```

- [ ] **業務指標追蹤**: 追蹤 ML 對業務的影響
  ```python
  BUSINESS_METRICS = [
      'recommendation_click_through_rate',  # 推薦點擊率
      'card_application_conversion_rate',   # 申請轉換率
      'user_engagement_increase',           # 用戶參與度提升
      'revenue_per_recommendation',         # 每推薦收益
      'user_satisfaction_score'             # 用戶滿意度
  ]
  ```

### 🔧 技術實作細節

#### 資料管線架構
```python
# ETL 管線設計
class DataPipeline:
    def extract(self):
        # 從 Kaggle API 下載資料
        # 從 PostgreSQL 提取現有資料
        
    def transform(self):
        # 資料清理和標準化
        # 特徵工程
        # 資料驗證
        
    def load(self):
        # 載入到訓練資料庫
        # 更新特徵商店
        # 觸發模型重新訓練
```

#### 特徵商店設計
```python
class FeatureStore:
    def store_user_features(self, user_id, features):
        # 儲存用戶特徵到 Redis/PostgreSQL
        
    def get_user_features(self, user_id):
        # 從快取或資料庫獲取用戶特徵
        
    def batch_compute_features(self):
        # 批量計算和更新特徵
```

### 📈 成功指標和KPI

#### 技術指標
- **模型準確度**: Trigger Classifier F1 > 0.77
- **預測品質**: Reward Estimator RMSE < $50  
- **排序品質**: Ranker NDCG@10 > 0.8
- **API 延遲**: 95% 請求 < 200ms
- **系統可用性**: > 99.5% uptime

#### 業務指標  
- **用戶參與**: 推薦點擊率 > 15%
- **轉換效果**: 申請轉換率 > 5%
- **用戶滿意**: NPS > 7.0
- **收益影響**: 每用戶年度收益增加 > $100

### 🗓️ 開發時程規劃

#### 第1-3週: 環境設置和資料準備
- 週1: Python 環境、Docker、基礎設施
- 週2: Kaggle 資料獲取、EDA、資料清理
- 週3: 特徵工程、資料管線建立

#### 第4-9週: 模型開發
- 週4-5: Trigger Classifier 開發和調優
- 週6-7: Reward Estimator 開發和調優  
- 週8: Optimizer/Action Selector 開發
- 週9: Personalized Ranker 開發

#### 第10-12週: 整合和部署
- 週10: FastAPI 服務開發
- 週11: Node.js 後端整合
- 週12: Docker 部署和測試

#### 第13-15週: 測試和優化
- 週13: 全面測試和性能調優
- 週14: A/B 測試準備和上線
- 週15: 監控設置和文檔完善

---

## 其他系統改進

### 監控和日誌
- [ ] **詳細日誌**: 實作結構化日誌系統
- [ ] **性能監控**: 實作應用程式性能監控 (APM)
- [ ] **錯誤追蹤**: 集成錯誤追蹤服務 (如 Sentry)

### 部署和 DevOps
- [ ] **CI/CD 管道**: 建立自動化部署管道
- [ ] **容器化**: 完整的 Docker 容器化部署
- [ ] **負載均衡**: 實作負載均衡和水平擴展

### 測試覆蓋
- [ ] **E2E 測試**: 端到端測試覆蓋
- [ ] **負載測試**: 系統負載和壓力測試
- [ ] **安全測試**: 定期的安全漏洞掃描

### 文檔和維護
- [ ] **API 文檔**: 完整的 API 文檔 (OpenAPI/Swagger)
- [ ] **用戶手冊**: 用戶使用指南和故障排除
- [ ] **開發者文檔**: 開發者設定和貢獻指南

---

**注意**: 此文件記錄了當前實作中暫時跳過但未來可能需要的功能。請定期檢視並根據業務需求調整優先級。