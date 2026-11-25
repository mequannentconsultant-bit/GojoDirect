# EthioServe Rent - High-Level Design (HLD) Specification
**Document Version:** 1.0.0  
**Project:** EthioServe Rental & Landlord Platform  
**Developer & Author:** Mequannent Worku  
**Support Hotline:** 0919798913  
**Target Market:** Ethiopia (Addis Ababa, Adama, Hawassa, Bahir Dar, Dire Dawa)  
**Date:** October 2026  

---

## Table of Contents
1. [Executive Overview & Business Context](#1-executive-overview--business-context)
2. [Problem Statement & Value Proposition](#2-problem-statement--value-proposition)
3. [System Architecture (High-Level)](#3-system-architecture-high-level)
4. [User Personas & Role-Based Access Control (RBAC)](#4-user-personas--role-based-access-control-rbac)
5. [Core Functional Modules & Workflows](#5-core-functional-modules--workflows)
6. [Data Flow Architecture](#6-data-flow-architecture)
7. [Third-Party Integrations (Ethiopian Ecosystem)](#7-third-party-integrations-ethiopian-ecosystem)
8. [Non-Functional Requirements (Security, Scalability, Availability)](#8-non-functional-requirements-security-scalability-availability)
9. [Deployment & Infrastructure Topology](#9-deployment--infrastructure-topology)
10. [Strategic Roadmap & Monetization](#10-strategic-roadmap--monetization)

---

## 1. Executive Overview & Business Context

**EthioServe Rent** is Ethiopia's premier digital residential and commercial rental ecosystem designed to eliminate informal brokers (*delalas*), prevent advance-payment rental fraud, and directly connect verified Ethiopian property owners with prospective tenants.

The platform provides a centralized, transparent marketplace operating with **Ethiopian Birr (ETB)** pricing, mandatory landlord credential auditing (Kebele Resident ID, Fayda National ID, Ethiopian Passport, Driver's License), localized telecommunication & mobile money integrations (**Telebirr**, **CBE Birr**, **Chapa**), and bilingual accessibility (**English** and **አማርኛ / Amharic**).

---

## 2. Problem Statement & Value Proposition

### 2.1 The Traditional Rental Crisis in Ethiopia
In major metropolitan hubs such as Addis Ababa, Hawassa, and Adama:
- **Broker Exploitation:** Traditional middlemen (*delalas*) charge up to 100% of one month's rent as non-negotiable commission fees from both tenants and owners without providing contractual protection.
- **Advance Viewing Scams:** Scammers post pictures of luxury homes at unrealistically low prices and demand non-refundable viewing fees (e.g., 2,000–5,000 ETB via mobile money) before vanishing.
- **Outdated Vacancy Status:** Lack of synchronization causes tenants to waste hours calling brokers about units rented weeks earlier.
- **Fragmented Identity Verification:** Absence of a verified deed or landlord identity leads to sub-leasing fraud.

### 2.2 EthioServe Value Proposition
| Pillar | Traditional Broker Market | EthioServe Rent |
|---|---|---|
| **Broker Commission** | 50% - 100% of 1st Month Rent | **0% (Zero Middleman Fees)** |
| **Landlord Identity** | Unverified / Anonymous | **Government ID Verified Shield Badge** |
| **Viewing / Inspection Fee** | Upfront fee demanded | **100% Free Direct Inspections** |
| **Payments & Boosts** | Cash / Untracked Transfers | **Telebirr & CBE Birr Integrated** |
| **Direct Communication** | Filtered through middleman | **Instant Direct Chat & +251 Direct Call** |
| **Listing Authenticity** | High rate of duplicate/stolen pics | **Image Hash & Price Anomaly Detection** |

---

## 3. System Architecture (High-Level)

EthioServe Rent follows a modern **Decoupled 3-Tier Enterprise Architecture**:

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT TIER                                       |
|  +-----------------------------+               +-------------------------------+  |
|  |   Web Client (React 19 SPA) |               |  Mobile Client (Flutter App)  |  |
|  |   Vite + Tailwind CSS v4    |               |  iOS & Android Native Shell   |  |
|  +-----------------------------+               +-------------------------------+  |
+-----------------------------------------+-----------------------------------------+
                                          | HTTPS / REST / WSS
+-----------------------------------------v-----------------------------------------+
|                              EDGE & SECURITY GATEWAY                              |
|  - Cloudflare / Cloud CDN & DDoS Protection                                       |
|  - JWT Authentication & RBAC Policy Enforcement Gate                              |
|  - Ethiopian Mobile Number Normalizer (+251 / 09 / 07)                            |
|  - Rate Limiting & Input Sanitization                                             |
+-----------------------------------------+-----------------------------------------+
                                          |
+-----------------------------------------v-----------------------------------------+
|                                APPLICATION TIER                                   |
|  +--------------------------------+   +-----------------------------------------+ |
|  |  Identity & Access Service     |   |  Property Catalog & Search Service      | |
|  |  - Auth, OTP, RBAC, Profiles   |   |  - Multi-attribute filter, ETB pricing  | |
|  +--------------------------------+   +-----------------------------------------+ |
|  +--------------------------------+   +-----------------------------------------+ |
|  |  Direct Communication Service  |   |  Trust & Safety / Fraud Engine          | |
|  |  - Real-time chat & WebSocket  |   |  - Delala detection, duplicate hashing  | |
|  +--------------------------------+   +-----------------------------------------+ |
|  +--------------------------------+   +-----------------------------------------+ |
|  |  Payment & Boost Gateway       |   |  Admin Operations & Audit Subsystem     | |
|  |  - Telebirr & CBE Birr Webhooks|   |  - Document verification, de-listing    | |
|  +--------------------------------+   +-----------------------------------------+ |
+-----------------------------------------+-----------------------------------------+
                                          |
+-----------------------------------------v-----------------------------------------+
|                                PERSISTENCE TIER                                   |
|  +-----------------------------------+     +------------------------------------+ |
|  | PostgreSQL (ACID Relational Core) |     | Redis (Session Cache & In-Memory) | |
|  | - User, Property, Audit, Reviews  |     | - Fast search cache, message queue | |
|  +-----------------------------------+     +------------------------------------+ |
|  +------------------------------------------------------------------------------+ |
|  | Secure Object Storage (S3 / Cloud Storage for Encrypted ID documents & photos| |
|  +------------------------------------------------------------------------------+ |
+-----------------------------------------------------------------------------------+
```

---

## 4. User Personas & Role-Based Access Control (RBAC)

The platform strictly enforces **Authentication First** where users must sign in or register to access their respective operational domains.

```
                                [ Authentication Gate ]
                                           |
                   +-----------------------+-----------------------+
                   |                                               |
                   v                                               v
            [ Tenant Persona ]                            [ Landlord Persona ]
                   |                                               |
        - Search & Browse Listings                      - Post New Property (4 Steps)
        - Filter by Sub-City & ETB                      - Manage Portfolio Vacancy
        - Save Favorite Homes                           - Boost Listing (Telebirr/CBE)
        - Direct Chat with Landlords                    - Submit Kebele / National ID
        - Report Fraud / Broker Fees                    - Direct Reply to Tenant Chats
        - Submit Star Reviews & Ratings                            |
                   |                                               |
                   +-----------------------+-----------------------+
                                           |
                                           v
                                   [ Admin Persona ]
                                           |
                                - Operations Dashboard & KPIs
                                - Audit Landlord ID Verifications
                                - Triage Fraud Reports & De-list
                                - User Moderation & Suspensions
                                - ETB Monetization Telemetry
```

### Role Matrix
| Feature / Capability | Public Visitor | Tenant (House Seeker) | Landlord (Property Owner) | System Admin |
|---|---|---|---|---|
| **View Login / Sign-up** | Yes | Yes | Yes | Yes |
| **Search & Filter Properties** | Login Required | Yes | Yes | Yes |
| **View Full Specs & Photos** | Login Required | Yes | Yes | Yes |
| **Save Favorites** | No | Yes | Yes | Yes |
| **Direct Chat / Contact Landlord** | No | Yes | Yes | Yes |
| **Post New Property** | No | No (Switch to Landlord) | Yes | Yes |
| **Manage Portfolio & Vacancy** | No | No | Yes (Own units) | Yes (All units) |
| **Boost Tier (Telebirr/CBE)** | No | No | Yes | Yes |
| **Submit ID for Verified Shield**| No | No | Yes | Yes |
| **Audit ID Verifications** | No | No | No | **Full Access** |
| **Triage Fraud / Remove Listing**| No | No (Can Report) | No | **Full Access** |
| **User Account Moderation** | No | No | No | **Full Access** |

---

## 5. Core Functional Modules & Workflows

### 5.1 Authentication & Onboarding Module
- **Dual Credential Sign-in:** Users sign in with their registered Email or verified Ethiopian phone number (e.g., `0919798913`) and password.
- **Dedicated Role Registration:** Users select their explicit role (`Tenant` vs. `Landlord`) upon registration.
- **1-Click Quick Demo Sign-in:** Instant evaluation profiles for testing:
  - *Tenant:* Almaz Tadesse
  - *Verified Landlord:* Dawit Haile
  - *Unverified Landlord:* Solomon Bekele
  - *Administrator:* Abebe Bikila

### 5.2 Property Discovery & Search Module
- **Ethiopian Regional Hierarchy:** Multi-tier search covering Addis Ababa (Bole, Yeka, Kirkos, Arada, Nifas Silk, etc.), Hawassa, Bahir Dar, Adama, and Dire Dawa.
- **Ethiopian Utility Verification:** Filter listings by guaranteed infrastructure:
  - 3-Phase Automatic Standby Diesel Generator
  - Reserve Water Tank (5,000L – 20,000L) with electric booster pump
  - 24/7 Gated Security Guard
  - Underground Dedicated Parking & Modern Elevators
- **ETB Pricing Filter:** Clear bounds without hidden broker markups.

### 5.3 Landlord Identity Verification Subsystem
- Landlords submit a high-resolution scan of their government credential (Fayda National ID, Kebele Resident Card, Ethiopian Passport, or Driver's License).
- Applications enter the Admin Operations Queue.
- Upon approval, the landlord profile is granted the green **Verified Landlord Shield** badge, and all their listed properties receive the verified seal.

### 5.4 Anti-Broker (*Delala*) Fraud Engine
- **Heuristic 1 (Price Anomaly):** Properties posted at `< 35%` of the sub-city median rent are automatically flagged for review.
- **Heuristic 2 (Cross-Owner Image Re-use):** SHA-256 perceptual hash matching flags listings copying photos from other owners.
- **Heuristic 3 (Tenant Incident Reporting):** Tenants report brokers demanding viewing fees. Admins can permanently de-list the house with one click.

### 5.5 Monetization & Mobile Money Engine
- Landlords can promote listings for higher visibility:
  - **Basic (Free):** Standard search ranking.
  - **Premium (300 ETB/mo):** Blue highlight badge, 2x search impressions.
  - **Gold Boost (800 ETB/mo):** Top-of-homepage priority, gold crown badge, priority push.
- Integrated payment simulation supporting **Telebirr**, **CBE Birr**, and **Chapa**.

---

## 6. Data Flow Architecture

```
[ Tenant Action: Search Bole 3-Bed Apartment ]
                 |
                 v
      [ Filter & Ranking Engine ]
                 |
    +------------+------------+
    |                         |
    v                         v
[ Gold Boost Listings ]  [ Verified Landlords ]
    |                         |
    +------------+------------+
                 |
                 v
       [ Render Property Card ]
                 |
        (Tenant Clicks Details)
                 |
                 v
 [ Direct Chat / Inspection Request Sent ]
                 |
                 v
   [ Landlord Direct SMS / Inbox Notification ]
```

---

## 7. Third-Party Integrations (Ethiopian Ecosystem)

1. **Telebirr (Ethio Telecom):** Merchant payment gateway for instant USSD push checkout of premium/gold listing boosts.
2. **CBE Birr (Commercial Bank of Ethiopia):** Direct bank account and wallet payment integration.
3. **Chapa Financial Technologies:** Card processing and fintech aggregator.
4. **National ID / Fayda Integration (Planned Phase 2):** Direct API integration for instant biometric identity validation.
5. **Direct Support Hotline:** **`0919798913`** (Lead Developer: **Mequannent Worku**).

---

## 8. Non-Functional Requirements (NFRs)

- **Security & Privacy:** Passwords hashed with bcrypt; government ID scans encrypted at rest with AES-256; RBAC route guards on all API endpoints.
- **Zero Iframe Alerts:** Non-intrusive in-app animated toast banners replace all native browser alerts.
- **Performance & Latency:** Search and multi-criteria filters execute in `< 40ms` client-side; API response times `< 120ms`.
- **Localization:** 100% bilingual support (English and Amharic / አማርኛ) toggled with persistent client preference.
- **Mobile First & Responsive:** Strict viewport optimization for mobile (390x844) and desktop (1440x900).

---

## 9. Deployment & Infrastructure Topology

```
                  [ Internet Users / Mobile Clients ]
                                  |
                                  v
                    [ Cloudflare CDN & WAF ]
                                  |
            +---------------------+---------------------+
            |                                           |
            v                                           v
[ Vite / React Client Assets ]              [ Express / Node.js API Cluster ]
  (Static Cache Edge)                          (Dockerized Container)
                                                        |
                                            +-----------+-----------+
                                            |                       |
                                            v                       v
                                   [ PostgreSQL DB ]         [ Redis Cache ]
```

---

## 10. Strategic Roadmap & Monetization

- **Phase 1 (Completed):** Direct rentals, RBAC login gate, landlord verification queue, anti-delala fraud engine, direct chat, Telebirr/CBE payment simulation, bilingual UI.
- **Phase 2 (Q1 2027):** Interactive OpenStreetMap / Google Maps house search, 360° virtual tours, and automated Fayda ID verification.
- **Phase 3 (Q2 2027):** Digital rental contracts (ውል) with legal validity and monthly rent escrow via Telebirr.
- **Phase 4 (Q3 2027):** Commercial office leasing portal and short-term serviced vacation rentals across Ethiopia.

---

**EthioServe Rent**  
*Developed by Mequannent Worku*  
*Direct Support Hotline: 0919798913*  
*Addis Ababa, Ethiopia*
