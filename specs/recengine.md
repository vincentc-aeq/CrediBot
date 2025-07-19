# RecEngine • MVP Specification

Version 1.2 – 2025‑07‑19
Author : Product‑ML

> **Scope** Credit‑card recommendation engine MVP integrated with CrediBot backend.
> **Tech Stack** Python 3.11 · FastAPI · Feast · LightGBM · MLflow · Docker
> **Project Root** `./recengine`

---

## 0 – Glossary

| Term                   | Meaning                                                                |
| ---------------------- | ---------------------------------------------------------------------- |
| **Card Catalog**       | Static table of card attributes (annual fee, reward rates, etc.)       |
| **Txn Event**          | Single transaction message: `user_id, amount, category, card_used, ts` |
| **Trigger Classifier** | Binary classifier that decides whether to push a recommendation        |
| **Reward Estimator**   | Rule/Formula function computing best rate & extra reward               |
| **Action Selector**    | Business‑rule layer deciding _add_ vs _switch_ before ranking          |
| **Ranker**             | Learning‑to‑Rank model for ordering candidate cards                    |
| **Feature Store**      | Feast (offline Parquet + online Redis)                                 |
| **Model Registry**     | MLflow tracking/server                                                 |

---

## 1 – CrediBot Integration & Data Flow

### 1.1 Architecture Overview

```
┌─────────────────┐    HTTP/JSON    ┌─────────────────┐
│   CrediBot      │ ◄─────────────► │   RecEngine     │
│   Backend       │                 │   Service       │
│   (Port 3001)   │                 │   (Port 8080)   │
└─────────────────┘                 └─────────────────┘
         │                                   │
         ▼                                   ▼
┌─────────────────┐                 ┌─────────────────┐
│   PostgreSQL    │                 │   Redis +       │
│   Database      │                 │   MLflow +      │
│                 │                 │   Model Files   │
└─────────────────┘                 └─────────────────┘
```

### 1.2 Data Pipeline Integration

| Component     | Source                                  | Target                                | Sync Method     | Frequency                |
| ------------- | --------------------------------------- | ------------------------------------- | --------------- | ------------------------ |
| Card Catalog  | CrediBot `credit_cards` table           | RecEngine `data/card_catalog.parquet` | ETL Pipeline    | Daily                    |
| User Profiles | CrediBot `users` table                  | RecEngine Feast Store                 | Real-time API   | On-demand                |
| Transactions  | CrediBot `transactions` table via Plaid | RecEngine Feature Store               | Streaming/Batch | Real-time + Hourly batch |
| User Cards    | CrediBot `user_cards` table             | RecEngine User Context                | API call        | On-demand                |

### 1.3 API Integration Points

- **Transaction Analysis**: POST `/trigger-classify`
- **Homepage Ranking**: POST `/personalized-ranking`
- **Portfolio Analysis**: POST `/optimize-portfolio`
- **Reward Estimation**: POST `/estimate-rewards`
- **Health Check**: GET `/health`
- **Model Info**: GET `/models/info`

### 1.4 Authentication & Security

- **API Authentication**: Bearer token via `RECENGINE_API_KEY`
- **Rate Limiting**: 1000 requests/minute per service
- **Data Privacy**: No PII stored in RecEngine, only hashed user IDs
- **Encryption**: TLS 1.3 for all API communications

---

## 2 – Milestones & Task Map

| MS     | Title                | Key Deliverables                                                                    |
| ------ | -------------------- | ----------------------------------------------------------------------------------- |
| **M0** | Repo & Dev Env       | Folder scaffold, DevContainer, CI skeleton                                          |
| **M1** | Card Catalog         | `data/card_catalog.parquet` + loader                                                |
| **M2** | Users & Transactions | `users.csv`, `card_ownership.csv`, `transactions.csv` (real, Kaggle _or_ synthetic) |
| **M3** | Feature Store        | Feast repo & materialization script                                                 |
| **M4** | Label & Reward Layer | reward_calc, trigger labels, action selector                                        |
| **M5** | Model Training       | MLflow pipelines for Trigger & Ranker                                               |
| **M6** | Online Serving API   | FastAPI app with CrediBot-compatible endpoints                                      |
| **M7** | CI/CD & Tests        | pytest, Dockerfile, GitHub Actions workflow                                         |

