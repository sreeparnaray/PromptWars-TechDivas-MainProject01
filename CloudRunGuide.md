# Cloud Run Deployment Guide

This project is fully configured to be continuously deployed to **Google Cloud Run** directly from this GitHub repository. The application uses a unified architecture, serving the React frontend and FastAPI backend linearly from a single Docker container.

## Steps to Deploy

1. Ensure all your latest changes are pushed to your GitHub `main` branch.
2. Go to the [Google Cloud Console](https://console.cloud.google.com/).
3. Navigate to **Cloud Run** and click **Create Service** (or Create Job).
4. Select **Continuously deploy from a repository**.
5. Click **Set up with Cloud Build**.
6. Select your repository: `sreeparnaray/PromptWars-TechDivas-MainProject01`.
7. Agree to authenticate Google Cloud with your GitHub account if prompted.
8. Branch: `^main$`
9. Build Type: **Dockerfile** (the Dockerfile is located at the `/Dockerfile` root path of the repository).
10. Click **Save**.
11. Under **Environment Variables**, click *Add Variable*:
    - Name: `GEMINI_API_KEY`
    - Value: `(Your Gemini API Key)`
12. Allow **Unauthenticated Invocations** so the site is public.
13. Click **Create**.

Cloud Build will automatically build the React Vite application, bundle it into the static folder of the Python environment, and expose the FastAPI server handling your single-page app and endpoints.
