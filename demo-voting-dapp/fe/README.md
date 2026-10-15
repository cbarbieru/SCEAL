# Online Voting - Frontend

## Intro
The frontend is a modern React-based web application built with Vite and Material UI (MUI). It provides a user-friendly dashboard for voters to participate in elections, view real-time statistics via ApexCharts, and manage their profiles. It communicates with the Node.js backend to perform secure voting operations using a commit-reveal scheme.

## Deploy
Building the image and deploying it on the Kubernetes test bed is described in the [root README](../../README.md#4-demo-voting-dapp). In the cluster the Vite preview server proxies `/api` to the backend service, configured through the `BACKEND_URL` environment variable (default `http://localhost:8080`).
