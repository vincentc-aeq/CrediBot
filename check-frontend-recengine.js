#!/usr/bin/env node

/**
 * Frontend RecEngine Integration Verification Script
 * Checks if frontend correctly uses RecEngine related features
 */

const fs = require("fs");
const path = require("path");

console.log("🔍 Checking Frontend RecEngine Integration Status\n");

// Check if frontend files contain RecEngine related code
const frontendDir = "/Users/vincent.cho/workspace/learn/CrediBot/frontend/src";
const filesToCheck = [
  "hooks/useRecEngine.ts",
  "components/RecEngine/HomepageCarousel.tsx",
  "components/RecEngine/TransactionRecommendation.tsx",
];

console.log("📁 Checking RecEngine Related Files:");
filesToCheck.forEach((file) => {
  const fullPath = path.join(frontendDir, file);
  const exists = fs.existsSync(fullPath);
  console.log(
    `  ${exists ? "✅" : "❌"} ${file} ${exists ? "exists" : "not found"}`
  );

  if (exists) {
    const content = fs.readFileSync(fullPath, "utf8");

    // Check if contains RecEngine API calls
    const hasApiCalls =
      content.includes("recengine") ||
      content.includes("RecEngine") ||
      content.includes("/recommendations/");

    console.log(
      `     ${
        hasApiCalls ? "✅" : "❌"
      } Contains RecEngine API calls: ${hasApiCalls}`
    );

    // Check specific features
    if (file.includes("useRecEngine")) {
      const features = [
        "useHomepageRecommendations",
        "analyzeTransaction",
        "usePortfolioOptimization",
      ];

      features.forEach((feature) => {
        const hasFeature = content.includes(feature);
        console.log(
          `     ${hasFeature ? "✅" : "❌"} ${feature}: ${hasFeature}`
        );
      });
    }
  }
});

console.log("\n🔗 Checking API Endpoint Configuration:");

// Check if backend routes have RecEngine related endpoints
const backendRoutesPath =
  "/Users/vincent.cho/workspace/learn/CrediBot/backend/src/routes/recommendations.ts";
if (fs.existsSync(backendRoutesPath)) {
  const content = fs.readFileSync(backendRoutesPath, "utf8");

  const endpoints = [
    "/homepage",
    "/transaction-analysis",
    "/optimization",
    "/estimate-rewards",
  ];

  endpoints.forEach((endpoint) => {
    const hasEndpoint = content.includes(endpoint);
    console.log(
      `  ${hasEndpoint ? "✅" : "❌"} ${endpoint} endpoint: ${hasEndpoint}`
    );
  });
} else {
  console.log("  ❌ recommendations.ts route file not found");
}

console.log("\n📦 Checking RecEngine Service Files:");

// Check RecEngine service files
const recEngineServicePath =
  "/Users/vincent.cho/workspace/learn/CrediBot/backend/src/services/recengine/RecEngineService.ts";
if (fs.existsSync(recEngineServicePath)) {
  console.log("  ✅ RecEngineService.ts exists");

  const content = fs.readFileSync(recEngineServicePath, "utf8");

  const methods = [
    "classifyTrigger",
    "getPersonalizedRanking",
    "estimateRewards",
    "optimizePortfolio",
  ];

  methods.forEach((method) => {
    const hasMethod = content.includes(method);
    console.log(
      `     ${hasMethod ? "✅" : "❌"} ${method} method: ${hasMethod}`
    );
  });
} else {
  console.log("  ❌ RecEngineService.ts not found");
}

console.log("\n🎨 How Frontend Uses RecEngine:");
console.log(`
📋 Usage Checklist:

1. **Homepage Recommendation Component** (HomepageCarousel.tsx)
   - Should use useHomepageRecommendations hook
   - Calls GET /api/recommendations/homepage
   - Displays personalized credit card recommendations

2. **Transaction Analysis Component** (TransactionRecommendation.tsx)  
   - Should use analyzeTransaction mutation
   - Calls POST /api/recommendations/transaction-analysis
   - Shows "better credit card" suggestion popup

3. **React Hook** (useRecEngine.ts)
   - Should encapsulate all RecEngine API calls
   - Provides React Query integration
   - Includes error handling and caching logic

📈 Verification Steps:

1. Start frontend: npm start (port 3000)
2. Start backend: npm run dev (port 3001) 
3. Start RecEngine: python src/api.py (port 8080)
4. Open browser: http://localhost:3000
5. Check Network tab for RecEngine API calls
6. Check Console for related errors

🔧 Quick Test:
   curl http://localhost:3001/api/recommendations/status
   curl http://localhost:8080/health
`);

console.log("\n🎯 Check Results Summary:");

// Check integration completion
let integrationScore = 0;
let totalChecks = 0;

// Basic checks
const basicChecks = [
  {
    name: "useRecEngine hook",
    path: path.join(frontendDir, "hooks/useRecEngine.ts"),
  },
  {
    name: "HomepageCarousel",
    path: path.join(frontendDir, "components/RecEngine/HomepageCarousel.tsx"),
  },
  {
    name: "RecEngineService",
    path: "/Users/vincent.cho/workspace/learn/CrediBot/backend/src/services/recengine/RecEngineService.ts",
  },
  {
    name: "Recommendations routes",
    path: "/Users/vincent.cho/workspace/learn/CrediBot/backend/src/routes/recommendations.ts",
  },
];

basicChecks.forEach((check) => {
  const exists = fs.existsSync(check.path);
  if (exists) integrationScore++;
  totalChecks++;
  console.log(`  ${exists ? "✅" : "❌"} ${check.name}`);
});

const completionRate = Math.round((integrationScore / totalChecks) * 100);
console.log(
  `\n📊 Integration Completion: ${integrationScore}/${totalChecks} (${completionRate}%)`
);

if (completionRate >= 75) {
  console.log("🎉 RecEngine integration status is good!");
} else if (completionRate >= 50) {
  console.log(
    "⚠️  RecEngine integration partially complete, needs further setup"
  );
} else {
  console.log("❌ RecEngine integration incomplete, needs to be set up again");
}

console.log("\n💡 Next Steps:");
if (completionRate < 100) {
  console.log("1. Ensure all RecEngine related files are created");
  console.log("2. Check if frontend components correctly import and use hooks");
  console.log("3. Verify backend API routes are set up correctly");
  console.log(
    "4. Test complete data flow from frontend to backend to RecEngine"
  );
}

console.log("5. Use browser developer tools to check network requests");
console.log("6. Check console logs to confirm no errors");
console.log(
  "7. Test various user scenarios (homepage access, transaction analysis, etc.)"
);
