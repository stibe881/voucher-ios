---
description: Build and deploy the iOS app to TestFlight
---

This workflow builds the iOS application using EAS Build and automatically submits it to TestFlight upon success.

1.  **Check Status**
    Ensure all changes are committed and pushed to git.
    ```powershell
    git status
    ```

2.  **Trigger Build & Submit**
    Run the EAS build command with the production profile and auto-submit flag.
    // turbo
    ```powershell
    npx eas-cli build --platform ios --profile production --auto-submit --non-interactive
    ```

3.  **Monitor**
    Follow the link provided in the console output to monitor the build progress on the Expo dashboard.
