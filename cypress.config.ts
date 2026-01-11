import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 30000,
    video: true,
    screenshotOnRunFailure: true,
    chromeWebSecurity: false,
    experimentalModifyObstructiveThirdPartyCode: true,
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    env: {
      // Test user credentials - REPLACE WITH REAL TEST ACCOUNTS
      TEST_USER_FREE_EMAIL: "qa-free@test.com",
      TEST_USER_FREE_PASSWORD: "TestPassword123!",
      TEST_USER_STARTER_EMAIL: "qa-starter@test.com",
      TEST_USER_STARTER_PASSWORD: "TestPassword123!",
      TEST_USER_CREATOR_EMAIL: "qa-creator@test.com",
      TEST_USER_CREATOR_PASSWORD: "TestPassword123!",
      TEST_ADMIN_EMAIL: "admin@test.com",
      TEST_ADMIN_PASSWORD: "AdminPassword123!",
      // Stripe test card
      STRIPE_TEST_CARD: "4242424242424242",
      // Coupon codes for testing
      DISCOUNT_COUPON_10: "QA_TEST_10",
      DISCOUNT_COUPON_50: "QA_TEST_50",
    },
  },
  component: {
    devServer: {
      framework: "react",
      bundler: "vite",
    },
  },
});
