<div align="center">
  <img src="https://ui-avatars.com/api/?name=NutriGenie&background=4f46e5&color=fff&size=100&rounded=true" alt="NutriGenie Logo">
  <h1>NutriGenie by IOM Bioworks</h1>
  <p><b>An AI-Powered, Serverless Personalized Meal Plan Generator</b></p>
</div>

<br/>

NutriGenie is a cloud-native, intelligent application designed to generate dynamic, hyper-personalized Indian meal plans. By leveraging cutting-edge Artificial Intelligence (Amazon Bedrock) alongside clinical microbiome data, it prescribes detailed 7-day meal plans based on a patient's unique biological report, allergies, gut health metrics, and caloric targets.

---

## ✨ Key Features

- 🧬 **Microbiome-Aware AI:** Automatically parses IOM patient reports (Allergies, IBS Subtypes, specific bacterial targets) to generate 100% compliant and targeted weekly meal plans.
- 🥘 **Exact IFCT Nutritional Accuracy:** Uses the official Indian Food Composition Tables (IFCT) dataset. AI-generated meal macro-nutrients are strictly recalculated mathematically based on exact ingredient quantities, overriding any AI hallucinations.
- 🍛 **Smart Accompaniment Logic:** Automatically pairs dry carbohydrates (like Dosa, Roti, and Paratha) with culturally appropriate wet accompaniments (like Sambar, Chutney, or Dal).
- 🔄 **Intelligent "Swap Meal" Engine:** Users can reject a prescribed meal to instantly regenerate a nutritionally-equivalent alternative with entirely different ingredients.
- 💾 **Persistent Recipe Library:** Every unique AI-generated meal is automatically extracted and saved to a DynamoDB custom recipe database to organically build a personalized recipe library over time.
- ⚡ **Serverless Auto-Scaling:** 100% hosted on AWS Serverless architecture, ensuring zero idle server costs ($0/month) while remaining capable of auto-scaling to thousands of concurrent users instantly.
- 🔒 **Data Sovereignty:** All HIPAA-compliant data routing and AI generations occur strictly within your proprietary AWS environment.

---

## 🛠️ Technology Stack

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | Vanilla HTML, CSS, JavaScript | Lightning-fast static UI |
| **API Layer** | Amazon API Gateway | Secure routing and internet access point |
| **Compute** | AWS Lambda (Python 3.12) | Core backend application logic (Zero servers) |
| **Database** | Amazon S3 & DynamoDB | NoSQL storage for patient records, meal plan history, and generated custom recipes |
| **Artificial Intelligence** | Amazon Bedrock (Nova Micro & Claude 3 Haiku) | RAG architecture for context retrieval and core LLM generation |

---

## 🚀 How to Run the Code

This project utilizes the **AWS Serverless Application Model (SAM)**. There is no traditional local backend server to spin up; the infrastructure must be deployed to an AWS account.

### Prerequisites
1. An AWS Account with Administrator access.
2. [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) installed and configured with your credentials (`aws configure`).
3. [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) installed.

### 1. Build and Deploy the Backend
Open your terminal in the project root folder and run:

```bash
# Build the application
sam build --region us-east-1

# Deploy to AWS (follow the interactive prompts)
sam deploy --guided
```
*This command automatically provisions all necessary Lambda functions, API Gateways, DynamoDB tables, and S3 buckets.*

### 2. Configure the Frontend
1. Once the SAM deployment completes, it will output an `ApiUrl` in your terminal (e.g., `https://xxxx.execute-api.us-east-1.amazonaws.com/prod`).
2. Open `frontend/app.js` and replace the `API_URL` variable with this newly generated URL.

### 3. Run the Frontend Locally
Since the frontend uses pure HTML/JS/CSS, you can test it locally by running a simple HTTP server:
```bash
cd frontend
python3 -m http.server 8000
```
Then visit `http://localhost:8000` in your browser.

*(Alternatively, you can upload the `frontend/` directory to the S3 bucket created by SAM to host it publicly).*

### 4. Patient Data Setup
To generate a meal plan, the system needs patient data. Upload a patient's JSON report (such as `IOM_KIT001.json` from the `patients/` folder) into the newly created `nutrigenie-data-*` S3 bucket under the `patients/` prefix via the AWS Console.

You can then enter the kit ID (`IOM_KIT001`) into the frontend UI to generate their meal plan.

---

## 📂 Repository Structure

```text
nutrigenie/
│
├── frontend/                  # Static website files (HTML, CSS, JS)
│   ├── index.html             # Main user interface
│   ├── app.js                 # API integrations and logic
│   └── styles.css             # Fluid, modern styling
│
├── backend/                   # AWS Lambda Backend Code
│   ├── lambdas/
│   │   ├── generate_meal/     # LLM logic for Weekly Plan Creation
│   │   ├── generate_meal_plan/# Claude 3 logic for Plan Creation
│   │   ├── swap_meal/         # LLM logic for specific Meal Swapping
│   │   └── save_recipe/       # API logic for manual recipe saving
│   │
│   ├── utils/                 # Shared utilities, nutrition calculation, validation
│   └── layers/                # Lambda execution layers (e.g., numpy)
│
├── patients/                  # Example JSON IOM Patient Reports
├── template.yaml              # AWS SAM Infrastructure as Code (IaC) Blueprint
├── ARCHITECTURE.md            # In-depth infrastructure mapping
├── HANDOVER.md                # Deployment and ownership transfer guide
└── README.md                  # This file
```

---
<div align="center">
  <i>Built exclusively on the Amazon Web Services (AWS) Cloud.</i>
</div>