\*All directory references below are **relative to `./recengine/`\***

---

## 3 – Detailed Tasks

### M0 • Repo & Environment

| ID   | Description                                                         | Output      |
| ---- | ------------------------------------------------------------------- | ----------- |
| M0‑1 | Create structure (see Appendix A).                                  | folder tree |
| M0‑2 | Add `.devcontainer/devcontainer.json` (Python 3.11 + poetry/pip).   | json        |
| M0‑3 | CI skeleton `.github/workflows/ci.yml` running `pytest` + `flake8`. | yaml        |

### M1 • Card Catalog (★ Columns = required)

| ID   | Description                                                        | Check              |
| ---- | ------------------------------------------------------------------ | ------------------ |
| M1‑1 | `scripts/sync_cards.py` – sync from CrediBot `credit_cards` table. | CSV/Parquet exists |
| M1‑2 | Normalize ★ fields (Appendix B).                                   | schema passes test |
| M1‑3 | Save to `data/card_catalog.parquet` with `updated_at`.             | parquet            |

### M2 • Users & Transactions

| ID   | Description                                                                              | Check                             |
| ---- | ---------------------------------------------------------------------------------------- | --------------------------------- |
| M2‑1 | If _real_ `transactions.csv` present → skip generation. Else run `scripts/mock_data.py`. | ≥ 200 K rows                      |
| M2‑2 | If missing `user_id` → script assigns 5 000 synthetic users & card ownership.            | `users.csv`, `card_ownership.csv` |
| M2‑3 | Validate referential integrity (`card_used` ∈ ownership).                                | pytest green                      |

### M3 • Feature Store

| ID                                     | Description                                                  | Output                     |
| -------------------------------------- | ------------------------------------------------------------ | -------------------------- |
| M3‑1                                   | Feast entity `user_id` and batch sources (`data/*.parquet`). | `features/feature_repo.py` |
| M3‑2                                   | Feature views                                                |                            |
| • `user_stats_90d` (avg, std, count)   |                                                              |                            |
| • `category_stats_global` (avg_amount) | materializable                                               |                            |
| M3‑3                                   | `make materialize` → Redis online store.                     | CLI success                |

### M4 • Label Generation & Reward Layer

| ID    | Description                                                                                                                    | Output                                                          |
| ----- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- | ------------------------- |
| M4‑1  | **`utils/reward_calc.py`** – uses Card Catalog to compute:<br>`best_rate, reward_gap_pct, extra_reward_amt, num_better_cards`. | unit tests                                                      |
| M4‑2  | **`labeling/create_trigger_labels.py`** – create `trigger_label` with hyper‑param `gap_thr` (default 0.01).                    | labeled parquet                                                 |
| M4‑2b | **`src/utils/action_selector.py`** – function `select_actions(user_id, txn, reward_table)` returns JSON `{action:"add"         | "switch", card_id}`; uses `num_better_cards` & ownership rules. | python module & unit test |
| M4‑3  | Log label distribution to console.                                                                                             | stdout                                                          |

### M5 • Model Training

| ID   | Description                                                          | Metric          |
| ---- | -------------------------------------------------------------------- | --------------- |
| M5‑1 | `train_trigger.py` – LightGBM on **15‑feature list** (Appendix C).   | AUC ≥ 0.80      |
| M5‑2 | `train_ranker.py` – LightGBM Ranker (MAP\@5).                        | model in MLflow |
| M5‑3 | Optuna study jointly tunes: `gap_thr`, `learning_rate`, `max_depth`. | study saved     |

### M6 • Online Serving

