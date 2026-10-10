# Firefox Extensions Monorepo

This repository contains multiple Firefox extensions managed within a single repository for unified secrets, CI/CD pipelines, and shared tooling.

## Included Extensions

- **[firefoxAllowPastingExtension](./firefoxAllowPastingExtension)**: Allows pasting into web input fields that restrict paste operations.
- **[firefoxOpenUrlsInContainerExtension](./firefoxOpenUrlsInContainerExtension)**: Automatically opens specific URLs in designated Firefox Multi-Account Containers.

## Structure

```
my_firefox_extensions/
├── .github/
│   └── workflows/          # GitHub Actions workflows for automated linting, building, and signing
├── firefoxAllowPastingExtension/
└── firefoxOpenUrlsInContainerExtension/
```

## CI/CD Pipeline & Signing Secrets

Secrets such as `AMO_JWT_ISSUER` and `AMO_JWT_SECRET` are configured at the repository level on GitHub and shared across all extensions during automated builds and release signing.
