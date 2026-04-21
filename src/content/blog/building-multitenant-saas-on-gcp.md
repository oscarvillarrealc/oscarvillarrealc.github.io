---
title: "Building a multi-tenant SaaS on GCP with Terraform"
description: "How I approached per-org isolation on Cloud Run and Cloud SQL — provisioning, routing, and the tradeoffs of the silo model."
pubDate: 2026-04-10
tags: ["GCP", "Terraform", "Django", "Architecture"]
---

When I started building Aindez, the first big architectural decision was: **how do you isolate tenants?**

There are three common models — pooled (shared DB, shared schema), siloed (one DB per tenant), and a hybrid. I went with full silo: each organization gets its own Cloud SQL instance and its own Cloud Run service.

## Why silo

The HR/ATS/CRM domain means sensitive employee data. Silo gives you:

- Hard data isolation — a bug in tenant A can't bleed data to tenant B
- Independent scaling — a large org doesn't starve a small one
- Cleaner disaster recovery — you can restore a single tenant without touching others

The tradeoff is cost and operational complexity. At small scale, you're paying for N idle Cloud SQL instances instead of one. It's a bet that the compliance and isolation benefits are worth it early.

## Provisioning with Terraform

Each tenant gets a Terraform workspace. The module creates:

- A Cloud SQL instance (Postgres 15, private IP)
- A Cloud Run service pointing at the shared container image
- IAM bindings for the service account
- A Cloud Build trigger to redeploy on image push

The tricky part was callbacks. Cloud Build is async — you kick off a build and it runs in the background. I needed the provisioning flow to wait for the first deploy to succeed before marking the org as ready. The solution was a webhook: Cloud Build posts to a FastAPI endpoint on completion, which updates the org status and triggers any post-provision setup.

## Routing requests to the right backend

The proxy layer (FastAPI on Railway) sits in front of all org backends. On each request it:

1. Reads the `X-Org-Slug` header (or extracts it from the subdomain)
2. Looks up the Cloud Run URL for that org in a small routing table
3. Forwards the request, stripping internal headers

This keeps the org discovery logic in one place. The backends themselves don't need to know they're in a multi-tenant system — they just serve one org.

## What I'd do differently

The Cloud SQL-per-org model gets expensive fast. For a new project I'd probably start with one Cloud SQL instance using schema-level isolation (one Postgres schema per tenant), then migrate to full silo for tenants that need it. This preserves the option without paying the fixed cost upfront.
