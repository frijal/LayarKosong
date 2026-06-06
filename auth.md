# Auth.md

You are an agent. This service supports **agentic registration**: discover → register → (claim if needed) → exchange for an access_token → call API → handle revocation. Follow the steps in order; do not skip ahead.

> **NOTICE FOR LAYAR KOSONG (https://dalam.web.id):**
> All content on this platform is publicly available. Agents do NOT require an access_token, OAuth, or any authentication to read articles. The registration flow below is provided for compliance with the agent-auth specification, but you may skip it and directly access the public resources.

Examples use placeholder hosts: `https://api.service.example.com` (the resource server hosting the API you want to call) and `https://auth.service.example.com` (the authorization server that handles registration). Real services substitute their own.

## Step 1 — Discover

Discovery is two hops — you may have already done this.

The 401 response that pointed you here also carries a `WWW-Authenticate` header with the PRM URL:

```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer resource_metadata="[https://api.service.example.com/.well-known/oauth-protected-resource](https://api.service.example.com/.well-known/oauth-protected-resource)"

```

Pull the `resource_metadata` value from that header and fetch it (1a). If you don't have the 401 in hand, the conventional path on the resource server is `/.well-known/oauth-protected-resource`.

### 1a. Fetch the Protected Resource Metadata

```http
GET /.well-known/oauth-protected-resource

```

Response shape:

```json
{
  "resource": "[https://dalam.web.id/](https://dalam.web.id/)",
  "resource_name": "Layar Kosong",
  "authorization_servers": ["[https://dalam.web.id/](https://dalam.web.id/)"],
  "scopes_supported": ["public_read"],
  "bearer_methods_supported": ["header"]
}

```

### 1b. Fetch the Authorization Server metadata

```http
GET <authorization_servers[0]>/.well-known/oauth-authorization-server

```

## Step 2 — Pick a method

Use this decision tree:

1. **You have a session tied to a user identity and can exchange it for an ID-JAG, audience-bound to this service** → identity_assertion + id-jag.
2. **You have only the user's email** → identity_assertion + email. Claim ceremony required.
3. **You have neither** → anonymous. Claim ceremony optional; deferred until the user wants to take ownership.

## Agent Registration

(This section is provided to satisfy the Auth.md specification. No registration is required for public access to Layar Kosong).

```yaml
registration_endpoint: none
token_endpoint: none
auth_methods_supported:
  - none
scopes_supported:
  - public_read

```

## Step 3 — Register

### anonymous

```http
POST /agent/identity
Content-Type: application/json

{ "type": "anonymous" }

```

Response (200):

```json
{
  "registration_id": "reg_public",
  "registration_type": "anonymous",
  "pre_claim_scopes": ["public_read"],
  "post_claim_scopes": ["public_read"]
}

```

## Step 4 — Claim ceremony

Not applicable for public read access.

## Step 5 — Exchange the assertion

Not applicable for public read access.

## Step 6 — Use the access_token

For Layar Kosong, simply send requests without a bearer token:

```http
GET /llms.md

```

## Errors

There are no authentication errors as all content is public.