| ID   | Description                                                                                                                          | Endpoint Spec |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| M6‑1 | FastAPI app `src/api.py`; load latest models from MLflow.                                                                            |               |
| M6‑2 | `/trigger-classify` POST → `{recommend_flag:bool, confidence_score:float, suggested_card_id:str, extra_reward:float, reasoning:str}` |               |
| M6‑3 | `/personalized-ranking` POST → list of ranked card offers                                                                            |               |
| M6‑4 | `/estimate-rewards` POST → reward estimation results                                                                                 |               |
| M6‑5 | `/optimize-portfolio` POST → portfolio optimization suggestions                                                                      |               |
| M6‑6 | `/health` GET → service health check                                                                                                 |               |
| M6‑7 | `/models/info` GET → model information                                                                                               |               |
| M6‑8 | In‑memory cooldown keyed by `user_id`.                                                                                               | ≤ 50 ms p99   |

### M7 • CI/CD & Tests

| ID   | Description                                                              | Output        |
| ---- | ------------------------------------------------------------------------ | ------------- |
| M7‑1 | pytest covering reward_calc, action_selector, feature lookup, API smoke. | ≥ 6 tests     |
| M7‑2 | Multi‑stage Dockerfile (< 500 MB image).                                 | docker run ok |
| M7‑3 | GitHub Actions: test → build → push ghcr.io image.                       | green badge   |

---

## 4 – Non‑Functional Requirements

| Aspect              | Requirement                                           |
| ------------------- | ----------------------------------------------------- |
| **Latency**         | API endpoints 99‑pct ≤ 50 ms (1 CPU, 1 GB RAM).       |
| **Explainability**  | `/trigger-classify?debug=true` returns SHAP features. |
| **Config**          | Hyper‑params & paths via `recengine/config.yaml`.     |
| **Reproducibility** | `make train` → same SHA logs same MLflow experiment.  |
| **Error Handling**  | Circuit breaker, 3 retries with exponential backoff   |
| **Fallback**        | Static rule-based recommendations when ML fails       |

---

## 5 – Appendix A • Recommended Tree

```
recengine/
├─ data/
├─ features/
├─ labeling/
├─ models/
├─ scripts/
├─ src/
│  ├─ api/
│  ├─ ml/
│  └─ utils/
├─ tests/
└─ README.md
```

---

## 6 – Appendix B • Card Catalog ★ Schema

| Column              | dtype    | Example                  |
| ------------------- | -------- | ------------------------ |
| card_id★            | string   | chase_sapphire_preferred |
| issuer★             | string   | Chase                    |
| network★            | string   | Visa                     |
| reward_type★        | string   | miles                    |
| base_rate_pct★      | float    | 1.0                      |
| bonus_categories★   | json     | {"dining":3,"travel":5}  |
| bonus_cap_amt★      | float    | 6000                     |
| annual_fee★         | float    | 95                       |
| signup_bonus_value★ | float    | 750                      |
| signup_req_spend★   | float    | 4000                     |
| foreign_tx_fee_pct★ | float    | 0                        |
| point_value_cent★   | float    | 2.0                      |
| credit_score_min★   | int      | 670                      |
| eligibility_region★ | string   | US                       |
| updated_at          | datetime | 2025‑07‑19               |

---

## 7 – Appendix C • 15 Core Features for Trigger Classifier

| Group      | Feature                                                                   |
| ---------- | ------------------------------------------------------------------------- |
| Txn        | amount_log                                                                |
| Time       | hour, day_of_week, is_weekend                                             |
| User Stats | user_avg_amount, user_transaction_count, amount_vs_user_avg, user_recency |
| Category   | is_high_value_category, amount_vs_category_avg                            |
| Reward Gap | reward_gap_pct, extra_reward_amt, num_better_cards                        |
| Cooldown   | time_since_last_transaction, recommendation_recency                       |

---

> **Implementation rule** – Each task above must emit its stated _Deliverable_.
> The agent should progress milestone‑by‑milestone and mark tasks complete in PR comments or by updating this spec.
