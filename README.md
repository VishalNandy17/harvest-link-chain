# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/a4883aad-770d-4622-9c42-c65be932fe24

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/a4883aad-770d-4622-9c42-c65be932fe24) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```


---

## Minimal Production Stack

- **Contracts**: Deploy to Polygon or any EVM-compatible chain
- **API**: Host on a $4 VPS (Hetzner, DigitalOcean, etc.) using PM2 or Docker Compose (MongoDB + API)
- **Web**: Deploy to Vercel or Netlify

## Lightweight Hosting

- Use Railway, Fly.io, or Render for API
- Use MongoDB Atlas free tier for database

## Security Note

- **Do not keep PRIVATE_KEY in the repo.** Use a cloud secret manager (e.g., AWS Secrets Manager, GCP Secret Manager, Vercel/Netlify env vars)

## Example: Local Development with Docker Compose

Create a `docker-compose.yml` in the project root:

```yaml
version: '3.8'
services:
	mongo:
		image: mongo:6
		ports:
			- "27017:27017"
		volumes:
			- mongo-data:/data/db
	api:
		build: ./services/api
		environment:
			- MONGO_URI=mongodb://mongo:27017/hlc
			- RPC_URL=<your_rpc_url>
			- CONTRACT_ADDRESS=<your_contract_address>
			- PRIVATE_KEY=<your_private_key>
			- JWT_SECRET=<your_jwt_secret>
			- API_BASE_URL=http://localhost:4000
		ports:
			- "4000:4000"
		depends_on:
			- mongo
volumes:
	mongo-data:
```

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/a4883aad-770d-4622-9c42-c65be932fe24) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
