This repository contains everything required to deploy and operate a fully sovereign instance of the Marine Term Translations platform, including:

• Gitea – private Git forge with built-in authentication and CI/CD (Gitea Actions)  
• Node.js REST backend – all translation, review, and suggestion services  
• React/Vite frontend – public-facing editor and viewer  
• Self-hosted Gitea Actions runners  
• Automated generation and publication of LDES fragments  
• One-way push-mirror to the canonical public fragment repository  
• Optional w3id.org permanent identifier redirect service  
• PostgreSQL database, Redis cache, backup scripts, and TLS termination  

After deployment, the platform operates independently of any third-party provider:
- All user accounts and permissions are managed internally  
- All translation repositories and their history reside on infrastructure under your control  
- No external API rate limits or CORS restrictions  
- LDES fragments are published instantly to the public mirror on every approved merge  

Designed for deployment on a single virtual private server, cloud instance, or on-premises hardware via Docker Compose (provided) or Kubernetes Helm chart (planned).

Intended audience  
Research institutions, national maritime agencies, standards bodies, and consortiums wishing to operate their own instance of the multilingual marine terminology service with guaranteed availability, auditability, and data sovereignty.

License: AGPL-3.0 (same as Gitea) with additional contributor terms for translation content.

Deploy your own instance in minutes and take full ownership of the marine terminology translation ecosystem.
